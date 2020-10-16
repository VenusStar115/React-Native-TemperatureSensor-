// @flow

import { State, Device, BleError } from 'react-native-ble-plx';

export type Action =
  | LogAction
  | ClearLogsAction
  | ConnectAction
  | DisconnectAction
  | UpdateConnectionStateAction
  | BleStateUpdatedAction
  | SensorTagFoundAction
  | ForgetSensorTagAction
  | SetLocationAction
  | SetIdAction
  | ExecuteTestAction
  | TestFinishedAction;

export type LogAction = {|
  type: 'LOG',
    message: string,
|};

export type ClearLogsAction = {|
  type: 'CLEAR_LOGS',
|};

export type ConnectAction = {|
  type: 'CONNECT',
    device: Device,
|};

export type DisconnectAction = {|
  type: 'DISCONNECT',
|};

export type UpdateConnectionStateAction = {|
  type: 'UPDATE_CONNECTION_STATE',
    state: $Keys < typeof ConnectionState >,
|};

export type BleStateUpdatedAction = {|
  type: 'BLE_STATE_UPDATED',
    state: $Keys < typeof State >,
|};

export type SensorTagFoundAction = {|
  type: 'SENSOR_TAG_FOUND',
    device: Device,
|};

export type ForgetSensorTagAction = {|
  type: 'FORGET_SENSOR_TAG',
|};

export type SetLocationAction = {|
  type: 'SET_LOCATION',
|};

export type SetIdAction = {|
  type: 'SET_ID',
|};

export type ExecuteTestAction = {|
  type: 'EXECUTE_TEST',
    id: string,
|};

export type TestFinishedAction = {|
  type: 'TEST_FINISHED',
|};

export type ReduxState = {
  logs: Array<string>,
  activeError: ?BleError,
  activeSensorTag: ?Device,
  connectionState: $Keys<typeof ConnectionState>,
  currentTest: ?string,
  bleState: $Keys<typeof State>,
  location: string,
  macId: string,
};

export const ConnectionState = {
  SCANNING: 'SCANNING',
  DISCONNECTED: 'DISCONNECTED',
  CONNECTING: 'CONNECTING',
  DISCOVERING: 'DISCOVERING',
  CONNECTED: 'CONNECTED',
  DISCONNECTING: 'DISCONNECTING',
};

export const initialState: ReduxState = {
  bleState: State.Unknown,
  activeError: null,
  activeSensorTag: null,
  connectionState: ConnectionState.DISCONNECTED,
  currentTest: null,
  logs: [],
  location: '',
  id: '',
};

export function log(message: string): LogAction {
  return {
    type: 'LOG',
    message,
  };
}

export function logError(error: BleError) {
  return log(
    'ERROR: ' +
    error.message +
    ', ATT: ' +
    (error.attErrorCode || 'null') +
    ', iOS: ' +
    (error.iosErrorCode || 'null') +
    ', android: ' +
    (error.androidErrorCode || 'null') +
    ', reason: ' +
    (error.reason || 'null'),
  );
}

export function clearLogs(): ClearLogsAction {
  return {
    type: 'CLEAR_LOGS',
  };
}

export function connect(device: Device): ConnectAction {
  return {
    type: 'CONNECT',
    device,
  };
}

export function updateConnectionState(
  state: $Keys<typeof ConnectionState>,
): UpdateConnectionStateAction {
  return {
    type: 'UPDATE_CONNECTION_STATE',
    state,
  };
}

export function disconnect(): DisconnectAction {
  return {
    type: 'DISCONNECT',
  };
}

export function bleStateUpdated(
  state: $Keys<typeof State>,
): BleStateUpdatedAction {
  return {
    type: 'BLE_STATE_UPDATED',
    state,
  };
}

export function sensorTagFound(device: Device): SensorTagFoundAction {
  return {
    type: 'SENSOR_TAG_FOUND',
    device,
  };
}

export function forgetSensorTag(): ForgetSensorTagAction {
  return {
    type: 'FORGET_SENSOR_TAG',
  };
}

export function setLocation(location: string): SetLocationAction {
  return {
    type: 'SET_LOCATION',
    location
  };
}

export function setId(id: string): SetIdAction {
  return {
    type: 'SET_ID',
    id
  };
}

export function executeTest(id: string): ExecuteTestAction {
  return {
    type: 'EXECUTE_TEST',
    id,
  };
}

export function testFinished(): TestFinishedAction {
  return {
    type: 'TEST_FINISHED',
  };
}

export function reducer(
  state: ReduxState = initialState,
  action: Action,
): ReduxState {
  switch (action.type) {
    case 'LOG':
      return { ...state, logs: [action.message, ...state.logs] };
    case 'CLEAR_LOGS':
      return { ...state, logs: [] };
    case 'UPDATE_CONNECTION_STATE':
      return {
        ...state,
        connectionState: action.state,
        logs: ['Connection state changed: ' + action.state, ...state.logs],
      };
    case 'BLE_STATE_UPDATED':
      return {
        ...state,
        bleState: action.state,
        logs: ['BLE state changed: ' + action.state, ...state.logs],
      };
    case 'SENSOR_TAG_FOUND':
      if (state.activeSensorTag) return state;
      return {
        ...state,
        activeSensorTag: action.device,
        logs: ['SensorTag found: ' + action.device.id, ...state.logs],
      };
    case 'FORGET_SENSOR_TAG':
      return {
        ...state,
        activeSensorTag: null,
      };
    case 'SET_LOCATION':
      return {
        ...state,
        location: action.location,
      };
    case 'SET_ID':
      return {
        ...state,
        macId: action.id,
      };
    case 'EXECUTE_TEST':
      if (state.connectionState !== ConnectionState.CONNECTED) {
        return state;
      }
      return { ...state, currentTest: action.id };
    case 'TEST_FINISHED':
      return { ...state, currentTest: null };
    default:
      return state;
  }
}
