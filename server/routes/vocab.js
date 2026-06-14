const express = require('express');
const router = express.Router();

// GET /api/vocab/random — returns a random Korean vocabulary word
// The actual vocab data is stored in client/public/vocab/korean_vocab.json
// This endpoint is a lightweight server-side proxy (optional)
router.get('/random', (req, res) => {
  res.json({ message: 'Use client-side vocab JSON directly' });
});

module.exports = router;
