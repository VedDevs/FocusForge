# FocusForge — Build Your Own Study Points System

> A hardware + web project where two people earn points by studying together, verified using RFID cards, and redeem them in an online reward store.

**Built for Hack Club** · Made by Vedant · ESP32 + Firebase + Netlify

---

## What Is This?

FocusForge is a gamified study accountability system. Here's how it works in plain English:

1. You and a friend each get an **RFID card** (like a key card)
2. When you want to claim study points, you **tap your card** on a device built with an ESP32 microcontroller
3. Your friend must **tap their card within 25 seconds** to verify you actually studied — you can't cheat by tapping your own card twice
4. If verified → **+30 points** get saved to a cloud database instantly
5. You can spend those points in a **web-based reward store** — redeem things like "30 min Game Time" or "Skip a Chore"

Everything is real hardware + a real live website. No apps to install.

---

## What You'll Need

### Hardware (buy once)

| Part | Why you need it | Approx. cost |
|------|----------------|-------------|
| ESP32 Dev Board | The brain — runs your code and connects to WiFi | ₹350 |
| MFRC522 RFID Reader | Reads the tap cards | ₹120 |
| 2× RFID Cards (or key fobs) | One for each user | ₹40 |
| 16×2 I2C LCD Display | Shows messages like "Scan Other Card" | ₹130 |
| Jumper wires + breadboard | Connecting everything | ₹80 |

**Total: ~₹720**

### Software (all free)

- [Arduino IDE](https://www.arduino.cc/en/software) — to program the ESP32
- A Google account — for Firebase (the database)
- A Netlify account — to host the website (free)
- A text editor like [VS Code](https://code.visualstudio.com/) — to edit the web files

### Files in This Project

```
FocusForge/
├── esp32_rfid.ino   ← Code that runs on the hardware
├── index.html       ← The website
├── style.css        ← Website styling
└── script.js        ← Website logic (talks to database)
```

---

## Part 1 — Wire Up the Hardware

You don't need to solder anything. Use a breadboard and jumper wires.

### RFID Reader → ESP32

```
MFRC522 pin    →    ESP32 pin
───────────────────────────────
SDA            →    GPIO 5
SCK            →    GPIO 18
MOSI           →    GPIO 23
MISO           →    GPIO 19
RST            →    GPIO 4
3.3V           →    3.3V   ⚠️ NOT 5V — it will break
GND            →    GND
```

> ⚠️ The MFRC522 only works at **3.3V**. Connecting it to 5V will damage it permanently.

### LCD Display → ESP32

```
LCD I2C pin    →    ESP32 pin
───────────────────────────────
SDA            →    GPIO 21
SCL            →    GPIO 22
VCC            →    5V  (the Vin pin on ESP32)
GND            →    GND
```

> 💡 The LCD uses I2C — only 2 data wires needed (SDA + SCL). Much simpler than older LCD wiring.

---

## Part 2 — Set Up the Database (Firebase)

Firebase is Google's free cloud database. Your ESP32 and website both talk to it.

### Step 2.1 — Create a Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Add project"**
3. Name it anything — e.g. `FocusForge`
4. Turn off Google Analytics (you don't need it) → click **"Create project"**
5. Wait ~30 seconds for it to set up, then click **"Continue"**

### Step 2.2 — Create the Database

1. In the left sidebar, click **Build → Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in test mode"** → click Next

   > Test mode means anyone can read/write. Fine for now — you can lock it down later.

4. For location, pick **`asia-south1`** (Mumbai) if you're in India → click **"Enable"**

Wait about 30 seconds. Your database is now live.

### Step 2.3 — Add the User Documents

You need to create entries for both users in the database manually the first time.

1. In Firestore, click **"Start collection"**
2. Collection ID: `users` → click Next
3. Document ID: `vedant` (type it exactly, lowercase)
4. Add these fields one by one:

   | Field name | Type | Value |
   |------------|------|-------|
   | `name` | string | `Vedant` |
   | `points` | number | `0` |
   | `dailyClaims` | number | `0` |
   | `lastClaim` | string | *(leave empty)* |

5. Click **Save**
6. Now click **"Add document"** again in the `users` collection
7. Document ID: `akshaya`
8. Same fields, but `name` = `Akshaya`
9. Click **Save**

### Step 2.4 — Add Your First Rewards

1. Go back to the database root → click **"Start collection"**
2. Collection ID: `rewards` → click Next
3. Document ID: click **"Auto-ID"**
4. Add these fields:

   | Field | Type | Example value |
   |-------|------|---------------|
   | `name` | string | `30 min Game Time` |
   | `cost` | number | `150` |
   | `stock` | number | `5` |

5. Click **Save** → repeat for as many rewards as you want

> 💡 You can also add rewards from the website later using the **Manage Store** page — much easier than doing it here!

### Step 2.5 — Get Your Firebase Config

This is the "address" your website uses to find the database.

1. Click the **gear icon** (top left) → **Project Settings**
2. Scroll down to **"Your apps"** section
3. Click the **`</>`** icon to add a web app
4. Name it `FocusForge Web` → click **"Register app"**
5. You'll see a block of code that looks like this — **copy it somewhere**, you'll need it soon:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "FocusForge-xxxxx.firebaseapp.com",
  projectId: "FocusForge-xxxxx",
  storageBucket: "FocusForge-xxxxx.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:xxxxxxxxxxxxxxxx"
};
```

Also note down just the `apiKey` value — you'll need it for the hardware code too.

---

## Part 3 — Program the ESP32

### Step 3.1 — Install Arduino IDE

1. Download from [arduino.cc/en/software](https://www.arduino.cc/en/software)
2. Install and open it

### Step 3.2 — Add ESP32 Board Support

Arduino IDE doesn't know about ESP32 by default. Add it:

1. Go to **File → Preferences**
2. In the "Additional Boards Manager URLs" box, paste:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. Click OK
4. Go to **Tools → Board → Boards Manager**
5. Search for `esp32` → install the one by **Espressif Systems**
6. Wait for it to install (takes a few minutes)

### Step 3.3 — Install Required Libraries

Go to **Tools → Manage Libraries** and install these one by one:

| Library name to search | Install the one by |
|------------------------|-------------------|
| `MFRC522` | GithubCommunity |
| `LiquidCrystal I2C` | Frank de Brabander |

### Step 3.4 — Find Your RFID Card UIDs

Before you can use the cards, you need to know their unique IDs.

1. Open Arduino IDE → **File → Examples → MFRC522 → DumpInfo**
2. Select your board: **Tools → Board → ESP32 Dev Module**
3. Select the port: **Tools → Port → (whichever COM port appeared)**
4. Upload the sketch (click the → arrow)
5. Open **Tools → Serial Monitor**, set baud rate to **115200**
6. Tap each card on the reader — you'll see output like:

   ```
   Card UID: ED BC 31 2F
   ```

7. Note down both UIDs — you'll put them in the code

### Step 3.5 — Configure the Code

Open `esp32_rfid.ino` in Arduino IDE. Find and replace these lines near the top:

```cpp
// Your WiFi network
const char* WIFI_SSID     = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// From Firebase Project Settings
const char* FIREBASE_PROJECT_ID = "FocusForge-xxxxx";   // your project ID
const char* FIREBASE_API_KEY    = "AIzaSyXXXXXXXXX"; // your API key
```

Then find the UID section and replace with your actual card UIDs:

```cpp
// Replace with your actual card UIDs from Step 3.4
const byte VEDANT_UID[]  = { 0xED, 0xBC, 0x31, 0x2F };  // User 1's card
const byte AKSHAYA_UID[] = { 0xF2, 0xF6, 0xD6, 0x19 };  // User 2's card
```

> The format `0xED` means "the hex value ED". Just copy from Serial Monitor and add `0x` before each pair.

### Step 3.6 — Upload to ESP32

1. Make sure your ESP32 is plugged in via USB
2. Select **Tools → Board → ESP32 Dev Module**
3. Select **Tools → Port → (your COM/tty port)**
4. Click the **Upload button** (→ arrow)
5. If upload fails, hold the **BOOT button** on the ESP32 while clicking upload

Once uploaded, the LCD should show:
```
  Study Points
  System v1.0
```

Then it connects to WiFi and shows:
```
Scan Card to
Claim Points
```

**It's working!** Test it by tapping one card, then the other within 25 seconds. The LCD should show `+30 Points!`

---

## Part 4 — Set Up the Website

### Step 4.1 — Add Your Firebase Config to the Website

Open `script.js` in any text editor. Find this section near the top:

```javascript
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  ...
};
```

Replace the entire block with the config you copied in Step 2.5.

### Step 4.2 — Deploy to Netlify

Netlify hosts your website for free in under 2 minutes.

1. Go to [app.netlify.com](https://app.netlify.com) and sign up (free)
2. On the dashboard, you'll see a box that says **"Deploy manually"** or **"drag and drop"**
3. Open your file explorer and select your **project folder** (the one with index.html, style.css, script.js)
4. Drag the entire folder into that box on Netlify
5. Wait ~10 seconds → Netlify gives you a live URL like:
   ```
   https://FocusForge-a3f7k.netlify.app
   ```
6. Open that URL on your phone or computer — your reward store is live!

> 💡 To update the site later, just drag the folder onto Netlify again. It redeploys automatically.

---

## Part 5 — Using the System

### Earning Points (Hardware)

1. **User 1 taps their card** → LCD shows `Vedant Claim... / Scan Other Card`
2. **User 2 taps their card within 25 seconds** → LCD shows `Verified! / +30 Points`
3. Points are saved to Firebase instantly — visible on the website in real-time

**Anti-cheat rules (built into the hardware):**
- You cannot tap your own card twice to verify yourself
- If no one verifies within 25 seconds, the claim is cancelled automatically
- Rapid repeated taps from the same card are ignored

### Spending Points (Website)

1. Open your Netlify website URL
2. Click **"Store"** in the top navigation
3. Select whose points to use (Vedant or Akshaya)
4. Click **"Redeem"** on any reward you can afford
5. Points are deducted instantly, transaction is logged

### Adding Rewards (Website — Manage Page)

You can add rewards without touching Firebase Console:

1. Click **"⚙ Manage"** in the top navigation
2. **Add one item:** fill in the name, cost, and stock → click "Add Item"
3. **Add many items at once:** use Bulk Upload — paste JSON or upload a CSV file

CSV format example:
```csv
name,cost,stock
30 min Game Time,150,5
Skip One Chore,200,3
Movie Night Pick,250,2
Choose Dinner,100,10
```

JSON format example:
```json
[
  { "name": "30 min Game Time", "cost": 150, "stock": 5 },
  { "name": "Skip One Chore",   "cost": 200, "stock": 3 }
]
```

---

## Adapting This for Your Own Group

This project is built for two users (Vedant + Akshaya), but you can adapt it:

### Change the user names
In `esp32_rfid.ino`, change the UID arrays and the name strings.
In Firestore, rename the documents from `vedant`/`akshaya` to your own names.
In `script.js`, update the two places that reference `"vedant"` and `"akshaya"`.

### Change how many points per claim
In `esp32_rfid.ino`:
```cpp
const int POINTS_PER_CLAIM = 30;  // change this number
```

### Change the verification timeout
```cpp
const int VERIFY_TIMEOUT_MS = 25000;  // 25 seconds — change to whatever you want
```

### Add more users
This requires changing the hardware code to support more UIDs and adding more Firestore user documents. Each new user needs their own RFID card.

---

## Troubleshooting

### LCD shows nothing / blank
- Double-check SDA → GPIO 21 and SCL → GPIO 22
- Your LCD might have I2C address `0x3F` instead of `0x27`. In `esp32_rfid.ino`, find `LiquidCrystal_I2C lcd(0x27, 16, 2)` and change `0x27` to `0x3F`
- To find your LCD's address, upload the **I2C Scanner** sketch (search online — it's short)

### Card not detected / reader doesn't work
- MFRC522 must use **3.3V only** — check this first
- Recheck SPI wiring: SDA→5, SCK→18, MOSI→23, MISO→19, RST→4
- Try moving the card closer and holding it still for 1–2 seconds

### "Firebase commit response: 403"
- Your Firestore security rules have expired (test mode lasts 30 days)
- Go to Firebase Console → Firestore → Rules → change the expiry date or switch to `allow read, write: if true;`

### Points verified on LCD but not showing on website
- Check Serial Monitor — look for the commit response code
- 200 = success, 400 = bad request, 403 = rules issue
- Make sure the Firestore document IDs are exactly `vedant` and `akshaya` (lowercase)

### Website is blank / nothing loads
- Open browser DevTools (F12) → Console tab — look for red errors
- Make sure you replaced ALL placeholder values in `script.js` with your real Firebase config
- Make sure your Firestore database exists and has the `users` collection

### Upload to ESP32 fails
- Hold the **BOOT** button on the ESP32 while clicking Upload, release after upload starts
- Try a different USB cable (some cables are charge-only, not data)
- Check that the correct port is selected under Tools → Port

---

## How the Anti-Cheat Works (Technical)

For the curious — here's what prevents cheating:

| Mechanism | What it does |
|-----------|-------------|
| **Cross-verification** | Card A claims → only Card B can verify. The ESP32 stores who claimed and rejects the same card. |
| **Self-verify block** | Hardcoded: `if (user == claimerUser) → reject`. No way around it in software. |
| **Debounce (1.5s)** | The same card scanned twice within 1.5 seconds is ignored entirely — prevents "double tap" tricks. |
| **Timeout (25s)** | If the verifier doesn't scan in time, the claim is cancelled. No points for half a verification. |
| **Random delay** | A small random 800–1200ms delay before accepting verification — prevents mechanical timing exploits. |
| **Atomic DB writes** | Points are incremented in the database atomically — no race condition if both users claim at the exact same time. |

---

## Project Structure Reference

```
FocusForge/
│
├── esp32_rfid.ino       Hardware code
│   ├── WiFi + NTP setup
│   ├── RFID scan loop
│   ├── State machine (IDLE → VERIFY → SUCCESS/FAIL)
│   └── Firebase REST API calls
│
├── index.html           Website structure (5 pages)
│   ├── Dashboard        Live points for both users
│   ├── Store            Reward grid + redeem buttons
│   ├── Leaderboard      Who's winning
│   ├── History          All earn/spend logs
│   └── Manage           Add/edit/delete rewards, bulk upload
│
├── style.css            Dark terminal-style design
│
└── script.js            Firebase integration
    ├── Real-time listeners (onSnapshot)
    ├── Redeem logic (runTransaction — atomic)
    ├── Bulk upload (writeBatch)
    └── Admin: add, edit stock, delete rewards
```

---

## Credits & License

Built by **Vedant** for Hack Club.

Feel free to fork, remix, and build your own version. If you make something cool with it, share it with the Hack Club community!

**Stack:** Arduino C++ · Google Firebase Firestore · Vanilla JS (ES Modules) · Netlify