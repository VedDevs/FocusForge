#include "config.h"
#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <time.h>

// ─── Debug Macro ─────────────────────────────────────────────────────────────
#if DEBUG_ENABLED
  #define LOG(x)        Serial.println(x)
  #define LOGF(f, ...)  Serial.printf(f, __VA_ARGS__)
#else
  #define LOG(x)
  #define LOGF(f, ...)
#endif

// ─── User Table ──────────────────────────────────────────────────────────────
// Centralised user registry — add more users here if needed
struct User {
  const char* id;
  const char* name;
  const byte  uid[4];
  const byte  uidSize;
};

const User USERS[] = {
  { USER1_ID, USER1_NAME, USER1_UID, USER1_UID_SIZE },
  { USER2_ID, USER2_NAME, USER2_UID, USER2_UID_SIZE },
};
const int USER_COUNT = sizeof(USERS) / sizeof(USERS[0]);

// ─── State Machine ───────────────────────────────────────────────────────────
enum SystemState {
  STATE_IDLE,            // Waiting for first card
  STATE_WAITING_VERIFY,  // First card scanned — waiting for verifier
  STATE_SUCCESS,         // Verified — sending to Firebase
  STATE_FAIL             // Timeout — no verifier arrived
};

SystemState currentState = STATE_IDLE;

// ─── Runtime State ───────────────────────────────────────────────────────────
String        claimerID    = "";   // e.g. "vedant"
String        claimerName  = "";   // e.g. "Vedant"
unsigned long claimStartMs = 0;
unsigned long lastScanMs   = 0;
String        lastScanCard = "";

// ─── Objects ─────────────────────────────────────────────────────────────────
MFRC522           rfid(PIN_RFID_SS, PIN_RFID_RST);
LiquidCrystal_I2C lcd(LCD_I2C_ADDRESS, LCD_COLS, LCD_ROWS);

// ═════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════

// ── LCD ──────────────────────────────────────────────────────────────────────
void lcdPrint(String line1, String line2 = "") {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(line1.substring(0, LCD_COLS));
  if (line2.length() > 0) {
    lcd.setCursor(0, 1);
    lcd.print(line2.substring(0, LCD_COLS));
  }
}

// ── Buzzer ────────────────────────────────────────────────────────────────────
void beep(int freq, int durationMs) {
  if (PIN_BUZZER < 0) return;  // disabled in config
  ledcSetup(0, freq, 8);
  ledcAttachPin(PIN_BUZZER, 0);
  ledcWrite(0, 128);
  delay(durationMs);
  ledcWrite(0, 0);
  ledcDetachPin(PIN_BUZZER);
}

void beepSuccess() {
  beep(1047, 120); delay(60);
  beep(1319, 120); delay(60);
  beep(1568, 200);
}

void beepFail() {
  beep(300, 400);
}

void beepScan() {
  beep(800, 60);
}

// ── UID Helpers ───────────────────────────────────────────────────────────────
String uidToString(byte* uid, byte size) {
  String s = "";
  for (byte i = 0; i < size; i++) {
    if (uid[i] < 0x10) s += "0";
    s += String(uid[i], HEX);
  }
  return s;
}

// Returns pointer to matching User, or nullptr if unknown card
const User* getUserFromUID(byte* uid, byte size) {
  for (int i = 0; i < USER_COUNT; i++) {
    bool match = true;
    for (byte b = 0; b < USERS[i].uidSize && b < size; b++) {
      if (uid[b] != USERS[i].uid[b]) { match = false; break; }
    }
    if (match) return &USERS[i];
  }
  return nullptr;
}

// ── Timestamp ─────────────────────────────────────────────────────────────────
String getISOTimestamp() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) return "1970-01-01T00:00:00Z";
  char buf[25];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(buf);
}

// ── Idle LCD helper ───────────────────────────────────────────────────────────
void showIdleScreen() {
  lcdPrint("Scan Card to", "Claim Points");
}

void showVerifyScreen() {
  unsigned long remaining = (VERIFY_TIMEOUT_MS - (millis() - claimStartMs)) / 1000;
  lcdPrint("Scan Other Card", String(remaining) + "s left");
}

// ═════════════════════════════════════════════════════════════════════════════
// FIREBASE
// ═════════════════════════════════════════════════════════════════════════════

bool sendPointsToFirebase(String userID, int points, String timestamp) {

  // ── Atomic increment via Firestore fieldTransform ─────────────────────────
  String commitUrl =
    "https://firestore.googleapis.com/v1/projects/" +
    String(FIREBASE_PROJECT_ID) +
    "/databases/(default)/documents:commit?key=" +
    String(FIREBASE_API_KEY);

  String docPath =
    "projects/" + String(FIREBASE_PROJECT_ID) +
    "/databases/(default)/documents/users/" + userID;

  String body =
    "{\"writes\":[{\"transform\":{"
    "\"document\":\"" + docPath + "\","
    "\"fieldTransforms\":["
      "{\"fieldPath\":\"points\","
       "\"increment\":{\"integerValue\":" + String(points) + "}},"
      "{\"fieldPath\":\"dailyClaims\","
       "\"increment\":{\"integerValue\":1}},"
      "{\"fieldPath\":\"lastClaim\","
       "\"setToServerValue\":\"REQUEST_TIME\"}"
    "]}}]}";

  HTTPClient http;
  http.begin(commitUrl);
  http.addHeader("Content-Type", "application/json");
  int code = http.POST(body);
  bool ok = (code == 200);

  LOGF("Firebase commit: %d\n", code);
  if (!ok) LOG("Error: " + http.getString());
  http.end();

  // ── Log transaction ───────────────────────────────────────────────────────
  if (ok) {
    String txUrl =
      "https://firestore.googleapis.com/v1/projects/" +
      String(FIREBASE_PROJECT_ID) +
      "/databases/(default)/documents/transactions?key=" +
      String(FIREBASE_API_KEY);

    String txBody =
      "{\"fields\":{"
      "\"user\":{\"stringValue\":\"" + userID + "\"},"
      "\"type\":{\"stringValue\":\"earn\"},"
      "\"points\":{\"integerValue\":" + String(points) + "},"
      "\"timestamp\":{\"stringValue\":\"" + timestamp + "\"}"
      "}}";

    HTTPClient http2;
    http2.begin(txUrl);
    http2.addHeader("Content-Type", "application/json");
    int txCode = http2.POST(txBody);
    LOGF("Transaction log: %d\n", txCode);
    http2.end();
  }

  return ok;
}

// ═════════════════════════════════════════════════════════════════════════════
// SETUP
// ═════════════════════════════════════════════════════════════════════════════

void setup() {
  Serial.begin(SERIAL_BAUD);

  // ── LCD ──────────────────────────────────────────────────────────────────
  Wire.begin(PIN_LCD_SDA, PIN_LCD_SCL);
  lcd.init();
  lcd.backlight();
  lcdPrint(" FocusForge v1", "  Starting...");
  delay(1500);

  // ── RFID ─────────────────────────────────────────────────────────────────
  SPI.begin();
  rfid.PCD_Init();
  LOG("MFRC522 ready.");

  // ── WiFi ──────────────────────────────────────────────────────────────────
  lcdPrint("WiFi Connecting", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 30) {
    delay(500);
    Serial.print(".");
    tries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    LOGF("\nWiFi OK: %s\n", WiFi.localIP().toString().c_str());
    lcdPrint("WiFi Connected!", WiFi.localIP().toString());
    delay(1200);

    // ── NTP time sync ──────────────────────────────────────────────────────
    configTime(GMT_OFFSET_SEC, DST_OFFSET_SEC, NTP_SERVER);
    lcdPrint("Syncing time...", "");
    delay(2000);
    LOG("Time synced.");
  } else {
    LOG("WiFi FAILED");
    lcdPrint("WiFi Failed!", "Check config.h");
    delay(2500);
  }

  showIdleScreen();
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN LOOP
// ═════════════════════════════════════════════════════════════════════════════

void loop() {
  unsigned long now = millis();

  // ── Verification timeout check ────────────────────────────────────────────
  if (currentState == STATE_WAITING_VERIFY) {
    if (now - claimStartMs > VERIFY_TIMEOUT_MS) {
      LOG("Verification timeout.");
      currentState = STATE_FAIL;
      beepFail();
      lcdPrint("No Verification", "Timed Out!");
      delay(2500);
      currentState  = STATE_IDLE;
      claimerID     = "";
      claimerName   = "";
      showIdleScreen();
    }
  }

  // ── No card present ────────────────────────────────────────────────────────
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) return;

  // ── Read card ─────────────────────────────────────────────────────────────
  byte*        uid    = rfid.uid.uidByte;
  byte         size   = rfid.uid.size;
  String       cardID = uidToString(uid, size);
  const User*  user   = getUserFromUID(uid, size);

  LOGF("Card: %s → %s\n", cardID.c_str(), user ? user->id : "unknown");

  // ── Unknown card ──────────────────────────────────────────────────────────
  if (!user) {
    rfid.PICC_HaltA();
    beepFail();
    lcdPrint("Unknown Card!", "Not registered");
    delay(1800);
    (currentState == STATE_IDLE) ? showIdleScreen() : showVerifyScreen();
    return;
  }

  // ── Debounce ──────────────────────────────────────────────────────────────
  if (cardID == lastScanCard && (now - lastScanMs) < SCAN_DEBOUNCE_MS) {
    LOG("Debounced.");
    rfid.PICC_HaltA();
    return;
  }
  lastScanCard = cardID;
  lastScanMs   = now;

  beepScan();

  // ── State Machine ─────────────────────────────────────────────────────────
  switch (currentState) {

    // ── IDLE: first card starts a claim ────────────────────────────────────
    case STATE_IDLE: {
      claimerID    = String(user->id);
      claimerName  = String(user->name);
      claimStartMs = millis();
      currentState = STATE_WAITING_VERIFY;

      lcdPrint(claimerName + " Claiming", "Scan Other Card");
      LOGF("%s claiming — waiting for verifier\n", user->name);
      break;
    }

    // ── WAITING_VERIFY: need the other card ────────────────────────────────
    case STATE_WAITING_VERIFY: {

      // Same card → reject
      if (String(user->id) == claimerID) {
        LOG("Self-verify rejected.");
        lcdPrint("Same Card!", "Need Other Card");
        delay(2000);
        showVerifyScreen();
        break;
      }

      // Different card → verified!
      LOGF("%s verified %s\n", user->name, claimerName.c_str());
      currentState = STATE_SUCCESS;
      lcdPrint("Verified! +" + String(POINTS_PER_CLAIM), claimerName + " earns!");

      // Anti-cheat random delay
      delay(ANTI_CHEAT_DELAY_MIN + random(ANTI_CHEAT_DELAY_RND));

      // Send to Firebase
      lcdPrint("Saving...", "Please wait");
      String ts = getISOTimestamp();
      bool ok = sendPointsToFirebase(claimerID, POINTS_PER_CLAIM, ts);

      if (ok) {
        beepSuccess();
        lcdPrint("+" + String(POINTS_PER_CLAIM) + " Points!", claimerName + " earned!");
        LOG("Firebase OK.");
      } else {
        beepFail();
        lcdPrint("Firebase Error!", "Check WiFi");
        LOG("Firebase FAILED.");
      }

      delay(3000);

      // Reset
      currentState = STATE_IDLE;
      claimerID    = "";
      claimerName  = "";
      showIdleScreen();
      break;
    }

    default: break;
  }

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
}
