const express = require('express');
const cors = require('cors');
const { BrevoClient } = require('@getbrevo/brevo');
const admin = require('firebase-admin');
const { cert } = require('firebase-admin/app'); 
const { getDatabase } = require('firebase-admin/database'); 

const app = express();

// 1. Enable CORS securely for your frontend
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// 2. Initialize Firebase Admin securely using Render Environment Variables
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: cert(serviceAccount), 
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
    console.log("Firebase Admin securely connected!");
  } catch (error) {
    console.error("Firebase Admin initialization failed:", error);
  }
} else {
  console.warn("WARNING: FIREBASE_SERVICE_ACCOUNT env variable is missing!");
}

// 3. Initialize Brevo Client securely
const BREVO_API_KEY = process.env.BREVO_API_KEY;
let brevo;
if (BREVO_API_KEY) {
  brevo = new BrevoClient({ apiKey: BREVO_API_KEY });
  console.log("Brevo API Client successfully initialized.");
} else {
  console.warn("WARNING: BREVO_API_KEY env variable is missing!");
}

// Simple health-check endpoint
app.get('/', (req, res) => {
  res.send('BirrGo OTP Backend is live and running!');
});

// Helper function to generate a secure 6-digit OTP
function generateSecureOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper to sanitize emails for Firebase paths (replacing '.' with '_')
function sanitizeEmail(email) {
  return email.toLowerCase().replace(/\./g, '_').replace(/@/g, '_at_');
}

// 4. Secure Endpoint to generate, save, and send OTP
app.post('/send-otp', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email address is required.' });
  }

  if (!brevo) {
    return res.status(500).json({ error: 'Mail dispatch services are temporarily unavailable.' });
  }

  const secureOtp = generateSecureOTP();

  try {
    // A) SAVE OTP TO FIREBASE SECURELY
    const sanitizedEmailKey = sanitizeEmail(email);
    const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes expiration

    const db = getDatabase();
    await db.ref(`otps/${sanitizedEmailKey}`).set({
      otp: secureOtp,
      expiresAt: expiresAt,
      verified: false
    });

    // B) SEND OTP EMAIL VIA BREVO
    const emailData = {
      subject: "Your OTP Verification Code",
      sender: { 
        name: process.env.BREVO_SENDER_NAME || "BirrGo Support", 
        email: process.env.BREVO_SENDER_EMAIL || "mail@birrgo.online" 
      },
      to: [{ email: email.toLowerCase() }],
      htmlContent: `
        <html>
          <body style="font-family: 'Inter', Arial, sans-serif; padding: 30px; background-color: #f9f9f9; color: #333;">
            <div style="max-width: 500px; margin: 0 auto; background: #fff; padding: 24px; border-radius: 8px; border: 1px solid #eee;">
              <h2 style="color: #9A0019; margin-top: 0;">Confirm Your Email</h2>
              <p>Welcome to BirrGo! Use the 6-digit verification code below to complete your registration:</p>
              <div style="background: #f4f4f5; padding: 16px; text-align: center; border-radius: 6px; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #9A0019;">${secureOtp}</span>
              </div>
              <p style="font-size: 12px; color: #666;">This code is active for 5 minutes. If you did not sign up for an account, you can safely ignore this email.</p>
            </div>
          </body>
        </html>
      `
    };

    const info = await brevo.sendTransacEmail(emailData);
    console.log("OTP Email successfully sent.", info);
    res.status(200).json({ success: true, message: 'OTP sent successfully.' });
  } catch (error) {
    console.error("Error processing OTP:", error);
    res.status(500).json({ error: 'Failed to process OTP request.' });
  }
});

// 5. NEW: Secure Endpoint to handle OneSignal Broadcasts
app.post('/api/broadcast', async (req, res) => {
  const { appId, restKey, title, message } = req.body;

  // Validate incoming data
  if (!appId || !restKey || !title || !message) {
    return res.status(400).json({ error: 'Missing required fields (appId, restKey, title, message).' });
  }

  try {
    // Send request to OneSignal API
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Basic ${restKey}`
      },
      body: JSON.stringify({
        app_id: appId,
        headings: { en: title },
        contents: { en: message },
        included_segments: ['Subscribed Users'] // Targets all active subscribers
      })
    });

    const data = await response.json();

    // Check if OneSignal accepted the notification
    if (response.ok) {
      console.log("Push notification broadcasted successfully.");
      res.status(200).json({ success: true, data });
    } else {
      console.error("OneSignal rejected the payload:", data);
      res.status(response.status).json({ error: data.errors ? data.errors.join(', ') : 'OneSignal API Error' });
    }
  } catch (error) {
    console.error("OneSignal Broadcast Network Error:", error);
    res.status(500).json({ error: 'Failed to communicate with OneSignal server.' });
  }
});

// 6. Start the server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
