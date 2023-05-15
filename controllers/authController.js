const crypto = require('crypto');
const { promisify } = require('util');
const User = require('./../models/userModels');
const jwt = require('jsonwebtoken');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const Email = require('./../utils/email');
const { url } = require('inspector');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  user.password = undefined;

  res.status(statusCode).json({
    status: 'Success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create(
    req.body
    //   {
    //   name: req.body.name,
    //   email: req.body.email,
    //   password: req.body.password,
    //   passwordConfirm: req.body.passwordConfirm,
    // }
  );
  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, res);
  // const token = signToken(newUser._id);

  // res.status(201).json({
  //   status: 'Success',
  //   token,
  //   data: {
  //     user: newUser,
  //   },
  // });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  console.log(email, password);

  // 1) Check if email or passwords exist..
  if (!email || !password) {
    return next(new AppError('Please provide Email & Password!', 400));
  }

  // 2) Check if User exists & password is correct..
  const user = await User.findOne({ email }).select('+password');
  console.log(user);
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Invalid Email or Pasword', 401));
  }

  createSendToken(user, 200, res);
  // const token = signToken(user._id);
  // // 3) If everything is Ok then send a response..
  // res.status(200).json({
  //   status: 'Success',
  //   token,
  // });
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting Token & check if its There..
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookie.jwt) {
    token = req.cookie.jwt;
  }

  if (!token) {
    return next(
      new AppError('You are not logged in, Please log in to get access!', 401)
    );
  }

  // 2) Verify Token..
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check If user still exists..
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('The User does not exist!', 401));
  }
  console.log(decoded);

  // 4) Check if user changed the password after token is issued.
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again.', 401)
    );
  }
  // Grant Access to protected Route
  req.user = currentUser;
  req.locals.user = currentUser;
  next();
});

exports.isLoggedIn = async (req, res, next) => {
  if (req.cookie.jwt) {
    try {
      // 1) Verify Token..
      const decoded = await promisify(jwt.verify)(
        req.cookie.jwt,
        process.env.JWT_SECRET
      );

      // 2) Check If user still exists..
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed the password after token is issued.
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }
      // Grant Access to protected Route
      req.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You dont have authority to perform this action!', 403)
      );
    }

    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get User Based on posted email..
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with email address.', 404));
  }

  // 2) Generate The random reset token..
  const resetToken = user.createResetPasswordToken();

  await user.save({ validateBeforeSave: false });

  // 3) send it to user's mail..
  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;

    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordTokenExpiresAt = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError('There was an error sending the email. Try again later!'),
      500
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token..
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordTokenExpiresAt: { $gt: Date.now() },
  });

  // 2) If user has not expired and there is user, set the new password..
  if (!user) {
    return next(new AppError('Token is invalid or expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordTokenExpiresAt = undefined;
  await user.save();

  // 3) Update changedPasswordAt property for the user..
  // done in userModels..

  // 4) Log the user in, send JWT..
  createSendToken(user, 200, res);
  // const token = signToken(user._id);

  // res.status(200).json({
  //   status: 'Success',
  //   token,
  // });
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get the user from the collections
  const user = await User.findById(req.user.id).select('+password');

  // if (!user) {
  //   return next(
  //     new AppError(
  //       'There is no user with this email, Please Check your Email!',
  //       404
  //     )
  //   );
  // }

  // 2) Check if posted password is Correct..
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(
      new AppError(
        'Your current password is Wrong, Please Check your password!',
        401
      )
    );
  }

  // 3) If password matched, Update the Password..
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  // 4) Log user in, send JWT..
  createSendToken(user, 200, res);
});
