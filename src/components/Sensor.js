// @flow

import React, { Component } from 'react';
import { connect as reduxConnect } from 'react-redux';
import DeviceInfo from 'react-native-device-info';
import {
  StyleSheet,
  Text,
  SafeAreaView,
  View,
  FlatList,
  TouchableOpacity,
  Modal,
  StatusBar,
  ScrollView,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import {
  type ReduxState,
  clearLogs,
  connect,
  disconnect,
  executeTest,
  forgetSensorTag,
  ConnectionState,
} from '../Reducer';
// import { Device } from 'react-native-ble-plx';
import { SensorTagTests, type SensorTagTestMetadata } from '../Tests';
import { Container } from 'native-base';
import Icon from 'react-native-vector-icons/FontAwesome5';
import Geolocation from '@react-native-community/geolocation';
import { appColors } from '../colors';

// dragon
import { buffers, eventChannel } from 'redux-saga';
import {
  BleManager,
  BleError,
  State,
  LogLevel,
  Device,
  Service,
  Characteristic,
  Descriptor,
  BleErrorCode,
} from 'react-native-ble-plx';
import { put, call, select } from 'redux-saga/effects';
import RNFetchBlob from 'rn-fetch-blob';
import { log, logError } from '../Reducer';

type Props = {
  sensorTag: ?Device,
  connectionState: $Keys<typeof ConnectionState>,
  logs: Array<string>,
  clearLogs: typeof clearLogs,
  connect: typeof connect,
  disconnect: typeof disconnect,
  executeTest: typeof executeTest,
  currentTest: ?string,
  forgetSensorTag: typeof forgetSensorTag,
};

const windowHeight = Dimensions.get('window').height;
const Button = function (props) {
  const { onPress, title, ...restProps } = props;
  return (
    <TouchableOpacity onPress={onPress} {...restProps}>
      <Text
        style={[
          styles.buttonStyle,
          restProps.disabled ? styles.disabledButtonStyle : null,
        ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

// dragon
const manager = new BleManager();
manager.setLogLevel(LogLevel.Verbose);

const timer = require('react-native-timer');

class Tools extends Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      showModal: false,
      isValidMac: true, // set to false after for production
      scanStatus: 0,
      scannedDevices: [],
      selectedDevice: null,
      stateString: '',
    };
  }

  componentDidUpdate(prevProps) {
    const { macId } = this.props;

    if (prevProps.macId !== macId) {
      this.checkMacAddress();
    }
  }

  componentWillMount = async () => {
    manager.stopDeviceScan();
  };

  componentDidMount() {
    this.checkMacAddress();
  }

  onBack = () => {
    this.props.navigation.navigate('Login');
  };

  checkMacAddress = () => {
    const { macId } = this.props;

    DeviceInfo.getMacAddress().then(mac => {
      console.log('mac', mac, macId);
      if (macId && mac === macId) {
        this.setState({ isValidMac: true })
      }
    });
  }

  sensorTagStatus(): string {
    switch (this.props.connectionState) {
      case ConnectionState.SCANNING:
        return 'Scanning...';
      case ConnectionState.CONNECTING:
        return 'Connecting...';
      case ConnectionState.DISCOVERING:
        return 'Discovering...';
      case ConnectionState.CONNECTED:
        return 'Connected';
      case ConnectionState.DISCONNECTED:
      case ConnectionState.DISCONNECTING:
        return this.state.scannedDevices.length + ' Devices Found';
    }

    return 'Searching...';
  }

  isSensorTagReadyToConnect(): boolean {
    return (
      this.state.selectedDevice != null &&
      this.props.connectionState === ConnectionState.DISCONNECTED
    );
  }

  isSensorTagReadyToDisconnect(): boolean {
    return this.props.connectionState === ConnectionState.CONNECTED;
  }

  isSensorTagReadyToExecuteTests(): boolean {
    return (
      this.props.connectionState === ConnectionState.CONNECTED &&
      this.props.currentTest == null
    );
  }

  scanDevice() {
    if (this.state.selectedDevice != null) {
      this.props.disconnect(this.state.selectedDevice);
    }
    this.setState({ selectedDevice: null })
    this.props.connectionState = ConnectionState.SCANNING;
    this.setState({ scannedDevices: [] });
    this.setState({ stateString: 'SensorTag : Scanning...' });

    manager.startDeviceScan(
      null,
      { allowDuplicates: true },
      (error, scannedDevice) => {
        if (error) {
          return;
        }

        if (scannedDevice != null && scannedDevice.localName === 'TestUART') {
          var isAdded = false;
          for (let index = 0; index < this.state.scannedDevices.length; index++) {
            let device = this.state.scannedDevices[index];
            if (device.id == scannedDevice.id) {
              isAdded = true;
              break;
            }
          }

          if (isAdded == false) {
            var deviceList = this.state.scannedDevices;
            deviceList.push(scannedDevice);
            this.setState({ scannedDevices: deviceList });
          }
        }
      },
    );

    timer.setTimeout(
      this, 'stopScan', () => {
        this.props.connectionState = ConnectionState.DISCONNECTED;
        this.setState({ stateString: 'SensorTag : ' + this.state.scannedDevices.length + ' devices found' });
        manager.stopDeviceScan();
      },
      5000,
    );
  }

  renderLogs() {
    return (
      <View style={{ flex: 1, padding: 10, paddingTop: 15, maxHeight: 50 }}>
        <FlatList
          style={{ flex: 1 }}
          data={this.props.logs && this.props.logs.slice(-2)}
          renderItem={({ item }) => (
            <Text style={styles.logTextStyle}> {item} </Text>
          )}
          keyExtractor={(item, index) => index.toString()}
        />
        {/*<Button*/}
        {/*style={{paddingTop: 10}}*/}
        {/*onPress={() => {*/}
        {/*this.props.clearLogs();*/}
        {/*}}*/}
        {/*title={'Clear logs'}*/}
        {/*/>*/}
      </View>
    );
  }

  renderModal() {
    // $FlowFixMe: SensorTagTests are keeping SensorTagTestMetadata as values.
    const tests: Array<SensorTagTestMetadata> = Object.values(SensorTagTests);

    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={this.state.showModal}
        onRequestClose={() => { }}>
        <View
          style={{
            backgroundColor: '#00000060',
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <View
            style={{
              backgroundColor: '#2a24fb',
              borderRadius: 10,
              height: '50%',
              padding: 5,
              shadowColor: 'black',
              shadowRadius: 20,
              shadowOpacity: 0.9,
              elevation: 20,
            }}>
            <Text
              style={[
                styles.textStyle,
                { paddingBottom: 10, alignSelf: 'center' },
              ]}>
              Select test to execute:
            </Text>
            <FlatList
              data={tests}
              renderItem={({ item }) => (
                <Button
                  style={{ paddingBottom: 5 }}
                  disabled={!this.isSensorTagReadyToExecuteTests()}
                  onPress={() => {
                    this.props.executeTest(item.id);
                    this.setState({ showModal: false });
                  }}
                  title={item.title}
                />
              )}
              keyExtractor={(item, index) => index.toString()}
            />
            <Button
              style={{ paddingTop: 5 }}
              onPress={() => {
                this.setState({ showModal: false });
              }}
              title={'Cancel'}
            />
          </View>
        </View>
      </Modal>
    );
  }

  render() {
    const { isValidMac } = this.state;
    const { macId, sensorTag } = this.props;
    const isReadyToConnect = this.isSensorTagReadyToConnect();
    const isReadyToExecuteTests = this.isSensorTagReadyToExecuteTests();

    return (
      <Container style={styles.root}>
        {/* <ScrollView style={styles.scrollView} contentContainerStyle={{ flexGrow: 1 }}> */}
        <View style={styles.parentView}>
          <View style={styles.backView}>
            <TouchableOpacity style={styles.backButtonTouch} onPress={this.onBack}>
              <View style={styles.leftArrowView}>
                <Icon
                  name="arrow-left"
                  size={16}
                  color={appColors.buttonBg}
                />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.headingView}>
            {/* // dragon */}
            {/* <Text style={styles.heading}>Device Name:</Text> */}
            {/* <Text style={{ ...styles.subHeading, ...(macId && isValidMac ? {} : styles.error) }}>
                {macId && isValidMac ? macId : 'There is no device to scan'}
              </Text> */}
            <Text>{this.state.stateString}</Text>
            {this.renderLogs()}
          </View>

          <View style={styles.scannedDeviceList}>
            <FlatList
              // ref={ref => {
              //   genreFlatListRef = ref;
              // }}
              contentContainerStyle={{ paddingHorizontal: 10 }}
              horizontal={false}
              showsHorizontalScrollIndicator={false}
              data={this.state.scannedDevices}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                return (
                  <TouchableWithoutFeedback onPress={() => {
                    this.setState({ selectedDevice: item });
                  }}>
                    {this.state.selectedDevice == item
                      ? (<Text style={{ ...styles.deviceText, backgroundColor: '#88F' }}>{item.name != null ? item.name : item.id}</Text>)
                      : (<Text style={{ ...styles.deviceText, backgroundColor: '#FFF0' }}>{item.name != null ? item.name : item.id}</Text>)
                    }
                  </TouchableWithoutFeedback>
                )
              }}
            />
          </View>

          <View style={styles.wrapper}>
            <View style={styles.buttonView}>
              <TouchableOpacity
                style={{ ...styles.buttonTouch, ...(macId && isValidMac && isReadyToConnect ? styles.doneButtonTouch : styles.continueButtonTouch) }}
                onPress={() => {
                  this.scanDevice();
                }}
              >
                <View style={styles.continueButtonView}>
                  <Text style={{ ...styles.buttonText, ...(macId && isValidMac && isReadyToConnect ? styles.doneText : styles.continueText) }}>Scan</Text>
                  <View style={{ ...styles.rightArrowView, ...(macId && isValidMac && isReadyToConnect ? styles.doneRightArrow : styles.continueRightArrow) }}>
                    <Icon
                      name="arrow-right"
                      size={18}
                      color={appColors.buttonBg}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.buttonView}>
              <TouchableOpacity
                disabled={!isReadyToConnect}
                style={{ ...styles.buttonTouch, ...(macId && isValidMac && isReadyToConnect && this.state.selectedDevice != null ? styles.continueButtonTouch : styles.doneButtonTouch) }}
                onPress={() => {
                  if (this.state.selectedDevice != null) {
                    this.setState({ stateString: 'SensorTag : Connected' });
                    this.props.connect(this.state.selectedDevice);
                  }
                }}
              >
                <View style={styles.continueButtonView}>
                  {<Text style={{ ...styles.buttonText, ...(macId && isValidMac && isReadyToConnect && this.state.selectedDevice != null ? styles.doneText : styles.disabledText) }}>Connect</Text>}
                  < View style={{ ...styles.rightArrowView, ...(macId && isValidMac && isReadyToConnect && this.state.selectedDevice != null ? styles.continueRightArrow : styles.disabledRightArrow) }}>
                    <Icon
                      name="arrow-right"
                      size={18}
                      color={appColors.buttonBg}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.buttonView}>
              <TouchableOpacity
                style={{ ...styles.buttonTouch, ...(isReadyToExecuteTests ? styles.continueButtonTouch : styles.disabledButtonTouch) }}
                disabled={!isReadyToExecuteTests}
                onPress={() => {
                  // this.setState({ showModal: true });
                  if (this.state.selectedDevice != null) {
                    // this.setState({ stateString: 'SensorTag : Connected' });
                    this.props.executeTest('READ_TEMPERATURE');
                  }
                }}
              >
                <View style={styles.continueButtonView}>
                  <Text style={{ ...styles.buttonText, ...(isReadyToExecuteTests ? styles.continueText : styles.disabledText) }}>Read Temperature</Text>
                  <View style={{ ...styles.rightArrowView, ...(isReadyToExecuteTests ? styles.continueRightArrow : styles.disabledRightArrow) }}>
                    <Icon
                      name="arrow-right"
                      size={18}
                      color={appColors.buttonBg}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.wrapper}>
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Not, Johnathan?</Text>
            </View>
            <View style={styles.footerRow}>
              <Text style={styles.footerLink}>Click here</Text>
              <Text style={styles.footerText}> to re-register.</Text>
            </View>
          </View>
        </View>
        { this.renderModal()}
        {/* </ScrollView> */}
      </Container >
    );
  }
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: appColors.appBg,
  },
  scrollView: {
    flex: 1,
  },
  wrapper: {
    width: '100%',
  },
  parentView: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 24,
    height: windowHeight - 40,
  },
  headingView: {
    justifyContent: 'center',
    alignItems: 'center',
    alignContent: 'center',
  },
  backView: {
    width: '100%',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  buttonView: {
    width: '100%',
    justifyContent: 'center',
    marginBottom: 10,
  },
  scannedDeviceList: {
    width: '100%',
    height: 150,
    borderColor: '#888',
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 15,
  },
  heading: {
    marginBottom: 8,
    fontSize: 40,
    lineHeight: 50,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#000',
  },
  subHeading: {
    textAlign: 'center',
    fontSize: 20,
    lineHeight: 30,
    fontFamily: 'Poppins-Regular',
    color: '#4A4A4A',
  },
  formItem: {
    width: '100%',
    padding: 8,
    borderColor: appColors.inputBorder,
    borderBottomWidth: 2,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderRadius: 15,
  },
  mt20: {
    marginTop: 20,
  },
  backButtonTouch: {
    borderRadius: 10,
    borderColor: '#CCD2DB',
    borderWidth: 1,
  },
  buttonTouch: {
    width: '100%',
    borderRadius: 10,
    height: 60,
    display: 'flex',
    padding: 15,
  },
  doneButtonTouch: {
    backgroundColor: appColors.white,
  },
  continueButtonTouch: {
    backgroundColor: appColors.buttonBg,
  },
  disabledButtonTouch: {
    backgroundColor: appColors.disabledBg,
  },
  continueButtonView: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: 'row',
    alignContent: 'center',
    borderRadius: 20,
  },
  buttonText: {
    fontSize: 18,
    fontFamily: 'Poppins-Regular',
    marginLeft: 10,
  },
  doneText: {
    color: '#000',
  },
  continueText: {
    color: appColors.white,
  },
  disabledText: {
    color: '#A3A3A3',
  },
  leftArrowView: {
    width: 40,
    backgroundColor: appColors.white,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightArrowView: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneRightArrow: {
    backgroundColor: '#F5F6FA',
  },
  continueRightArrow: {
    backgroundColor: appColors.white,
  },
  disabledRightArrow: {
    backgroundColor: '#F5F6FA',
  },
  container: {
    flex: 1,
    backgroundColor: '#2924fb',
    padding: 5,
  },
  textStyle: {
    color: 'white',
    fontSize: 20,
  },
  logTextStyle: {
    color: 'black',
    fontSize: 9,
  },
  buttonStyle: {
    borderWidth: 1,
    borderRadius: 5,
    padding: 5,
    backgroundColor: '#15127e',
    color: 'white',
    textAlign: 'center',
    fontSize: 20,
  },
  disabledButtonStyle: {
    backgroundColor: '#15142d',
    color: '#919191',
  },
  footer: {
    width: '100%',
    textAlign: 'center',
  },
  footerText: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Poppins-Medium',
    color: '#4A4A4A',
  },
  footerLink: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Poppins-Medium',
    color: appColors.buttonBg,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  error: {
    color: '#FF0000',
  },
  deviceText: {
    padding: 10,
    width: '100%',
    fontSize: 16,
    lineHeight: 20,
    height: 35,
    fontFamily: 'Poppins-Medium',
    color: '#4A4A4A',
  },
});

export default reduxConnect(
  (state: ReduxState): $Shape<Props> => ({
    logs: state.logs,
    sensorTag: state.activeSensorTag,
    connectionState: state.connectionState,
    currentTest: state.currentTest,
    macId: state.macId,
  }),
  {
    clearLogs,
    connect,
    disconnect,
    forgetSensorTag,
    executeTest,
  },
)(Tools);
