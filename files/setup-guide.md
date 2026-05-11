# FocusForge — Setup Guide

> **Who is this for?** Complete beginners. If you've never touched an ESP32, Firebase, or Netlify before, this guide walks you through every single click. No experience assumed.

---

## What You're Building

A two-part system:

1. **A physical device** — an ESP32 microcontroller with an RFID reader and a small LCD screen. Two people each tap their card to claim study points, with the second person acting as a verifier so you can't cheat alone.

2. **A website** — a live dashboard hosted on Netlify where you can see points, redeem rewards, check the leaderboard, and manage the store. Updates in real-time the moment a card is tapped.

---

## What You Need

### Parts to Buy

| Part | Notes | Approx. Cost |
|------|-------|-------------|
| ESP32 Dev Board | Any 38-pin ESP32 works. "NodeMCU ESP32" or "DOIT DevKit V1" are common | ₹350 |
| MFRC522 RFID Reader | Comes with 1 white card + 1 key fob usually | ₹120 |
| 2× RFID Cards | ISO 14443A format, 13.56 MHz. Extra cards if needed | ₹40 |
| 16×2 I2C LCD | **Must have I2C backpack** (PCF8574 chip) pre-soldered — ask the seller | ₹130 |
| Passive Buzzer | Optional but satisfying. Make sure it's **passive** not active | ₹20 |
| Breadboard | 830 tie-point | ₹90 |
| Jumper Wires | Male-to-male, 20cm pack of 40 | ₹60 |
| USB Cable | Micro-USB, **data capable** (not charge-only) | ₹80 |

**Total: ~₹890** (without buzzer and power adapter)

### Software to Install (all free)

| Software | Download Link | Why |
|----------|--------------|-----|
| Arduino IDE | [arduino.cc/en/software](https://www.arduino.cc/en/software) | Programs the ESP32 |
| VS Code | [code.visualstudio.com](https://code.visualstudio.com) | Edits the website files |

### Accounts to Create (all free)

| Account | Link | Why |
|---------|------|-----|
| Google Account | (you probably have one) | For Firebase |
| Netlify | [app.netlify.com](https://app.netlify.com) | Hosts the website |

---

## Files in This Project

```
focusforge/
│
├── firmware/
│   ├── config.h          ← ⭐ YOU EDIT THIS — all hardware settings
│   └── focusforge.ino    ← Main hardware code (no need to edit)
│
├── web/
│   ├── config.js         ← ⭐ YOU EDIT THIS — all website settings
│   ├── index.html        ← Website pages
│   ├── style.css         ← Website design
│   └── script.js         ← Website logic (no need to edit)
│
└── docs/
    ├── setup-guide.md    ← This file
    └── bill-of-materials.md
```

> You only need to edit **two files** — `config.h` and `config.js`. Everything else is already written.

---

## Step 1 — Wire the Hardware

No soldering needed. Use the breadboard and jumper wires.

### RFID Reader → ESP32

```
MFRC522 pin    →    ESP32 pin
────────────────────────────────
SDA            →    GPIO 5
SCK            →    GPIO 18
MOSI           →    GPIO 23
MISO           →    GPIO 19
RST            →    GPIO 4
3.3V           →    3.3V
GND            →    GND
```

> ⚠️ **Important:** The MFRC522 runs on **3.3V only**. Connecting it to 5V will permanently break it. Double-check this wire before powering on.

### LCD Display → ESP32

```
LCD I2C pin    →    ESP32 pin
────────────────────────────────
SDA            →    GPIO 21
SCL            →    GPIO 22
VCC            →    5V  (the Vin pin on ESP32)
GND            →    GND
```

> 💡 The LCD only needs 4 wires because it uses I2C — a protocol that carries data over just 2 wires (SDA + SCL).

### Buzzer → ESP32 (optional)

```
Buzzer pin     →    ESP32 pin
────────────────────────────────
+  (longer leg) →   GPIO 15
-  (shorter leg) →  GND
```

> If you don't want the buzzer, set `PIN_BUZZER -1` in `config.h` to disable it.

---

## Step 2 — Set Up Firebase (the Database)

Firebase is Google's free cloud database. Both the hardware and the website talk to it.

### 2.1 Create a Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Add project"**
3. Name it — e.g. `focusforge`
4. Turn off Google Analytics (not needed) → click **"Create project"**
5. Wait ~20 seconds → click **"Continue"**

### 2.2 Create the Database

1. In the left sidebar click **Build → Firestore Database**
2. Click **"Create database"**
3. Select **"Start in test mode"** → click Next

   > Test mode means no login is required to read/write — perfect for getting started. You can add security rules later.

4. Choose a location — pick **`asia-south1`** (Mumbai) for India → click **"Enable"**

### 2.3 Create User Documents

You need to create a record for each person in the database.

1. In Firestore, click **"+ Start collection"**
2. Collection ID: **`users`** → click Next
3. Document ID: **`user1`** *(lowercase, no spaces)*
4. Add these 4 fields:

   | Field name | Type | Value |
   |------------|------|-------|
   | `name` | string | `user1` |
   | `points` | number | `0` |
   | `dailyClaims` | number | `0` |
   | `lastClaim` | string | *(leave blank)* |

5. Click **Save**
6. In the `users` collection, click **"+ Add document"**
7. Document ID: **`akshaya`**
8. Same 4 fields, `name` = `Akshaya`
9. Click **Save**

### 2.4 Add Some Rewards

1. Go back to the database root → **"+ Start collection"**
2. Collection ID: **`rewards`** → click Next
3. Document ID: click **"Auto-ID"**
4. Add 3 fields:

   | Field | Type | Example |
   |-------|------|---------|
   | `name` | string | `30 min Game Time` |
   | `cost` | number | `150` |
   | `stock` | number | `5` |

5. Click Save → repeat for more rewards

> 💡 You can also add rewards directly from the website later using the **Manage** page — much easier than doing it here.

**Some reward ideas to get started:**

| Reward | Suggested Cost |
|--------|---------------|
| 30 min Game Time | 150 |
| Skip One Chore | 200 |
| Choose Dinner | 100 |
| Movie Night Pick | 250 |
| Extra Screen Time | 180 |
| Stay Up 30 min Late | 300 |

### 2.5 Get Your Firebase Config (save this — you'll need it twice)

1. Click the **⚙ gear icon** (top left) → **Project Settings**
2. Scroll down to **"Your apps"**
3. Click **`</>`** to add a web app
4. Name it `FocusForge Web` → click **"Register app"**
5. You'll see a block of code like this — **copy the whole thing**:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "focusforge-xxxxx.firebaseapp.com",
  projectId: "focusforge-xxxxx",
  storageBucket: "focusforge-xxxxx.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:xxxxxxxxxxxxxxxx"
};
```

Save this in a notepad. You need:
- The **entire block** → goes into `web/config.js`
- Just the **`projectId`** value → goes into `firmware/config.h`
- Just the **`apiKey`** value → goes into `firmware/config.h`

---

## Step 3 — Find Your Card UIDs

Every RFID card has a unique ID number. You need to find yours before configuring the firmware.

### 3.1 Install Arduino IDE + ESP32 Support

1. Download and install [Arduino IDE](https://www.arduino.cc/en/software)
2. Open Arduino IDE → **File → Preferences**
3. Find "Additional Boards Manager URLs" and paste this:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Click OK → **Tools → Board → Boards Manager**
5. Search `esp32` → install **"esp32 by Espressif Systems"**
6. Wait for it to finish (3–5 minutes)

### 3.2 Install Libraries

**Tools → Manage Libraries** — search and install each:

| Search for | Install the one by |
|------------|-------------------|
| `MFRC522` | GithubCommunity |
| `LiquidCrystal I2C` | Frank de Brabander |

### 3.3 Run the UID Scanner

1. In Arduino IDE: **File → Examples → MFRC522 → DumpInfo**
2. Plug in your ESP32 via USB
3. **Tools → Board → ESP32 Dev Module**
4. **Tools → Port → COM__ ** (whichever one appeared after plugging in)
5. Click the **Upload** button (→ arrow)

   > If upload fails: hold the **BOOT** button on the ESP32 while clicking Upload, release after it starts uploading.

6. **Tools → Serial Monitor** → set baud rate to **115200**
7. Tap your first card on the reader — you'll see:
   ```
   Card UID: ED BC 31 2F
   ```
8. Write it down. Tap the second card. Write that UID down too.

---

## Step 4 — Configure the Firmware

Open `firmware/config.h` in any text editor. It looks like this — fill in your values:

```cpp
// ─── WiFi ───────────────────────────────
#define WIFI_SSID        "YourWiFiName"
#define WIFI_PASSWORD    "YourWiFiPassword"

// ─── Firebase ───────────────────────────
#define FIREBASE_PROJECT_ID  "focusforge-xxxxx"   // your projectId
#define FIREBASE_API_KEY     "AIzaSyXXXXXXXX"     // your apiKey

// ─── User 1 ─────────────────────────────
#define USER1_ID    "user1"        // must match Firestore document ID
#define USER1_NAME  "user1"        // shown on LCD
#define USER1_UID   {0xED, 0xBC, 0x31, 0x2F}   // from Step 3.3

// ─── User 2 ─────────────────────────────
#define USER2_ID    "user2"
#define USER2_NAME  "user2"
#define USER2_UID   {0xF2, 0xF6, 0xD6, 0x19}   // from Step 3.3
```

> **How to format the UID:** If Serial Monitor showed `ED BC 31 2F`, write it as `{0xED, 0xBC, 0x31, 0x2F}` — add `0x` before each pair and separate with commas.

**Optional settings you can also change:**

```cpp
#define POINTS_PER_CLAIM    30      // how many points per verified tap
#define VERIFY_TIMEOUT_MS   25000   // seconds verifier has (25000 = 25s)
#define PIN_BUZZER          15      // set to -1 to disable buzzer
#define LCD_I2C_ADDRESS     0x27    // try 0x3F if LCD shows nothing
```

### Upload the Firmware

1. Open `firmware/focusforge.ino` in Arduino IDE
2. Make sure Board is **ESP32 Dev Module** and the right Port is selected
3. Click **Upload**
4. LCD should show:
   ```
   FocusForge v1
   Starting...
   ```
   Then connect to WiFi and show:
   ```
   Scan Card to
   Claim Points
   ```

**Test it:** Tap one card → LCD shows `[Name] Claiming / Scan Other Card`. Tap the other card → LCD shows `+30 Points! ✓`

If it works — your hardware is done! 🎉

---

## Step 5 — Configure the Website

Open `web/config.js` in VS Code. Replace the placeholder values with your Firebase config from Step 2.5:

```javascript
export const firebaseConfig = {
  apiKey:            "AIzaSyXXXXXXXXXXXXXXXXX",
  authDomain:        "focusforge-xxxxx.firebaseapp.com",
  projectId:         "focusforge-xxxxx",
  storageBucket:     "focusforge-xxxxx.appspot.com",
  messagingSenderId: "000000000000",
  appId:             "1:000000000000:web:xxxxxxxxxxxxxxxx"
};
```

You can also customise user display settings here:

```javascript
export const USERS = [
  {
    id:     "user1",       // must match Firestore document ID exactly
    name:   "user1",
    avatar: "V",
    color:  "#c8f261",      // change to any hex color you like
  },
  {
    id:     "user2",
    name:   "user2",
    avatar: "A",
    color:  "#a259ff",
  },
];
```

---

## Step 6 — Deploy the Website

1. Go to [app.netlify.com](https://app.netlify.com) → Sign up (free)
2. On the dashboard, look for the drag-and-drop deploy box
3. Open your file explorer and find the **`web/`** folder
4. Drag the entire `web/` folder onto the Netlify deploy box
5. Wait ~15 seconds → you get a live URL:
   ```
   https://focusforge-a3f7k.netlify.app
   ```
6. Open it on your phone or computer

Your reward store is live. 🚀

> **To update later:** just drag the `web/` folder onto Netlify again — it redeploys automatically.

---

## Step 7 — Add Rewards from the Website

Now that everything is live, you don't need to touch Firebase Console to add rewards:

1. Go to your Netlify URL
2. Click **⚙ Manage** in the navigation bar
3. Use **"Add Single Item"** for one reward at a time
4. Use **"Bulk Upload"** to paste a JSON array or upload a CSV:

**CSV format:**
```csv
name,cost,stock
30 min Game Time,150,5
Skip One Chore,200,3
Movie Night Pick,250,2
```

**JSON format:**
```json
[
  { "name": "30 min Game Time", "cost": 150, "stock": 5 },
  { "name": "Skip One Chore",   "cost": 200, "stock": 3 }
]
```

---

## How It All Works Together

```
  [Card tap]
      ↓
  ESP32 reads UID
      ↓
  State machine decides: first card? → enter claim mode
                         second card? → verify + award points
      ↓
  HTTP POST to Firebase Firestore REST API
  (atomic increment — no double-counting possible)
      ↓
  Website gets real-time update via onSnapshot listener
      ↓
  Dashboard, leaderboard, history all update instantly
```

---

## Troubleshooting

### LCD shows nothing / blank screen

- Your LCD's I2C address might be `0x3F` instead of `0x27`
- In `config.h`, change: `#define LCD_I2C_ADDRESS 0x3F`
- To confirm your address: search "I2C Scanner Arduino" and upload that sketch — it prints the address

### Card not detected

- MFRC522 must use **3.3V** — this is the most common mistake
- Recheck SPI wiring: SDA→5, SCK→18, MOSI→23, MISO→19, RST→4

### Upload to ESP32 fails

- Hold **BOOT** button while clicking Upload, release after it starts
- Try a different USB cable — many phone cables are charge-only with no data wires
- Check the correct Port is selected under Tools → Port

### Firebase commit response: 403

- Firestore test mode has expired (it lasts 30 days)
- Firebase Console → Firestore → **Rules** tab → change the date or set:
  ```
  allow read, write: if true;
  ```
  then click **Publish**

### Points verified on LCD but website doesn't update

- Check Serial Monitor for the commit response code
  - `200` = success
  - `400` = request is malformed (check UIDs and project ID in config.h)
  - `403` = security rules blocking (see above)
- Make sure Firestore document IDs are exactly `user1` and `user2` (lowercase, no spaces)

### Website is blank

- Open browser DevTools (press **F12**) → **Console** tab → look for red error messages
- Most common cause: placeholder values still in `config.js` (e.g. `"YOUR_API_KEY"`)

---

## Adapting for Your Own Group

### Change usernames

1. In `firmware/config.h` — update `USER1_ID`, `USER1_NAME`, `USER2_ID`, `USER2_NAME` and UIDs
2. In Firestore — create documents with the new IDs in the `users` collection
3. In `web/config.js` — update the `USERS` array with the new `id` and `name`

### Change points per claim

In `firmware/config.h`:
```cpp
#define POINTS_PER_CLAIM 50   // change to any number
```

### Change verification timeout

```cpp
#define VERIFY_TIMEOUT_MS 30000   // 30 seconds
```

### Add more than 2 users

1. Add `USER3_ID`, `USER3_NAME`, `USER3_UID` defines in `config.h`
2. Add a new entry to the `USERS[]` array in `focusforge.ino`
3. Create the Firestore document
4. Add to `USERS` array in `web/config.js`

Each additional user needs their own physical RFID card.

---

## Understanding the Anti-Cheat

The system is designed so you genuinely cannot cheat alone:

| What the code does | Why |
|--------------------|-----|
| Stores who claimed first | So it knows which card to reject |
| Checks `if (user == claimerID) → reject` | You literally cannot scan your own card to verify |
| Resets after 25 seconds | Can't just wait and scan whenever — has to be now |
| 1.5s debounce on same card | Can't rapidly tap the same card trying to confuse it |
| Random 800–1200ms delay | Prevents mechanical timing exploits |
| Atomic Firebase write | Even if both users claim at the exact same millisecond, points can't be doubled |

---

*Made for Hack Club by **Vedant** · MIT License ·* **Go build something cool**
