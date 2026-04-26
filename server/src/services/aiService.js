const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

async function parseResume(filePath, originalName, userId) {
  const FormData = require('form-data');
  const fs = require('fs');

  const form = new FormData();
  form.append('file', fs.createReadStream(filePath), originalName);
  form.append('user_id', String(userId));

  const response = await axios.post(`${AI_SERVICE_URL}/parse_resume`, form, {
    headers: form.getHeaders(),
  });

  return response.data;
}

module.exports = { parseResume };