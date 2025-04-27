import crypto from 'crypto';
import CryptoJS from 'crypto-js';

const algorithm = 'aes-128-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
console.log('ENCRYPTION_KEY present:', !!ENCRYPTION_KEY);
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
  throw new Error('Invalid or missing ENCRYPTION_KEY. Must be a 32-character hex string.');
}

const key = Buffer.from(ENCRYPTION_KEY, 'hex');

export const encryptMessage = (text: string): string => {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt message');
  }
};

export const decryptMessage = (encryptedText: string): string => {
  try {
    const [ivHex, encrypted] = encryptedText.split(':');
    if (!ivHex || !encrypted) {
      throw new Error('Invalid encrypted message format');
    }
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt message');
  }
};

export const decryptMessageWithAES = (encryptedText: string): string => {
  try {
    const decryptedBackend = decryptMessage(encryptedText);
    const bytes = CryptoJS.AES.decrypt(decryptedBackend, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt message');
  }
}

/**
 * Decrypt messages that were encrypted by the frontend using CryptoJS
 * Uses the same method as the frontend to ensure compatibility
 */
export const decryptFrontendMessage = (encryptedText: string): string => {
  try {
    // Data validation - check if the input is a valid string
    if (!encryptedText || typeof encryptedText !== 'string') {
      console.error('Invalid encryptedText provided:', encryptedText);
      throw new Error('Invalid encrypted message format');
    }

    // Check if this is a backend-encrypted message (uses the format with ':')
    if (encryptedText.includes(':')) {
      console.log('Detected backend encryption format, using standard decryption');
      return decryptMessage(encryptedText);
    }

    // Handle CryptoJS encrypted messages
    console.log('Attempting to decrypt with CryptoJS...');
    
    try {
      // Use CryptoJS directly with the same key as the frontend
      const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      
      if (!decrypted) {
        console.error('Decryption resulted in empty string');
        throw new Error('Decryption resulted in empty string');
      }
      
      return decrypted;
    } catch (innerError) {
      console.error('CryptoJS decryption failed:', innerError);
      
      // Try with a workaround for potential format issues
      console.log('Attempting alternate decryption approach...');
      try {
        // Some CryptoJS versions may have issues with certain formats
        // Try using WordArray directly if possible
        const cipherParams = CryptoJS.lib.CipherParams.create({
          ciphertext: CryptoJS.enc.Base64.parse(encryptedText)
        });
        const decrypted = CryptoJS.AES.decrypt(cipherParams, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
        
        if (decrypted) {
          console.log('Alternate decryption succeeded');
          return decrypted;
        }
        throw new Error('Alternate decryption failed');
      } catch (altError) {
        console.error('Alternate decryption approach failed:', altError);
        
        // Last resort - return a placeholder
        console.warn('All decryption methods failed - returning placeholder');
        return "[Encrypted message]";
      }
    }
  } catch (error) {
    console.error('Frontend message decryption error:', error);
    console.error('Text sample:', encryptedText ? encryptedText.substring(0, 30) + '...' : 'empty');
    
    // Instead of failing completely, return a placeholder
    return "[Encrypted message]";
  }
};