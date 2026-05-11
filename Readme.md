# FocusForge - Hardware module

This hardware module is made for **FocusForge**, A gamified smart study tracker powered by **ESP32**. It can manage RFID Based User Authentication and can track focus sessions real-time Firebase data logging and enables real-time interaction between physical hardware and software

---

# Features

* RFID-based user login/logout
* 16x2 I2C LCD interface
* ESP32-powered smart controller
* Study session tracking
* Real-time status display
* Expandable hardware setup
* Designed for gamified productivity systems
* Cross Verification for logging the XP

---

# Components Used

| Component | Quantity |
| -------------------- | -------- |
| ESP32 Dev Board | 1 |
| MFRC522 RFID Reader | 1 |
| RFID Cards/Tags | 2+ |
| 16x2 LCD I2C Display | 1 |
| Breadboard | 1 |
| Jumper Wires | Multiple |
| USB Cable | 1 |

---

# Hardware overview

Users tap their **cards** on the **RFID reader** to:

 * Identify users
 * Log Study Hours
 * Sync progress with the Firebase
 * Sync progress with the Software Dashboard
 * and display session information on the LCD.

Then the **LCD** shows:
 * User Name
 * XP total
 * Leaderboard
 * And Connection Messages

---

# Wiring Diagram

## RFID RC522 → ESP32

| RC522 Pin | ESP32 Pin |
| --------- | --------- |
| SDA | GPIO 5 |
| SCK | GPIO 18 |
| MOSI | GPIO 23 |
| MISO | GPIO 19 |
| RST | GPIO 4 |
| GND | GND |
| 3.3V | 3.3V |

---

## LCD I2C → ESP32

| LCD Pin | ESP32 Pin |
| ------- | --------- |
| SDA | GPIO 21 |
| SCL | GPIO 22 |
| VCC | 5V (Via VIN)|
| GND | GND |

---

# Libraries Required

Install these Arduino libraries:

* MFRC522
* LiquidCrystal_I2C
* WiFi
* WebSockets / Firebase libraries (optional)

# Folder Structure

```bash
hardware/
│
├── Esp32/
│    └── main.ino
│
├── Software(Website)/
│    ├── index.html
│    ├── style.css
│     └── main.js
│
├── docs/
│   └── setup-guide.md
│
└── README.md
```
---

# Setup info:
Go into 
```bash
hardware/
│
├── docs/
    └── setup-guide.md
```
---
# How It Works

1. User taps the RFID card.
2. ESP32 reads the UID.
3. LCD displays user status.
4. Other User Taps the card to verify that has the other user  completed the study session or not.
5. Data syncs to the software dashboard.
6. XP/streak system updates in real time.
7. Use Your collected XP to buy things from the store

---

# Future Improvements

* Buzzer notifications
* Mobile app sync
* Focus analytics
* NFC support
* MQTT real-time communication
* OLED upgrade

---

# Tech Stack

* ESP32
* Arduino IDE
* C++
* RFID (MFRC522)
* I2C LCD
* WiFi Communication

---
# Project Goal

FocusForge aims to make studying more interactive and rewarding by combining physical hardware with gamified productivity software.

---
# Contributors

Built with ❤️ for Hack Club competitions and student productivity projects By **Vedant**.
