# Bluetooth LE TNC Proof of Concept

This tiny project is a Bluetooth LE APRS-IS gateway to demonstrate the
principal approach. It depends on [bleno](https://github.com/sandeepmistry/bleno)
and nodejs.

The basic idea is as follows:

 * Smartphone connects to BLE peripheral with well-known Service UUID
 * Smartphone transmits packets by WRITE to characteristic 0x0001
 * Smartphone is informed about incoming packets by NOTIFY on 0x0002
 * Smartphone can read full packets by READ from 0x0002

This implementation is using APRS-IS with a static range filter near SFO to
simulate packets, and you need to supply your callsign and passcode to
transmit.

## Installation

Install the prerequisites. On Debian:

        apt-get install libbluetooth-dev nodejs-legacy npm

Import bleno from git submodule into the repository and build it:

        git submodule init
        git submodule update
        npm install

Run as root:

	nodejs ble-tnc.js <callsign> <passcode>

## Limitations

Unfortunately, NOTIFY only allows to transmit up to MTU-2 bytes, which is 150
on iOS and 20 on Android - insufficient for APRS-IS. Therefore, the phone
needs to read the full characteristic using READ.

This code is using the TNC2 packet format and relays APRS-IS comments to the
smartphone. A proper implementation should use the KISS packet format.

The current implementation will "lose" packets if they are not READ before the
next packet comes in via IS.  It will also stop working once the APRS-IS
connection is interrupted.

## License

This program is provided under the WTFPL (Do What the Fuck You Want to Public
License). Have fun!
