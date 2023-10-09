const bcrypt = require("bcryptjs");
const formData = require("form-data");
const Mailgun = require("mailgun.js");
const mg = new Mailgun(formData);

const User = require("../models/user");

const mailgunClient = mg.client({
  username: "api",
  key: "60c82056ccc33238e548f63ceac3331e-5465e583-9492a53f",
});

exports.getLogin = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/login", {
    path: "/login",
    pageTitle: "Login",
    errorMessage: message,
  });
};

exports.getSignup = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/signup", {
    path: "/signup",
    pageTitle: "Signup",
    errorMessage: message,
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        req.flash("error", "Invalid email or password.");
        return res.redirect("/login");
      }
      bcrypt
        .compare(password, user.password)
        .then((doMatch) => {
          if (doMatch) {
            req.session.isLoggedIn = true;
            req.session.user = user;
            return req.session.save((err) => {
              console.log(err);
              res.redirect("/");
            });
          }
          req.flash("error", "Invalid email or password.");
          res.redirect("/login");
        })
        .catch((err) => {
          console.log(err);
          res.redirect("/login");
        });
    })
    .catch((err) => console.log(err));
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  let mailgunSuccess = false; // Declare mailgunSuccess variable here

  // Input validation code
  if (
    !password ||
    !confirmPassword ||
    password.length < 8 ||
    confirmPassword.length < 8
  ) {
    req.flash(
      "error",
      "Invalid password. Password must have at least 8 characters."
    );
    return res.redirect("/signup");
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    req.flash("error", "Invalid email format.");
    return res.redirect("/signup");
  }

  if (password !== confirmPassword) {
    req.flash("error", "Passwords do not match.");
    return res.redirect("/signup");
  }

  User.findOne({ email: email })
    .then((userDoc) => {
      if (userDoc) {
        req.flash("error", "Your e-mail is already in use.");
        return res.redirect("/signup");
      }

      return bcrypt
        .hash(password, 12)
        .then((hashedPassword) => {
          const user = new User({
            email: email,
            password: hashedPassword,
            cart: { items: [] },
          });
          return user.save();
        })
        .then((result) => {
          // Send email using Mailgun
          const mailgunData = {
            from: "Excited User <mailgun@sandboxa498eebb2fbd488c99b945b413e91081.mailgun.org>",
            to: [email],
            subject: "Signup succeeded!",
            text: "You successfully signed up!",
            html: "<h1>You successfully signed up!</h1>",
          };

          return mailgunClient.messages
            .create(
              "sandboxa498eebb2fbd488c99b945b413e91081.mailgun.org",
              mailgunData
            )
            .then((msg) => {
              console.log(msg);
              // Set mailgunSuccess to true on success
              mailgunSuccess = true;
              return Promise.resolve(); // Resolve the promise
            })
            .catch((err) => {
              console.log(err);
              // Handle the error, e.g., log it or perform other actions
              return Promise.reject(err); // Reject the promise on error
            });
        })
        .then(() => {
          // After the Mailgun promise is resolved, perform the redirection
          if (mailgunSuccess) {
            res.redirect("/login"); // Redirect to login on success
          } else {
            res.redirect("/signup"); // Redirect to signup on failure
          }
        });
    })
    .catch((err) => {
      console.log(err);
    });
};

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    console.log(err);
    res.redirect("/");
  });
};
