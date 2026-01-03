const admin = require("firebase-admin");
require("dotenv").config();

// ------------------------------------------------------------------
// FIREBASE ADMIN INITIALIZATION
// This file connects the backend to the Firebase Database & Auth
// ------------------------------------------------------------------

try {
    // Construct the credentials object from environment variables
    const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Replace escaped newlines with actual newlines to avoid parsing errors
        privateKey: process.env.FIREBASE_PRIVATE_KEY 
            ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
            : undefined
    };

    // Initialize the Firebase App
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }

} catch (error) {
    console.error("Firebase Connection Error:", error.message);
    console.error("Hint: Check your .env file specificially the FIREBASE_PRIVATE_KEY");
}

// Export the database (Firestore) and auth services for use in server.js
const db = admin.firestore();
const auth = admin.auth();

module.exports = { db, auth };