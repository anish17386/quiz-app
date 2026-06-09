const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true
  },
  options: {
    type: [String],
    required: true,
    validate: {
      validator: function(arr) {
        return arr.length >= 2;
      },
      message: 'A question must have at least 2 options.'
    }
  },
  correctOptionIndex: {
    type: Number,
    required: true,
    min: 0
  }
});

const QuizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'past'],
    default: 'active'
  },
  joinCode: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  questions: {
    type: [QuestionSchema],
    required: true,
    validate: {
      validator: function(arr) {
        return arr.length >= 1;
      },
      message: 'A quiz must have at least 1 question.'
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Quiz', QuizSchema);
