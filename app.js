const path = require('path');
const express = require('express');
const morgan = require('morgan');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
// const cookieParser = require('cookie-parser'); download cookieparser npm package..

const viewRouter = require('./routes/viewRoutes');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');

const { base } = require('./models/tourModels');
// const rateLimit = require('./express-rate-limit');
// const helmet = require('./helmet');

const app = express();

// 1) Global MiddleWares..
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// a) set secure http headers..
// app.use(helmet());

// b) Development logging..
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// c) Limiting the requests from the same IP address in an hour..
// const limiter = rateLimit({
//   max: 100,
//   windowMs: 60 * 60 * 1000,
//   message: 'Too many requests from this IP, please try again in an hour!',
// });
// app.use('/api', limiter);

// d) Body parser, reading data from body into req.body..
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
// app.use(cookieParser());

// e) Data Sanitization against NoSql query injection..
// app.use(mongoSanitize()); // using express-mongo-sanitize npm package..

// f) Data Sanitization against XSS
// app.use(xss()) // using package xss clean..

// g) Prevent parameter pollution..
// app.use(hpp()); // using hpp npm package..

// h) Serving static files..
app.use(express.static(path.join(__dirname, 'public')));

// i) Test middleware..
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// 3) Routers..
// mounting of a router..
app.use('/', viewRouter);
app.use('/tour', viewRouter);

//npm i --save-dev @types/express
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

app.all('*', (req, res, next) => {
  // const err = new Error(`can't find the ${req.originalUrl} URL path!`);
  // err.status = 'fail';
  // err.statusCode = 404;

  next(new AppError(`can't find the ${req.originalUrl} URL path!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
