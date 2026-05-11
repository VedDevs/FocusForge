// ╔══════════════════════════════════════════════════════════════
//            FocusForge — Web Configuration                      
//     Edit ONLY this file to configure the web app              
// 

// ─── Firebase Config ─────────────────────────────────────────────────────────
export const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

// ─── Users ───────────────────────────────────────────────────────────────────
// Must match Firestore document IDs exactly (lowercase)
export const USERS = [
  {
    id:     "User1",       // Firestore document ID
    name:   "User1",       // Display name
    avatar: "u1",            // Single letter shown in avatar circle
    color:  "#c8f261",      // Accent color (lime)
  },
  {
    id:     "User2",
    name:   "User2",
    avatar: "u2",
    color:  "#a259ff",      // Accent color (violet)
  },
];

// ─── App Settings ─────────────────────────────────────────────────────────────
export const APP_NAME        = "FocusForge";
export const POINTS_PER_CLAIM = 30;           // Must match firmware config.h

// ─── Reward Store Icons ───────────────────────────────────────────────────────
export const REWARD_ICONS = [
  "🎮","🍕","🎬","📚","🎵","⚽","🏆","🍦","🎁","✈️","💻","🎯"
];
