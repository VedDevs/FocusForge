/*
FoucusForge
Users - USer1
      - User 2

Cross card verification anti cheat system
wiring:-
* MFRC522 → ESP32
 *   SDA  → GPIO 5
 *   SCK  → GPIO 18
 *   MOSI → GPIO 23
 *   MISO → GPIO 19
 *   RST  → GPIO 4
 *   3.3V → 3.3V
 *   GND  → GND
 
* LCD → ESP32
 SDA → GPIO 21
 SCL → GPIO 22
 VCC → VIN
 GND → GND
*/

#include <SPI.h>
#include <MFRC522>