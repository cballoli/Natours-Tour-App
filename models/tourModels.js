const mongoose = require('mongoose');
const slugify = require('slugify');
// const User = require('./userModels');
// const validator = require('validator');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'], // it's a validator here
      unique: true,
      trim: true,
      minlength: [10, 'The Name must have characters more then or equal to 10'],
      maxlength: [40, 'The Name must have characters less then or equal to 40'],
      // validate: [validator.isAlpha, 'The Name must contain only Alphabets']
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a Duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a Group Size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'A difficulty must be: easy, medium, difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1.0, 'The ratings must be greater than or equal to 1.0'],
      max: [5.0, 'The ratings must be less than or equal to 5.0'],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          return val < this.price;
        },
        message: 'The PriceDiscount ({VALUE}) must be less than regular price',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a description'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      // GeoJSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      {
        // GeoJSON
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// tourSchema.index({ price: 1 });
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id',
});

// 1) Mongoose Document Middleware. runs for .save() & .create()
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// Embedding data..
// tourSchema.pre('save', async function (next) {
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

// like pre we do have post method which runs after the event is executed.

// 2) Mongoose Query Middleware. runs for find()
// tourSchema.pre('find', function (next) {
tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } });

  this.start = Date.now();
  next();
});

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v',
  });
  next();
});

// tourSchema.post(/^find/, function (docs, next) {
//   console.log(`Query took ${Date.now() - this.start} Milliseconds`);
//   next();
// });

// 3) AGGREGATION MIDDLEWARE
// tourSchema.pre('aggregate', function (next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   console.log(this);
//   next();
// });

// we can also write above middleware this way, but it will violate our DRY principle.
// tourSchema.pre('findOne', function (next) {
//   this.find({ secretTour: { $ne: true } });
//   next();
// });

// its a convention to use Uppercase in model names and variables.
const Tour = mongoose.model('Tour', tourSchema);
// this testTour down here is an instance of the Tour model
// const testTour = new Tour({
//   name: 'The Park Camper',
//   price: 997,
// });

module.exports = Tour;
