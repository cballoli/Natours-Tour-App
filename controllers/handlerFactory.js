const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const APIFeatures = require('./../utils/apiFeatures');

exports.deleteOne = (Model) =>
  catchAsync(async (req, res) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError('No Document is found with that ID', 404));
    }

    res.status(204).json({
      status: 'Success',
      data: null,
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'Success',
      data: {
        data: doc,
      },
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        data: doc,
      },
    });

    // try {
    //   // const newTour = new Tour({});
    //   // newTour.save();  its same as below
    //   // this create method returns a promise

    // } catch (err) {
    //   res.status(400).json({
    //     status: 'failed',
    //     message: err,
    //   });
    // }
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res) => {
    let query = Model.findById(req.params.id);

    if (popOptions) query = query.populate(popOptions);

    const doc = await query;

    // The above code works same as Tour.findOne({ _id: req.params.id });

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    // To allow for nested Get reviews on tour (hack)
    let filter = {};

    if (req.params.tourId) filter = { tour: req.params.tourId };

    // Execute Query..
    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    // All the methods chaining above work because, we return after calling every method.

    // const doc = await features.query.explain();
    const doc = await features.query;

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      results: doc.length,
      data: {
        data: doc,
      },
    });
  });
