const Product = require("../models/product");
const Order = require("../models/order");
const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");

const User = require("../models/user");

const stripe = require("stripe")(
  "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"
);

exports.getProducts = (req, res, next) => {
  Product.find()
    .then((products) => {
      console.log(products);
      res.render("shop/product-list", {
        prods: products,
        pageTitle: "All Products",
        path: "/products",
      });
    })
    .catch((err) => {
      console.log(err);
    });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  if (!mongoose.Types.ObjectId.isValid(prodId)) {
    return res.redirect("/");
  }
  Product.findById(prodId)
    .then((product) => {
      if (!product) {
        return res.redirect("/");
      }

      res.render("shop/product-detail", {
        product: product,
        pageTitle: product.title,
        path: "/products",
      });
    })
    .catch((err) => console.log(err));
};

exports.getIndex = (req, res, next) => {
  Product.find()
    .then((products) => {
      res.render("shop/index", {
        prods: products,
        pageTitle: "Shop",
        path: "/",
      });
    })
    .catch((err) => {
      console.log(err);
    });
};

function calculateTotalPrice(products) {
  return products.reduce((total, p) => total + p.product.price * p.quantity, 0);
}

function calculateTotalPrice(products) {
  return products.reduce((total, p) => total + p.product.price * p.quantity, 0);
}

function calculateCartTotalPrice(cartItems) {
  return calculateTotalPrice(
    cartItems.map((item) => ({
      product: item.productId,
      quantity: item.quantity,
    }))
  );
}

exports.getCart = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then((user) => {
      const cartItems = user.cart.items;

      res.locals.calculateTotalPrice = calculateTotalPrice;
      res.locals.calculateCartTotalPrice = calculateCartTotalPrice;

      console.log("Cart Items:", cartItems);

      res.render("shop/cart", {
        path: "/cart",
        pageTitle: "Your Cart",
        cartItems: cartItems,
      });
    })
    .catch((err) => console.log(err));
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then((product) => {
      return req.user.addToCart(product);
    })
    .then((result) => {
      console.log(result);
      res.redirect("/cart");
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  User.findById(req.user._id)
    .then((user) => {
      return user.removeFromCart(prodId);
    })
    .then((result) => {
      res.redirect("/cart");
    })
    .catch((err) => console.log(err));
};

exports.postCartUpdateQuantity = (req, res, next) => {
  const prodId = req.body.productId;
  const action = req.body.action;

  req.user
    .updateCartItemQuantity(prodId, action)
    .then(() => {
      res.redirect("/cart");
    })
    .catch((err) => {
      console.error("Error updating quantity:", err);
      res.redirect("/cart");
    });
};

exports.postOrder = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then((user) => {
      const products = user.cart.items.map((i) => {
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });

      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user,
        },
        products: products,
        createdAt: new Date(),
      });

      return order.save();
    })
    .then((result) => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect("/orders");
    })
    .catch((err) => console.log(err));
};

function calculateTotalPrice(products) {
  if (!products || !products.length) {
    return 0;
  }

  return products.reduce((total, p) => {
    const productPrice = p.product && p.product.price;
    const quantity = p.quantity;

    if (productPrice !== undefined && quantity !== undefined) {
      return total + productPrice * quantity;
    }

    return total;
  }, 0);
}

function formatShortDate(date) {
  if (date) {
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(date).toLocaleDateString(undefined, options);
  } else {
    return "N/A";
  }
}

exports.getOrders = (req, res, next) => {
  Order.find({ "user.userId": req.user._id })
    .populate("products.product")
    .then((orders) => {
      console.log("Orders:", orders);

      res.render("shop/orders", {
        path: "/orders",
        pageTitle: "Your Orders",
        orders: orders.map((order) => {
          const products = order.products.map((product) => {
            console.log("Product:", product.product);

            const title =
              product.product && product.product.title
                ? product.product.title
                : "Unknown Product";

            return {
              title: title,
              quantity: product.quantity,
              total:
                product.quantity *
                ((product.product && product.product.price) || 0),
            };
          });

          const totalPrice = products.reduce(
            (total, product) => total + product.total,
            0
          );

          return {
            ...order.toObject(),
            createdAt: formatShortDate(order.createdAt),
            products: products,
            totalPrice: totalPrice,
          };
        }),
        calculateTotalPrice: calculateTotalPrice,
        formatShortDate: formatShortDate,
      });
    })
    .catch((err) => console.log(err));
};

exports.getInvoice = async (req, res, next) => {
  try {
    const orderId = req.params.orderId;

    const order = await Order.findById(orderId).populate("products.product");

    if (!order) {
      return res.status(404).send("Order not found");
    }

    const pdfDoc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=invoice-${orderId}.pdf`
    );

    pdfDoc.pipe(res);

    pdfDoc
      .fontSize(20)
      .font("Helvetica-Bold")
      .text(`Invoice`, { align: "center", underline: true })
      .moveUp(-2);

    pdfDoc
      .fontSize(15)
      .font("Helvetica")
      .moveUp(-1)
      .text(`Order No. ${orderId}`);
    pdfDoc.moveUp(-1).text(`Order Date: - ${formatShortDate(order.createdAt)}`);
    pdfDoc.moveUp(-1).text("Order Details:");

    order.products.forEach((product) => {
      const title = product.product ? product.product.title : "Unknown Product";
      const quantity = product.quantity || 0;
      const price = product.product ? product.product.price : 0;

      pdfDoc.text(
        `- ${title} (Quantity: ${quantity}) paid $${price.toFixed(2)} for each`
      );
    });

    pdfDoc.moveUp(-1).text(`-----------------------------------------`);

    const totalPrice = calculateTotalPrice(order.products);

    pdfDoc
      .font("Helvetica-Bold")
      .text(`Total Order Price: $${totalPrice.toFixed(2)}`);

    pdfDoc.end();
  } catch (error) {
    next(error);
  }
};

// exports.getCheckout = async (req, res, next) => {
//   try {
//     const user = await req.user.populate("cart.items.productId").execPopulate();

//     const products = user.cart.items;
//     let total = 0;

//     products.forEach((p) => {
//       total += p.quantity * p.productId.price;
//     });

//     const lineItems = products.map((p) => ({
//       price_data: {
//         currency: "usd",
//         product_data: {
//           name: p.productId.title,
//           description: p.productId.description,
//           images: [p.productId.imageUrl],
//         },
//         unit_amount: p.productId.price * 100,
//       },
//       quantity: p.quantity,
//     }));

//     const session = await stripe.checkout.sessions.create({
//       payment_method_types: ["card"],
//       line_items: lineItems,
//       mode: "payment",
//       success_url: `${req.protocol}://${req.get("host")}/checkout/success`,
//       cancel_url: `${req.protocol}://${req.get("host")}/checkout/cancel`,
//     });

//     res.render("shop/checkout", {
//       path: "/checkout",
//       pageTitle: "Checkout",
//       products: products,
//       totalSum: total,
//       sessionId: session.id,
//     });
//   } catch (error) {
//     console.error("Error in getCheckout:", error);
//     const err = new Error("Failed to create Checkout session.");
//     err.httpStatusCode = 500;
//     return next(err);
//   }
// };

// exports.getCheckoutSuccess = (req, res, next) => {
//   req.user
//     .populate("cart.items.productId")
//     .execPopulate()
//     .then((user) => {
//       const products = user.cart.items.map((i) => {
//         return { quantity: i.quantity, product: { ...i.productId._doc } };
//       });
//       const order = new Order({
//         user: {
//           email: req.user.email,
//           userId: req.user,
//         },
//         products: products,
//       });
//       return order.save();
//     })
//     .then((result) => {
//       return req.user.clearCart();
//     })
//     .then(() => {
//       res.redirect("/orders");
//     })
//     .catch((err) => {
//       const error = new Error(err);
//       error.httpStatusCode = 500;
//       return next(error);
//     });
// };
