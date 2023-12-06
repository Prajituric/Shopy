const Product = require("../models/product");
const Order = require("../models/order");
const mongoose = require("mongoose");

const User = require("../models/user");

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

exports.getCart = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then((user) => {
      const products = user.cart.items;

      // Attach calculateTotalPrice to res.locals
      res.locals.calculateTotalPrice = calculateTotalPrice;

      res.render("shop/cart", {
        path: "/cart",
        pageTitle: "Your Cart",
        products: products,
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
        createdAt: new Date(), // Set createdAt to the current date
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
    const productPrice = p.productId && p.productId.price;
    const quantity = p.quantity;

    if (productPrice !== undefined && quantity !== undefined) {
      return total + productPrice * quantity;
    }

    return total;
  }, 0);
}

// ... (existing code)

function formatShortDate(date) {
  if (date) {
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(date).toLocaleDateString(undefined, options);
  } else {
    return "N/A"; // or any default value you prefer
  }
}

exports.getOrders = (req, res, next) => {
  Order.find({ "user.userId": req.user._id })
    .populate("products.product")
    .then((orders) => {
      console.log("Orders:", orders); // Log orders

      res.render("shop/orders", {
        path: "/orders",
        pageTitle: "Your Orders",
        orders: orders.map((order) => {
          const products = order.products.map((product) => {
            console.log("Product:", product.product); // Log each product

            // Check if product and product.title are defined
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
