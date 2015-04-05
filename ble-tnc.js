var util = require('util');

var bleno = require('bleno');
var net = require('net');

// this was just auto-generated
var UUID = '27eb6a5e55884e16a465-36c182fde66f';

function cmdLineParam(index, defval) {
  return (process.argv.length > index) ? process.argv[index] : defval;
}

var CALLSIGN = cmdLineParam(2, "N0CALL");
var PASSCODE = cmdLineParam(3, -1);

// TNC UUID
function TNID(short_id) {
  // the postfix was just auto-generated
  return "0000" + short_id + "ba2a46c9ae4901b0961f68bb";
}

var BlenoPrimaryService = bleno.PrimaryService;
var BlenoCharacteristic = bleno.Characteristic;
var BlenoDescriptor = bleno.Descriptor;


console.log('BLE TNC ("' + UUID + '"): ' + CALLSIGN);

var aprsis = net.connect({host:"euro.aprs2.net", port:14580},
    function() {
      console.log("Connecte to APRS-IS");
      sendIS(util.format("user %s pass %d vers BLE-TNC 23.42 filter r/37.4/-122/100", CALLSIGN, PASSCODE));
    });
aprsis.on('data', function(data) {
  console.log("<<< " + data.toString().replace(/\n$/, ''));
  last_packet = data;
  if (sendRF)
    sendRF(data);
});
aprsis.on('end', function() {
  console.log('disconnected from server');
  aprsis = null;
});

function sendIS(packet) {
  console.log(">>> %s", packet);
  if (aprsis)
    aprsis.write(packet + "\n");
}

var sendRF = null;
var last_packet = null;

////////////////////////////// 0001 SendPacket //////////////////////////////
var SendPacket = function() {
  SendPacket.super_.call(this, {
    uuid: TNID('0001'),
    properties: ['write', 'writeWithoutResponse']
  });
};

util.inherits(SendPacket, BlenoCharacteristic);

SendPacket.prototype.onWriteRequest = function(data, offset, withoutResponse, callback) {
  var cid = data.toString();
  console.log('SetCardNo write request: ' + cid + ' ' + offset + ' ' + withoutResponse);

  callback(this.RESULT_SUCCESS);
  bleno.updateRssi();
};


////////////////////////////// 0002 ReceivePacket //////////////////////////////
var ReceivePacket = function() {
  ReceivePacket.super_.call(this, {
    uuid: TNID('0002'),
    properties: ['read', 'notify']
  });
};

util.inherits(ReceivePacket, BlenoCharacteristic);

ReceivePacket.prototype.onReadRequest = function(offset, callback) {
  if (last_packet)
    callback(this.RESULT_SUCCESS, last_packet.slice(offset));
  else
    callback(this.RESULT_UNLIKELY_ERROR, null);
  return;
};

ReceivePacket.prototype.onSubscribe = function(maxValueSize, updateValueCallback) {
  console.log('ReceivePacket: subscribed for %d', maxValueSize);
  sendRF = updateValueCallback;
  return;
};


ReceivePacket.prototype.onUnsubscribe = function(maxValueSize, updateValueCallback) {
  console.log('ReceivePacket: unsubscribed');
  sendRF = null;
  return;
};

////////////////////////////// 0003 GetCallsign //////////////////////////////
var GetCallsign = function() {
  GetCallsign.super_.call(this, {
    uuid: TNID('0003'),
    properties: ['read'],
    value: CALLSIGN
  });
};

util.inherits(GetCallsign, BlenoCharacteristic);

function TncService() {
  TncService.super_.call(this, {
    uuid: TNID('0000'),
    characteristics: [
      new SendPacket(),
      new ReceivePacket(),
      new GetCallsign(),
    ]
  });
}

util.inherits(TncService, BlenoPrimaryService);

bleno.on('stateChange', function(state) {
  console.log('on -> stateChange: ' + state);

  if (state === 'poweredOn') {
    bleno.startAdvertising('BLE TNC', [UUID]);
  } else if (state === 'poweredOff') {
    exec('Turning on BLE:', 'btmgmt power on; btmgmt connectable on');
  } else if (state === 'unsupported') {
    console.log('Please kill l2cap-ble and restart Beacon+!');
    process.exit(1);
  } else {
    bleno.stopAdvertising();
  }
});

// Linux only events /////////////////
bleno.on('accept', function(clientAddress) {
  console.log('on -> accept, client: ' + clientAddress);
});

bleno.on('disconnect', function(clientAddress) {
  console.log('on -> disconnect, client: ' + clientAddress);
});

bleno.on('rssiUpdate', function(rssi) {
  console.log('on -> rssiUpdate: ' + rssi);
});
//////////////////////////////////////

bleno.on('advertisingStart', function(error) {
  console.log('on -> advertisingStart: ' + (error ? 'error ' + error : 'success'));

  if (!error) {
    bleno.setServices([
      new TncService()
    ]);
  }
});

bleno.on('advertisingStop', function() {
  console.log('on -> advertisingStop');
});

bleno.on('servicesSet', function() {
  console.log('on -> servicesSet');
});


//////////////////////////////////////////////

