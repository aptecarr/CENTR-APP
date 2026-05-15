import CryptoJS from 'crypto-js';

// In a real production app, this would be handled much more securely, 
// possibly per-user or retrieved from a KMS.
// For this application, we use a global secret from environment variables.
// @ts-ignore
const SECRET_KEY = (import.meta.env?.VITE_ENCRYPTION_SECRET as string) || 'default-secret-key-don-not-use-in-prod';

/**
 * Encrypts a string using AES.
 * @param text The plain text to encrypt.
 * @returns The encrypted string (Base64).
 */
export const encryptText = (text: string): string => {
  if (!text) return '';
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
};

/**
 * Decrypts an AES encrypted string.
 * @param cipherText The encrypted string (Base64).
 * @returns The decrypted plain text.
 */
export const decryptText = (cipherText: string): string => {
  if (!cipherText) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    return originalText || '[Помилка розкодування]';
  } catch (error) {
    console.error('Decryption failed:', error);
    return '[Помилка розкодування]';
  }
};
