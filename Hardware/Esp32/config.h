#pragma once

// ══════════════════════════════════════════════════════════════
//            FocusForge — Hardware Configuration                
//   Edit ONLY this file to set up the project for your use    
// 

// ─── WiFi ────────────────────────────────────────────────────────────────────
#define WIFI_SSID          "YOUR_WIFI_NAME"
#define WIFI_PASSWORD      "YOUR_WIFI_PASSWORD"

// ─── Firebase ────────────────────────────────────────────────────────────────
#define FIREBASE_PROJECT_ID   "YOUR_PROJECT_ID"
#define FIREBASE_API_KEY      "YOUR_API_KEY"

// ─── Pin Definitions ─────────────────────────────────────────────────────────
#define PIN_RFID_SS       5     // MFRC522 SDA
#define PIN_RFID_RST      4     // MFRC522 RST
#define PIN_LCD_SDA       21    
#define PIN_LCD_SCL       22    
#define PIN_BUZZER        15    // Passive buzzer (optional — set to -1 to disable)

// ─── LCD ─────────────────────────────────────────────────────────────────────
#define LCD_I2C_ADDRESS   0x27  // Try 0x3F if display is blank
#define LCD_COLS          16
#define LCD_ROWS          2

// ─── Points & Timing ─────────────────────────────────────────────────────────
#define POINTS_PER_CLAIM      30      
#define VERIFY_TIMEOUT_MS     25000   
#define SCAN_DEBOUNCE_MS      1500    
#define ANTI_CHEAT_DELAY_MIN  800     
#define ANTI_CHEAT_DELAY_RND  400     

// ─── NTP / Time ──────────────────────────────────────────────────────────────
#define NTP_SERVER        "pool.ntp.org"
#define GMT_OFFSET_SEC    19800   // IST = UTC+5:30 → 5.5 * 3600 = 19800
#define DST_OFFSET_SEC    0       

// ─── User 1 ──────────────────────────────────────────────────────────────────
#define USER1_ID          "User1"           // Firestore document ID (lowercase)
#define USER1_NAME        "User1"           // Display name shown on LCD
#define USER1_UID         {0xED, 0xBC, 0x31, 0x2F}
#define USER1_UID_SIZE    4

// ─── User 2 ──────────────────────────────────────────────────────────────────
#define USER2_ID          "User2"
#define USER2_NAME        "User2"
#define USER2_UID         {0xF2, 0xF6, 0xD6, 0x19}
#define USER2_UID_SIZE    4

// ─── Serial Debug ─────────────────────────────────────────────────────────────
#define SERIAL_BAUD       115200
#define DEBUG_ENABLED     true    
