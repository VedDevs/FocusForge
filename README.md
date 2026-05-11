# ⚡ FocusForge

> A hardware-powered study accountability system — earn points by studying together, spend them in a real reward store.

Built with **ESP32 + RFID + Firebase + Netlify** by Vedant for [Hack Club](https://hackclub.com).

---

## What Is It?

FocusForge makes studying feel like a game. Two people each carry an RFID card. When you want to claim study points, you tap your card on a physical device — but your friend has to tap their card too within 25 seconds to verify you. No solo tapping. No cheating. Points go straight to the cloud and show up live on a web dashboard where you can spend them on real rewards.

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   [User1 taps card]  →  LCD: "user1 Claiming..."      │
│   [user2 taps card] →  LCD: "+30 Points! ✓"          │
│                        →  Firebase updated instantly    │
│                        →  Website shows new balance     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Features

**Hardware**
- RFID card tap to claim points
- Cross-card verification (anti-cheat — you can't verify yourself)
- 25-second verification timeout
- LCD shows real-time status messages
- Buzzer sounds on success / failure
- Points sent to Firebase via WiFi instantly

**Web App**
- 📊 Live dashboard — points update in real-time
- 🏪 Reward store — redeem points for custom rewards
- 🏆 Leaderboard — see who's winning
- 📜 Transaction history — full earn/spend log
- ⚙️ Manage page — add/edit/delete rewards, bulk upload via CSV or JSON

---

## Project Structure

```
focusforge/
│
├── firmware/
│   ├── config.h           ← ⭐ All hardware settings live here
│   └── focusforge.ino     ← Main ESP32 code (don't need to edit this)
│
├── web/
│   ├── config.js          ← ⭐ All web settings live here
│   ├── index.html         ← Website structure
│   ├── style.css          ← Styling
│   └── script.js          ← Firebase logic
│
└── docs/
    ├── setup-guide.md     ← Full beginner setup guide
    └── bill-of-materials.md
```

> ⭐ You only need to edit `config.h` (hardware) and `config.js` (web). Everything else is hands-off.

---

## Hardware

| Component | Specification |
|-----------|--------------|
| ESP32 Dev Board | ESP32-WROOM-32 |
| RFID Reader | MFRC522, 13.56 MHz SPI |
| RFID Cards | ISO 14443A × 2 |
| LCD Display | 16×2 I2C (PCF8574 backpack) |
| Passive Buzzer | 5V, optional |

**Wiring summary:**

```
MFRC522  →  ESP32          LCD I2C  →  ESP32
SDA      →  GPIO 5         SDA      →  GPIO 21
SCK      →  GPIO 18        SCL      →  GPIO 22
MOSI     →  GPIO 23        VCC      →  5V
MISO     →  GPIO 19        GND      →  GND
RST      →  GPIO 4
3.3V     →  3.3V  ⚠️ NOT 5V
GND      →  GND
```

---

## Quick Start

### 1 — Clone the repo

```bash
git clone https://github.com/yourusername/focusforge.git
cd focusforge
```

### 2 — Configure hardware

Open `firmware/config.h` and fill in:

```cpp
#define WIFI_SSID          "your wifi name"
#define WIFI_PASSWORD      "your wifi password"
#define FIREBASE_PROJECT_ID   "your-project-id"
#define FIREBASE_API_KEY      "your-api-key"

// Your card UIDs (find them by running the DumpInfo example sketch)
#define USER1_UID   {0xED, 0xBC, 0x31, 0x2F}
#define USER2_UID   {0xF2, 0xF6, 0xD6, 0x19}
```

### 3 — Flash the ESP32

Install these libraries via Arduino Library Manager:
- `MFRC522` by GithubCommunity
- `LiquidCrystal I2C` by Frank de Brabander

Then:
- Board: **ESP32 Dev Module**
- Upload `firmware/focusforge.ino`

### 4 — Configure web app

Open `web/config.js` and paste your Firebase config:

```javascript
export const firebaseConfig = {
  apiKey: "...",
  projectId: "...",
  // etc.
};
```

### 5 — Deploy website

Drag the `web/` folder onto [netlify.com/drop](https://app.netlify.com/drop) — live in 30 seconds.

---

## Anti-Cheat System

| Mechanism | Description |
|-----------|-------------|
| Cross-verification | Card A claims → only Card B can verify |
| Self-verify block | Same card cannot approve itself — hardcoded |
| Debounce | Same card tapped twice within 1.5s is ignored |
| Timeout | Verifier must tap within 25 seconds or claim is cancelled |
| Random delay | 800–1200ms random delay before verification is accepted |
| Atomic writes | Points incremented atomically in Firebase — no race conditions |

---

## Adding More Users

1. Add a new entry in `firmware/config.h`:
   ```cpp
   #define USER3_ID    "username"
   #define USER3_NAME  "Display Name"
   #define USER3_UID   {0x00, 0x00, 0x00, 0x00}
   ```
2. Add to the `USERS[]` array in `focusforge.ino`
3. Add a Firestore document in the `users` collection with the same ID
4. Add to the `USERS` array in `web/config.js`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Hardware | ESP32, Arduino C++ |
| RFID | MFRC522 library |
| Database | Google Firebase Firestore (REST API) |
| Frontend | Vanilla JS, ES Modules, Firebase SDK v10 |
| Hosting | Netlify |

---

## License

MIT — fork it, remix it, build your own version. If you make something cool, share it on [Hack Club Scrapbook](https://scrapbook.hackclub.com)!

---

*Made with ☕ and too many Serial.println() calls*
