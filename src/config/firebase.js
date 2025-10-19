// src/config/firebase.js
import admin from "firebase-admin";

function getServiceAccount() {
  // 1) لو متاح Base64 في env
  if (process.env.SERVICE_ACCOUNT_KEY) {
    try {
      const b64 = process.env.SERVICE_ACCOUNT_KEY;
      const json = Buffer.from(b64, "base64").toString("utf8");
      return JSON.parse(json);
    } catch (err) {
      throw new Error("Failed to parse SERVICE_ACCOUNT_KEY from env: " + err.message);
    }
  }

  // 2) أو لو ضفت JSON string مباشرة في env
  if (process.env.SERVICE_ACCOUNT_JSON) {
    try {
      return JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
    } catch (err) {
      throw new Error("Failed to parse SERVICE_ACCOUNT_JSON from env: " + err.message);
    }
  }

  // 3) أخيراً: لو مستخدم GOOGLE_APPLICATION_CREDENTIALS كمسار (مش مناسب في Vercel)
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      const maybe = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      // لو القيمة عبارة عن JSON string
      if (maybe.trim().startsWith("{")) return JSON.parse(maybe);
      // غير كده اعتبرها مسار، لكن في Vercel ده غالباً مش هيشتغل
      const serviceAccount = require(maybe);
      return serviceAccount;
    } catch (err) {
      throw new Error("Failed to load GOOGLE_APPLICATION_CREDENTIALS: " + err.message);
    }
  }

  throw new Error("No Firebase service account provided. Set SERVICE_ACCOUNT_KEY (base64) or SERVICE_ACCOUNT_JSON in env.");
}

export function initializeFirebase() {
  if (admin.apps.length) return admin;

  const serviceAccount = getServiceAccount();

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log("✅ Firebase initialized from env");
  return admin;
}

const firebaseAdmin = initializeFirebase();
export const db = firebaseAdmin.firestore();
export const auth = firebaseAdmin.auth();
export default firebaseAdmin;
