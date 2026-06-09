const mongoose = require('mongoose');

const SubmissionSchema = new mongoose.Schema({
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  participantName: {
    type: String,
    required: true,
    trim: true
  },
  score: {
    type: Number,
    required: true
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  answers: {
    type: [Number], // array of selected option indices
    default: []
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Submission', SubmissionSchema);
