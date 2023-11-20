const bcrypt = require("bcryptjs");

const User = require("../models/user");

const crypto = require("crypto");

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
          const verificationToken = crypto.randomBytes(32).toString("hex");
          const user = new User({
            email: email,
            password: hashedPassword,
            cart: { items: [] },
            isVerified: false, // Set the verification status to false initially
            verificationToken: verificationToken, // Save the verification token
          });
          return user.save();
        })
        .then(() => {
          return res.redirect("/login");
        });
    })
    .catch((err) => {
      console.log(err);
      res.redirect("/signup");
    });
};

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    console.log(err);
    res.redirect("/");
  });
};

exports.getResetPw = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/resetpw", {
    path: "/resetpw",
    pageTitle: "Reset Password",
    errorMessage: message,
  });
};
