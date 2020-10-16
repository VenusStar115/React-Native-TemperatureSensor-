// @flow

import { put, call, select } from 'redux-saga/effects';
import RNFetchBlob from 'rn-fetch-blob';
import {
  Device,
  Service,
  Characteristic,
  Descriptor,
  BleError,
  BleErrorCode,
} from 'react-native-ble-plx';
import { log, logError } from './Reducer';

export type SensorTagTestMetadata = {
  id: string,
  title: string,
  execute: (device: Device) => Generator<any, boolean, any>,
};

export const SensorTagTests: { [string]: SensorTagTestMetadata } = {
  READ_ALL_CHARACTERISTICS: {
    id: 'READ_ALL_CHARACTERISTICS',
    title: 'Read all characteristics',
    execute: readAllCharacteristics,
  },
  READ_TEMPERATURE: {
    id: 'READ_TEMPERATURE',
    title: 'Read temperature',
    execute: readTemperature,
  },
};

function* readAllCharacteristics(device: Device): Generator<*, boolean, *> {
  try {
    const services: Array<Service> = yield call([device, device.services]);
    for (const service of services) {
      yield put(log('Found service: ' + service.uuid));
      const characteristics: Array<Characteristic> = yield call([
        service,
        service.characteristics,
      ]);
      for (const characteristic of characteristics) {
        yield put(log('Found characteristic: ' + characteristic.uuid));

        if (characteristic.uuid === '00002a02-0000-1000-8000-00805f9b34fb')
          continue;

        const descriptors: Array<Descriptor> = yield call([
          characteristic,
          characteristic.descriptors,
        ]);

        for (const descriptor of descriptors) {
          yield put(log('* Found descriptor: ' + descriptor.uuid));
          const d: Descriptor = yield call([descriptor, descriptor.read]);
          yield put(log('Descriptor value: ' + (d.value || 'null')));
          if (d.uuid === '00002902-0000-1000-8000-00805f9b34fb') {
            yield put(log('Skipping CCC'));
            continue;
          }
          try {
            yield call([descriptor, descriptor.write], 'AAA=');
          } catch (error) {
            const bleError: BleError = error;
            if (bleError.errorCode === BleErrorCode.DescriptorWriteFailed) {
              yield put(log('Cannot write to: ' + d.uuid));
            } else {
              throw error;
            }
          }
        }

        yield put(log('Found characteristic: ' + characteristic.uuid));
        if (characteristic.isReadable) {
          yield put(log('Reading value...'));
          var c = yield call([characteristic, characteristic.read]);
          yield put(log('Got base64 value: ' + c.value));
          if (characteristic.isWritableWithResponse) {
            yield call(
              [characteristic, characteristic.writeWithResponse],
              c.value,
            );
            yield put(log('Successfully written value back'));
          }
        }
      }
    }
  } catch (error) {
    yield put(logError(error));
    return false;
  }

  return true;
}

function* readTemperature(device: Device): Generator<*, boolean, *> {
  console.log('dargon');

  const state = yield select();
  yield put(log('Read temperature'));

  try {
    const services: Array<Service> = yield call([device, device.services]);
    for (const service of services) {
      const characteristics: Array<Characteristic> = yield call([
        service,
        service.characteristics,
      ]);
      for (const characteristic of characteristics) {
        if (characteristic.uuid === '00002a02-0000-1000-8000-00805f9b34fb')
          continue;
        let sensor_output: any;
        // read data and send it to firebase
        if (characteristic.uuid === '6e400002-b5a3-f393-e0a9-e50e24dcca9e') {
          yield put(log('Found characteristic: ' + characteristic.uuid));
          yield put(log('Reading value...'));
          function btoa(data) {
            return new Buffer(data, 'binary').toString('base64');
          }
          let data = new Buffer(4);
          data.writeUInt32LE(Math.floor(Date.now() / 1000));
          if (characteristic.isWritableWithoutResponse) {
            yield put(log('Found Writable Value...'));
            yield call(
              [characteristic, characteristic.writeWithoutResponse],
              data.toString('base64'),
            );
            console.log(Math.floor(Date.now() / 1000));
            yield put(log('Successfully updated timestamp'));
          }
        }
        // read data and send it to firebase
        if (characteristic.uuid === '6e400003-b5a3-f393-e0a9-e50e24dcca9e') {
          yield put(log('Found characteristic: ' + characteristic.uuid));
          yield put(log('Reading value...'));
          function atob(data) {
            return new Buffer(data, 'base64').toString('binary');
          }
          var total_output = [];
          const subscription = characteristic.monitor((error, res) => {
            if (res != null) {
              const base64ToHex = (str) => {
                // console.log(str);
                const raw = atob(str);
                let result = '';
                for (let i = 0; i < raw.length; i++) {
                  const hex = raw.charCodeAt(i).toString(16);
                  result += (hex.length === 2 ? hex : '0' +
                    hex);
                }
                return result.toUpperCase();
              }
              const transformChunk = (rData) => {
                let firstData = '';
                let secondData = '';
                let thirdData = '';
                for (let i = rData.length - 1; i >= 0; i -= 2) {
                  let temp = rData[i - 1] + rData[i];
                  if (i > 11) thirdData += temp;
                  else if (i > 7) secondData += temp;
                  else firstData += temp;
                }
                return {
                  timestamp: parseInt(firstData, 16),
                  adc: parseInt(secondData, 16) * (-0.023781) + 73.72825,
                  reserved: parseInt(thirdData, 16)
                }
              }
              const transform = (string) => {
                const hexArray = base64ToHex(string)
                let responseArray = [];
                const { length } = hexArray;
                for (let i = 0; i < length; i += 16) {
                  responseArray.push(transformChunk(hexArray.substr(i, 16)))
                  transformChunk(hexArray.substr(i, 16))
                }
                return responseArray;
              }
              sensor_output = base64ToHex(res.value.toString());
              var processed_output = transform(res.value);
              total_output.push(processed_output);
              let i;
              // console.log('Length Processed Output: ' + processed_output.length)
              for (i = 0; i < processed_output.length; i++) {
                // status_sensor = processed_output.length
                sensor_output = processed_output[i].adc
                sensor_output = -0.023781 * sensor_output + 73.72825;
                const item = {
                  adc_val: sensor_output.toFixed(2),
                  timestamp_val: processed_output[i].timestamp
                }
                if (i === 0) {
                  // console.log('timestamp: ' + item.timestamp_val)
                }
              }
              if (processed_output.length.toString() === '1') {
                var out_total_output = [].concat.apply([], total_output);
                out_total_output = JSON.stringify([out_total_output]);
                RNFetchBlob.config({
                  trusty: true
                }).fetch('PUT', 'https://quibit.io/v1/sensor/sensorTEST002/insert', {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json'
                }, {
                  ...out_total_output,
                  // location: state.location,
                },
                ).then(response => response.json())
                  .then(result => console.log(JSON.stringify(result)))
                  .catch(error => console.log('error', error));
                console.log('exit called!');
                subscription.remove();
              }
            } else {
              console.log('Disconnected! Please stop!');
            }
          },
          );
        }
      }
    }
  } catch (error) {
    yield put(logError(error));
    return false;
  }
  yield put(log('Successfully written to Firebase!'));
  return true;
}
