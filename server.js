const mongoose = require('mongoose');
const dotenv = require('dotenv');

process.on('uncaughtException', (err) => {
  console.log('UNHANDLED REJECTION.! Shutting Down...');
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: './config.env' });

const app = require('./app');

// Establishing Database Connection...
mongoose
  .connect(process.env.DATABASE_LOCAL, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('DB connection successful!');
  });

// Server..
//process.env.PORT ||
const port = 3000;
const server = app.listen(port, () => {
  console.log(`App is running on port ${port}`);
});

// Global Unhandled Rejection Handler..
process.on('unhandledRejection', (err) => {
  // console.log(err.name, err.message);
  console.log(err.stack);
  console.log('UNHANDLED REJECTION.! Shutting Down...');
  console.log(err.stack);
  server.close(() => {
    process.exit(1);
  });
});
