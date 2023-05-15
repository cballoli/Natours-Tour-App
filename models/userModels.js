const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A name must be specified.'],
    trim: true,
    maxlength: [30, 'Name must be less than or equal to 30 characters.'],
  },

  email: {
    type: String,
    required: [true, 'Email is required'],
    validate: [validator.isEmail, 'Please provide a valid email!'],
    unique: true,
    lowercase: true,
  },

  photo: {
    type: String,
    default: 'default.jpg',
  },

  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },

  password: {
    type: String,
    required: [true, 'Please fill the password'],
    minlength: 8,
    select: false,
  },

  passwordConfirm: {
    type: String,
    required: [true, 'Please Confirm the password'],
    validate: {
      validator: function (el) {
        return el === this.password;
      },
      message: 'Password must be same!',
    },
  },

  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordTokenExpiresAt: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

// Password Encryption..
userSchema.pre('save', async function (next) {
  // Works when password is actually being modified..
  if (!this.isModified('password')) return next();

  // Hash password with the cost of 12..
  this.password = await bcrypt.hash(this.password, 12);

  // Delete passwordConfirm field..
  this.passwordConfirm = undefined;
});

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function (next) {
  // this points to the current element
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimeStamp) {
  let changedTimeStamp;
  if (this.passwordChangedAt) {
    changedTimeStamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);

    return JWTTimeStamp < changedTimeStamp;
  }
  return false;
};

userSchema.methods.createResetPasswordToken = function () {
  // Creates a token..
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Encrypts the created token & saves it in database..
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Expiry for token i.e. 10 minutes..
  this.passwordTokenExpiresAt = Date.now() + 10 * 60 * 1000;
  // console.log(this.passwordResetToken, resetToken, 'this');

  // returns plain text token..
  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
