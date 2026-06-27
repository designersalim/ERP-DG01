import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import * as admin from "firebase-admin";
import crypto from "crypto";
import fs from "fs";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Google GenAI Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Load client Firebase configuration securely to extract project ID
let firebaseConfig: any = {};
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
  }
} catch (e) {
  console.error("Failed to load firebase-applet-config.json:", e);
}

// Initialize Firebase Admin SDK using Application Default Credentials on Cloud Run
try {
  const apps = admin.apps || [];
  if (!apps.length && firebaseConfig.projectId) {
    admin.initializeApp({
      projectId: firebaseConfig.projectId,
    });
    console.log("Firebase Admin SDK initialized successfully for project:", firebaseConfig.projectId);
  }
} catch (e) {
  console.error("Failed to initialize Firebase Admin SDK:", e);
}

const apps = admin.apps || [];
const adminDb = apps.length ? admin.firestore() : null;

// Hashing Helpers
const sha256 = (str: string) => crypto.createHash('sha256').update(str).digest('hex');

const getSaltedHash = (password: string, email: string) => {
  const salt = email.trim().toLowerCase() + "AcoolaTrimsErpSecureSalt2026";
  return crypto.createHmac("sha512", salt).update(password).digest("hex");
};

// Secure Firebase Auth ID Token Verification Middleware
const authenticateFirebaseUser = async (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: Missing authorization header token" });
    }
    const token = authHeader.split("Bearer ")[1];
    
    const apps = admin.apps || [];
    if (!apps.length) {
      console.warn("Firebase Admin not initialized, bypassing authentication check in local environment.");
      return next();
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Firebase ID Token Verification failed:", error);
    return res.status(401).json({ error: "Unauthorized: Invalid or expired access token" });
  }
};

// In-Memory Rate Limiter Map for API
const chatRateLimits = new Map<string, { count: number; resetTime: number }>();

const chatRateLimiter = (req: any, res: any, next: any) => {
  const userId = req.user?.uid || req.ip;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 10; // max 10 requests per minute

  const limit = chatRateLimits.get(userId);
  if (!limit) {
    chatRateLimits.set(userId, { count: 1, resetTime: now + windowMs });
    return next();
  }

  if (now > limit.resetTime) {
    chatRateLimits.set(userId, { count: 1, resetTime: now + windowMs });
    return next();
  }

  if (limit.count >= maxRequests) {
    return res.status(429).json({ error: "Too many requests. Please wait a minute and try again." });
  }

  limit.count++;
  next();
};

app.use((req, res, next) => {
  console.log(`[Request] ${req.method} ${req.url}`);
  next();
});

app.use(express.json());

app.get("/api/test", (req, res) => {
  res.json({ status: "ok" });
});

// API: Secure Staff & Master Admin Login Gateway
app.post("/api/auth/login-staff", async (req, res) => {
  console.log("[Auth] Staff Login API called with body:", JSON.stringify(req.body));
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      console.log("[Auth] Login error: Missing credentials");
      return res.status(400).json({ error: "Email and password are required" });
    }
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Check Master Admin Credentials from Environment variables (falls back to default for fallback safety)
    const masterEmail = (process.env.MASTER_ADMIN_EMAIL || "salim@ayra.com").trim().toLowerCase();
    const masterPass1 = process.env.MASTER_ADMIN_PASSWORD_1 || "Salim@Ayra.CL0001";
    const masterPass2 = process.env.MASTER_ADMIN_PASSWORD_2 || "Salim@4170";

    if (normalizedEmail === masterEmail && (password === masterPass1 || password === masterPass2)) {
      console.log(`[Auth] Master admin login attempt for: ${normalizedEmail}`);
      const masterSession = {
        email: masterEmail,
        isMasterAdmin: true,
        allowedTabs: [
          'dashboard', 'bookings', 'booking-form', 'challans', 'pis', 'invoice-bill',
          'products-catalogue', 'banks', 'suppliers', 'conveyance', 'job-cards',
          'commercial-invoices', 'lc-documents', 'quote-builder', 'party-ledger', 'payroll', 'profile-updates'
        ],
        writeAccess: {
          dashboard: true, bookings: true, 'booking-form': true, challans: true, pis: true,
          'invoice-bill': true, 'products-catalogue': true, banks: true, suppliers: true,
          conveyance: true, 'job-cards': true, 'commercial-invoices': true, 'lc-documents': true,
          'quote-builder': true, 'party-ledger': true, payroll: true, 'profile-updates': true
        }
      };

      let customToken = "";
      const apps = admin.apps || [];
      if (apps.length) {
        // Mint Firebase Custom Token for Master Admin
        try {
            customToken = await admin.auth().createCustomToken("master-admin-salim", {
              email: masterEmail,
              isMasterAdmin: true,
              role: "admin"
            });
            console.log(`[Auth] Custom token generated successfully.`);
        } catch (authErr) {
            console.error(`[Auth] Error generating custom token:`, authErr);
            throw authErr;
        }
      } else {
        console.warn(`[Auth] No Firebase app initialized. Token will be empty.`);
      }

      return res.json({ success: true, session: masterSession, customToken });
    }

    // 2. Query Sub-operator from Firestore (using server-side Firebase Admin)
    if (!adminDb) {
      return res.status(500).json({ error: "Firebase Admin is not configured. Unable to verify sub-operator." });
    }

    const usersCol = adminDb.collection("erp_company_data").doc("shared_workspace").collection("user_accounts");
    const querySnapshot = await usersCol.where("email", "==", normalizedEmail).limit(1).get();

    if (querySnapshot.empty) {
      return res.status(401).json({ error: "No registered operator account found with this email." });
    }

    const matchedDoc = querySnapshot.docs[0];
    const userData = matchedDoc.data();
    
    // Check both legacy SHA-256 and new salted SHA-512 hashes for backwards compatibility
    const enteredLegacyHash = sha256(password);
    const enteredSaltedHash = getSaltedHash(password, normalizedEmail);

    const isLegacyMatch = userData.passwordHash === enteredLegacyHash;
    const isSaltedMatch = userData.passwordHash === enteredSaltedHash || userData.passwordHashSalted === enteredSaltedHash;

    if (isLegacyMatch || isSaltedMatch) {
      const operatorSession = {
        email: userData.email,
        isMasterAdmin: false,
        allowedTabs: userData.allowedTabs || [],
        writeAccess: userData.writeAccess || {},
        name: userData.name,
        designation: userData.designation,
        department: userData.department,
        signatureUrl: userData.signatureUrl
      };

      // Mint Firebase Custom Token for Sub-operator
      const customToken = await admin.auth().createCustomToken(matchedDoc.id, {
        email: userData.email,
        isMasterAdmin: false,
        role: "operator"
      });

      return res.json({ success: true, session: operatorSession, customToken });
    } else {
      return res.status(401).json({ error: "Incorrect password. Please try again." });
    }

  } catch (err: any) {
    console.error("Staff Login API Error:", err);
    res.status(500).json({ error: err.message || "Internal server authorization error" });
  }
});

// API: Hash password securely on server using Salt + Pepper
app.post("/api/auth/hash-password", (req, res) => {
  try {
    const { password, email } = req.body;
    if (!password || !email) {
      return res.status(400).json({ error: "Password and email are required" });
    }
    const saltedHash = getSaltedHash(password, email);
    res.json({ hash: saltedHash });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to hash password" });
  }
});

// API: AI Assistant Chat (Secured with Firebase JWT Auth & Rate Limiter)
app.post("/api/ai/chat", authenticateFirebaseUser, chatRateLimiter, async (req, res) => {
  try {
    const { prompt, context } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const systemInstruction = `You are the Acoola Trims ERP Smart AI Assistant.
You have direct knowledge of the active ERP workspace context:
- Today's date is ${new Date().toLocaleDateString('en-US')}
- Context Data: ${JSON.stringify(context || {})}

Your goal is to assist ERP operators with any inquiry, production estimation, garment trims calculation, bank or LC questions, or general help.
Provide extremely concise, helpful, and professional responses. Use Bengali or English as appropriate for the prompt.`;

    // Attempt generation with highly available models to bypass 503 errors on heavily loaded models
    const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
    let lastError: any = null;
    let textResult: string | undefined = undefined;

    for (const model of modelsToTry) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`[AI Chat] Requesting generation via ${model} (attempt ${attempt}/2)`);
          const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
              systemInstruction,
              temperature: 0.7,
            },
          });
          
          if (response && response.text) {
            textResult = response.text;
            console.log(`[AI Chat] Success with model ${model} on attempt ${attempt}`);
            break;
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`[AI Chat] Error with ${model} (attempt ${attempt}/2):`, err?.message || err);
          if (attempt < 2) {
            // Wait 1 second before retrying same model
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      }
      if (textResult) break;
    }

    if (textResult) {
      res.json({ text: textResult });
    } else {
      console.warn("[AI Chat] All cloud AI generation failed. Activating local smart FAQ fallback...");
      // Evaluate a highly helpful local fallback response based on prompt keywords to guard against 503 errors
      const query = (prompt || "").toLowerCase();
      let fallbackText = "";
      
      if (query.includes("sync") || query.includes("সিঙ্ক") || query.includes("পিসি") || query.includes("pc")) {
        fallbackText = `আসসালামু আলাইকুম! জিমেইল লগইন বা লগআউট যে কোনো অবস্থাতেই অ্যাকুলা ইআরপির সেন্ট্রাল রিয়েল-টাইম ফায়ারবেস ক্লাউড সিঙ্কিং সচল রয়েছে। 

১. **রিয়েল-টাইম সিঙ্ক**: আপনি বা অন্য কোনো অপারেটর যে কোনো ডিভাইস (বাসার পিসি বা অফিসের কম্পিউটার) থেকে ডাটা এন্ট্রি, এডিট বা ডিলিট করবেন - তা কোনো রিফ্রেশ ছাড়াই সাথে সাথে সকল কম্পিউটারে আপডেট হয়ে যাবে। 
২. **গুগল ড্রাইভ ব্যাকআপ**: জিমেইল লগইন শুধুমাত্র গুগল ড্রাইভে অতিরিক্ত ডাটা ব্যাকআপ রাখার কাজের জন্য প্রয়োজন। যাতে পিসি ক্র্যাশ করলেও ড্রাইভের 'acoola_trims_erp_backup.json' থেকে ডাটা রিকভারি করা যায়। লগআউট থাকলেও কোনো সমস্যা নেই, সেন্ট্রাল সিস্টেমের রিয়েল-টাইম সিঙ্ক সচল থাকবে।`;
      } else if (query.includes("booking") || query.includes("বুকিং") || query.includes("চালান") || query.includes("challan") || query.includes("এন্ট্রি")) {
        fallbackText = `অ্যাকুলা trims ইআরপিতে যেকোনো বুকিং, চালান বা পিআই এন্ট্রি করার নির্দেশিকা:
১. নির্দিষ্ট ট্যাবে যান এবং ডান পাশের '**নতুন যোগ করুন**' সবুজ বাটনে ক্লিক করুন।
2. ফরমের প্রয়োজনীয় তথ্যগুলো নিখুঁতভাবে ইনপুট দিয়ে '**সংরক্ষণ করুন**' বাটনে ক্লিক করুন। 
৩. সেভ করার সাথে সাথেই তা অন্যান্য সকল ডিভাইসে অটো-আপডেট হয়ে যাবে। কোনো রিফ্রেশ করার প্রয়োজন নেই।
৪. কোনো তথ্য সংশোধন বা মুছে ফেলার জন্য সংশ্লিষ্ট রেকর্ডের ডানে অ্যাকশন থেকে '**সম্পাদনা**' বা '**মুছুন**' আইকনে ক্লিক করতে পারেন।`;
      } else if (query.includes("catalog") || query.includes("ক্যাটালগ") || query.includes("প্রিন্ট") || query.includes("print")) {
        fallbackText = `প্রোডাক্ট ক্যাটালগ প্রিন্ট ভিউ গাইড:
- আপনি প্রোডাক্ট ক্যাটালগের উপরে অবস্থিত ড্রপডাউন থেকে খুব সহজে ২-কলাম বা ৩-কলাম লেআউট বেছে নিতে পারেন।
- ক্যাটালগের প্রফেশনাল ইমেজ ও সাইজ বিশদভাবে উপস্থাপনের জন্য ২-কলাম প্রিন্ট লেআউট অত্যন্ত দারুণ ও ক্লিন দেখায়।
- এছাড়া প্রিন্ট প্রিভিউতে কাস্টম কলাম উইডথ ও প্রিন্ট বাটন প্রফেশনাল হেভি-প্রিন্টিং সাপোর্ট করে।`;
      } else {
        fallbackText = `আসসালামু আলাইকুম! আমি অ্যাকুলা সফট-এর স্মার্ট এআই সহকারী। বর্তমানে রিয়েল-টাইম লাইভ ওয়ার্কস্পেস সিঙ্ক নিয়ে কোনো সাহায্য প্রয়োজন?

- **কম্পিউটার সিঙ্ক গাইড**: বাসার পিসি ও অফিসের ডাটা সিঙ্ক বুঝতে "সিঙ্ক" লিখে জিজ্ঞেস করুন।
- **বুকিং এন্ট্রি গাইড**: বুকিং বা চালান এন্ট্রি সম্পর্কে জিজ্ঞেস করুন।
- **ক্যাটালগ প্রিন্ট গাইড**: ক্যাটালগ ২-কলাম প্রিন্টিং সম্পর্কে জিজ্ঞেস করুন।`;
      }
      
      res.json({ text: fallbackText });
    }
  } catch (error: any) {
    console.error("Gemini API error after all fallbacks:", error);
    res.status(500).json({ error: error.message || "Failed to interact with Gemini AI" });
  }
});

// Setup Vite / Static Files Middleware
async function configureServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Configuring Vite Dev Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Configuring Production Static Middleware...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

configureServer().catch((err) => {
  console.error("Failed to start server:", err);
});
