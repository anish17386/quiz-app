const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Quiz = require('../models/Quiz');
const Submission = require('../models/Submission');

// Helper to generate a unique 6-character alphanumeric join code
async function generateUniqueJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded confusing chars like I, O, 0, 1
  let code = '';
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 100) {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Check if code exists
    const existing = await Quiz.findOne({ joinCode: code });
    if (!existing) {
      isUnique = true;
    }
    attempts++;
  }
  return code;
}

// @route   GET /api/quizzes
// @desc    Get all quizzes created by logged-in user (Strict isolation)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const quizzes = await Quiz.find({ createdBy: req.user.id }).sort({ createdAt: -1 });
    res.json(quizzes);
  } catch (err) {
    console.error('Fetch quizzes error:', err);
    res.status(500).json({ message: 'Server error fetching quizzes' });
  }
});

// @route   POST /api/quizzes
// @desc    Create a new quiz
// @access  Private
router.post('/', auth, async (req, res) => {
  const { title, questions } = req.body;

  try {
    if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'Please provide a title and at least one question' });
    }

    // Validate questions array
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text || !q.options || !Array.isArray(q.options) || q.options.length < 2) {
        return res.status(400).json({ message: `Question ${i + 1} must have text and at least 2 options` });
      }
      if (q.correctOptionIndex === undefined || q.correctOptionIndex < 0 || q.correctOptionIndex >= q.options.length) {
        return res.status(400).json({ message: `Question ${i + 1} must have a valid correctOptionIndex` });
      }
    }

    const joinCode = await generateUniqueJoinCode();

    const newQuiz = new Quiz({
      title,
      status: 'active',
      joinCode,
      createdBy: req.user.id,
      questions
    });

    await newQuiz.save();
    res.status(201).json(newQuiz);

  } catch (err) {
    console.error('Quiz creation error:', err);
    res.status(500).json({ message: 'Server error during quiz creation' });
  }
});

// @route   GET /api/quizzes/join/:code
// @desc    Fetch active quiz by join code for participant (Excludes correct answers to prevent cheating)
// @access  Public
router.get('/join/:code', async (req, res) => {
  const { code } = req.params;

  try {
    const quiz = await Quiz.findOne({ joinCode: code.toUpperCase().trim() });
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found. Please verify the code.' });
    }

    if (quiz.status !== 'active') {
      return res.status(400).json({ message: 'This quiz is no longer active.' });
    }

    // Strip out correct answers to prevent inspection
    const sanitizedQuestions = quiz.questions.map(q => ({
      _id: q._id,
      text: q.text,
      options: q.options
    }));

    res.json({
      _id: quiz._id,
      title: quiz.title,
      status: quiz.status,
      joinCode: quiz.joinCode,
      questions: sanitizedQuestions
    });

  } catch (err) {
    console.error('Join quiz error:', err);
    res.status(500).json({ message: 'Server error fetching quiz details' });
  }
});

// @route   POST /api/quizzes/submit/:code
// @desc    Submit quiz answers, calculate score, record submission, and return results
// @access  Public
router.post('/submit/:code', async (req, res) => {
  const { code } = req.params;
  const { participantName, answers } = req.body; // answers is an array of option indices

  try {
    if (!participantName || !participantName.trim()) {
      return res.status(400).json({ message: 'Participant nickname is required.' });
    }

    const quiz = await Quiz.findOne({ joinCode: code.toUpperCase().trim() });
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found.' });
    }

    if (quiz.status !== 'active') {
      return res.status(400).json({ message: 'Submissions are closed for this quiz.' });
    }

    if (!answers || !Array.isArray(answers) || answers.length !== quiz.questions.length) {
      return res.status(400).json({ message: 'Malformed answer submission.' });
    }

    // Calculate score
    let score = 0;
    const questionsFeedback = [];

    quiz.questions.forEach((question, index) => {
      const submittedAnswer = answers[index];
      const correctAnswer = question.correctOptionIndex;
      const isCorrect = submittedAnswer === correctAnswer;

      if (isCorrect) {
        score++;
      }

      questionsFeedback.push({
        text: question.text,
        options: question.options,
        submittedAnswer,
        correctAnswer,
        isCorrect
      });
    });

    // Save submission
    const submission = new Submission({
      quizId: quiz._id,
      participantName: participantName.trim(),
      score,
      totalQuestions: quiz.questions.length,
      answers
    });

    await submission.save();

    res.json({
      quizTitle: quiz.title,
      score,
      totalQuestions: quiz.questions.length,
      feedback: questionsFeedback
    });

  } catch (err) {
    console.error('Submit quiz error:', err);
    res.status(500).json({ message: 'Server error processing quiz submission' });
  }
});

// @route   GET /api/quizzes/leaderboard/:code
// @desc    Get public leaderboard for a quiz by join code
// @access  Public
router.get('/leaderboard/:code', async (req, res) => {
  const { code } = req.params;
  try {
    const quiz = await Quiz.findOne({ joinCode: code.toUpperCase().trim() });
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found.' });
    }
    const submissions = await Submission.find({ quizId: quiz._id })
      .sort({ score: -1, createdAt: 1 })
      .limit(10)
      .select('participantName score totalQuestions createdAt');
    res.json(submissions);
  } catch (err) {
    console.error('Leaderboard fetch error:', err);
    res.status(500).json({ message: 'Server error fetching leaderboard' });
  }
});

// @route   GET /api/quizzes/:id/stats
// @desc    Get stats/submissions/leaderboard for a specific quiz (Isolated to creator)
// @access  Private
router.get('/:id/stats', auth, async (req, res) => {
  try {
    // Ensure quiz exists and belongs to logged-in user
    const quiz = await Quiz.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found or unauthorized' });
    }

    // Fetch submissions
    const submissions = await Submission.find({ quizId: quiz._id }).sort({ score: -1, createdAt: 1 });

    // Aggregate statistics
    const totalSubmissions = submissions.length;
    let averageScore = 0;
    let questionStats = quiz.questions.map(q => ({
      text: q.text,
      correctCount: 0,
      incorrectCount: 0,
      totalCount: 0
    }));

    if (totalSubmissions > 0) {
      let sumScores = 0;
      submissions.forEach(sub => {
        sumScores += sub.score;
        sub.answers.forEach((ans, index) => {
          if (index < questionStats.length) {
            questionStats[index].totalCount++;
            if (ans === quiz.questions[index].correctOptionIndex) {
              questionStats[index].correctCount++;
            } else {
              questionStats[index].incorrectCount++;
            }
          }
        });
      });
      averageScore = parseFloat((sumScores / totalSubmissions).toFixed(2));
    }

    res.json({
      quiz: {
        id: quiz._id,
        title: quiz.title,
        status: quiz.status,
        joinCode: quiz.joinCode,
        totalQuestions: quiz.questions.length
      },
      stats: {
        totalSubmissions,
        averageScore,
        questionStats
      },
      leaderboard: submissions.map(sub => ({
        id: sub._id,
        participantName: sub.participantName,
        score: sub.score,
        totalQuestions: sub.totalQuestions,
        createdAt: sub.createdAt
      }))
    });

  } catch (err) {
    console.error('Quiz stats error:', err);
    res.status(500).json({ message: 'Server error retrieving quiz stats' });
  }
});

// @route   PATCH /api/quizzes/:id/status
// @desc    Toggle quiz status (active <-> past)
// @access  Private
router.patch('/:id/status', auth, async (req, res) => {
  const { status } = req.body;

  if (!status || !['active', 'past'].includes(status)) {
    return res.status(400).json({ message: 'Please provide a valid status ("active" or "past")' });
  }

  try {
    const quiz = await Quiz.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found or unauthorized' });
    }

    quiz.status = status;
    await quiz.save();

    res.json(quiz);
  } catch (err) {
    console.error('Toggle status error:', err);
    res.status(500).json({ message: 'Server error toggling status' });
  }
});

// @route   DELETE /api/quizzes/:id
// @desc    Delete a quiz & its submissions
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found or unauthorized' });
    }

    await Quiz.deleteOne({ _id: quiz._id });
    await Submission.deleteMany({ quizId: quiz._id });

    res.json({ message: 'Quiz and all associated submissions deleted successfully' });
  } catch (err) {
    console.error('Delete quiz error:', err);
    res.status(500).json({ message: 'Server error deleting quiz' });
  }
});

module.exports = router;
