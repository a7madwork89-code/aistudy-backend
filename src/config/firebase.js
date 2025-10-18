// src/config/firebase.js
import admin from "firebase-admin";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, isAbsolute } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadJson(pathToFile) {
  try {
    return JSON.parse(readFileSync(pathToFile, "utf8"));
  } catch (err) {
    throw new Error(`Failed to read/parse JSON file at ${pathToFile}: ${err.message}`);
  }
}

export function initializeFirebase() {
  if (admin.apps.length) {
    console.log("Firebase already initialized.");
    return admin;
  }

  try {
    // 1) لو محدد مسار JSON عبر env استخدمه (الأفضل)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const fullPath = isAbsolute(envPath) ? envPath : join(process.cwd(), envPath);
      if (!existsSync(fullPath)) {
        throw new Error(`GOOGLE_APPLICATION_CREDENTIALS file not found at ${fullPath}`);
      }
      const serviceAccount = loadJson(fullPath);
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      console.log("✅ Firebase initialized using GOOGLE_APPLICATION_CREDENTIALS JSON file.");
      return admin;
    }

    // 2) لو عندك مفاتيح في .env (FIREBASE_PRIVATE_KEY + CLIENT_EMAIL + PROJECT_ID)
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
      let pk = process.env.FIREBASE_PRIVATE_KEY;

      // لو القيمة محاطة بعلامات اقتباس نزيلها
      if (pk.startsWith('"') && pk.endsWith('"')) {
        pk = pk.slice(1, -1);
      }

      // نحول \n الحرفية لسطر جديد فعلي
      pk = pk.replace(/\\n/g, "\n").trim();

      if (!pk.startsWith("-----BEGIN PRIVATE KEY-----")) {
        throw new Error("FIREBASE_PRIVATE_KEY does not look like a valid private key (PEM).");
      }

      const cert = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: pk,
      };

      admin.initializeApp({ credential: admin.credential.cert(cert) });
      console.log("✅ Firebase initialized using FIREBASE_PRIVATE_KEY from env.");
      return admin;
    }

    // 3) أخيراً: حاول نلاقي ملف serviceAccountKey.json في مسارات شائعة
    const candidates = [
      join(__dirname, "serviceAccountKey.json"),
      join(__dirname, "..", "config", "serviceAccountKey.json"),
      join(__dirname, "..", "..", "src", "config", "serviceAccountKey.json"),
      join(__dirname, "..", "..", "config", "serviceAccountKey.json"),
      join(process.cwd(), "src", "config", "serviceAccountKey.json"),
      join(process.cwd(), "config", "serviceAccountKey.json"),
    ];

    let found = null;
    for (const p of candidates) {
      if (existsSync(p)) {
        found = p;
        break;
      }
    }

    if (found) {
      const serviceAccount = loadJson(found);
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      console.log(`✅ Firebase initialized using JSON file at ${found}`);
      return admin;
    }

    // لو وصلنا لحد هنا مفيش credentials
    throw new Error(
      "No Firebase credentials found. Provide GOOGLE_APPLICATION_CREDENTIALS, or set FIREBASE_PRIVATE_KEY + FIREBASE_CLIENT_EMAIL + FIREBASE_PROJECT_ID in .env, or place serviceAccountKey.json in src/config/"
    );
  } catch (err) {
    console.error("❌ Firebase initialization error:", err.message || err);
    throw err;
  }
}

const firebaseAdmin = initializeFirebase();
export const db = firebaseAdmin.firestore();
export const auth = firebaseAdmin.auth();
export default firebaseAdmin;
