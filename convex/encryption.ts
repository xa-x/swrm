"use node";

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const MASTER_KEY = process.env.ENCRYPTION_KEY
  ? scryptSync(process.env.ENCRYPTION_KEY, "swrm-salt", 32)
  : randomBytes(32);

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export function encryptApiKey(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, MASTER_KEY, iv);
  
  let ciphertext = cipher.update(plaintext, "utf8", "base64");
  ciphertext += cipher.final("base64");
  
  const authTag = cipher.getAuthTag();
  
  const combined = Buffer.concat([
    iv,
    authTag,
    Buffer.from(ciphertext, "base64")
  ]);
  
  return combined.toString("base64");
}

export function decryptApiKey(encrypted: string): string {
  try {
    const combined = Buffer.from(encrypted, "base64");
    
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    
    const decipher = createDecipheriv(ALGORITHM, MASTER_KEY, iv);
    decipher.setAuthTag(authTag);
    
    let plaintext = decipher.update(ciphertext, undefined, "utf8");
    plaintext += decipher.final("utf8");
    
    return plaintext;
  } catch (error) {
    throw new Error("Failed to decrypt API key");
  }
}
