const AppError = require('./../utils/appError');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateValueDB = (err) => {
  const value = err.keyValue.name;
  console.log(value);
  const message = `Duplicate field value: ${value}. please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;

  return new AppError(message, 400);
};

const handleJsonError = () =>
  new AppError('Invalid token, Please log in again!', 401);

const handleJWTExpireError = () =>
  new AppError('Your token has expired! Please login again', 401);

const sendErrorDev = (err, req, res) => {
  // A) API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }
  // B) RENDERED WEBSITE
  console.error('ERROR', err);
  return res.status(err.statusCode).render('error', {
    title: 'Somrthing went Wrong!',
    msg: err.message,
  });
};

const sendErrorProd = (err, req, res) => {
  // A) API
  if (req.originalUrl.startsWith('/api')) {
    // Opterational, trusted error: send message to client
    if (err.isOpertional) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });

      // Programming or Other Unknown Errors: Don't leak error details
    }
    // 1) log error
    console.error('ERROR', err);

    // 2) Send Generic Message
    return res.status(500).json({
      status: 'error',
      message: 'Something went wrong!',
    });
  }
  //B) RENDERED WEBSITES
  // Opterational, trusted error: send message to client
  if (err.isOpertional) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });

    // Programming or Other Unknown Errors: Don't leak error details
  }
  // 1) log error
  console.error('ERROR', err);

  // 2) Send Generic Message
  return res.status(err.statusCode).render('error', {
    title: 'Somrthing went Wrong!',
    msg: 'Please try again later.',
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message;
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateValueDB(error);
    if (error.name === 'ValidationError')
      error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJsonError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpireError();
    sendErrorProd(error, req, res);
  }
};
