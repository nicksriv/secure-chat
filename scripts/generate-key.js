#!/usr/bin/env node
const crypto = require('crypto');

function generateKey() {
  // Generate a random 16-byte (128-bit) key and convert to hex
  const key = crypto.randomBytes(16).toString('hex');
  console.log('\nGenerated Encryption Key:', key);
  console.log('\nAdd this key to your .env files:');
  console.log('Backend (.env): ENCRYPTION_KEY=' + key);
  console.log('Frontend (.env): VITE_ENCRYPTION_KEY=' + key);
  console.log('\nMake sure to keep this key secure and never commit it to version control.\n');
}

generateKey();