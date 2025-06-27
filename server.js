require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/check-keys', (req, res) => {
  if (!process.env.OPENAI_API_KEY || !process.env.SHOPIFY_API_KEY || !process.env.SHOPIFY_STORE_URL) {
    return res.status(500).json({ success: false, message: 'API keys or store URL missing' });
  }
  return res.json({ success: true, message: 'Keys are set' });
});

app.post('/generate', async (req, res) => {
  const { productUrl } = req.body;
  if (!productUrl || !/^https?:\/\//i.test(productUrl)) {
    return res.status(400).json({ success: false, message: 'Invalid or missing product URL' });
  }

  try {
    const openaiResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a Shopify sales page generator.' },
        { role: 'user', content: `Generate a persuasive sales page HTML for this product: ${productUrl}` }
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    const htmlContent = openaiResponse.data.choices[0].message.content;
    res.json({ success: true, html: htmlContent });
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to generate page' });
  }
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});