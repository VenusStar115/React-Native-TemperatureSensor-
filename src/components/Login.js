// @flow

import React, { Component } from 'react';
import { connect as reduxConnect } from 'react-redux';
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
  TextInput,
  Image,
  AsyncStorage,
  Alert,
} from 'react-native';
import {
  type ReduxState,
  clearLogs,
  connect,
  disconnect,
  executeTest,
  forgetSensorTag,
  setLocation,
  setId,
  ConnectionState,
} from '../Reducer';
import { Container, Item, Label } from 'native-base';
import Icon from 'react-native-vector-icons/FontAwesome5';
import Geolocation from '@react-native-community/geolocation';
import { SvgXml } from 'react-native-svg';
import { appColors } from '../colors';
import ArrowLoactionIcon from '../assets/images/arrowLocation';

const windowHeight = Dimensions.get('window').height;

class Login extends Component {
  constructor(props: Props) {
    super(props);
  }

  state = {
    location: '',
    id: 'Sensor',
  };

  componentWillMount = async () => {
    const { setLocation, setId } = this.props;

    try {
      const id = await AsyncStorage.getItem('macId');
      setId(id);
      this.setState({ id });

      // dragon
      // if (id) {
      //   this.props.navigation.navigate('Sensor');
      // }
    } catch (error) {
      // Error saving data
      console.log('Error local storage');
    }
  };

  componentDidMount() {
    Geolocation.getCurrentPosition(
      position => {
        const initialPosition = JSON.stringify(position);
        console.log('initialPosition', initialPosition);
        const lati = position.coords.latitude.toFixed(10);
        const longi = position.coords.longitude.toFixed(10);
        const location = position && position.coords && lati + ', ' + longi;
        console.log('location', location);
        this.setState({ location });
      },
      error => {
        Alert.alert('Error', JSON.stringify(error));
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 },
    );
    // this.watchID = Geolocation.watchPosition(position => {
    //   const lastPosition = JSON.stringify(position);
    //   console.log('lastPosition', lastPosition)
    //   this.setState({lastPosition});
    // });
  }

  validate = () => {
    const { location, id } = this.state;

    let error = null;

    // dragon
    // if (!id) {
    //   error = error || {};
    //   error.id = 'Field is required';
    // }

    if (!location) {
      error = error || {};
      error.location = 'Field is required';
    }

    return error;
  };

  onSubmit = async () => {
    const { location } = this.state;
    const { setLocation } = this.props;
    const error = this.validate();

    const id = 'Sensor MacID';
    if (!error) {
      setLocation(location);
      setId(id);

      try {
        await AsyncStorage.setItem('macId', id);
      } catch (error) {
        // Error saving data
        console.log('Error local storage');
      }
      this.props.navigation.navigate('Sensor');
    } else {
      this.setState({ error })
    }
  };

  onChange = field => value => {
    const { error } = this.state;

    this.setState({ [field]: value })

    if (value && error && error[field]) {
      this.setState({ error: { ...error, [field]: '' } });
    }
  };

  render() {
    const { id, location, error } = this.state;

    return (
      <Container style={styles.root}>
        {/* <ScrollView style={styles.scrollView} contentContainerStyle={{ flexGrow: 1 }}> */}
        <View style={styles.parentView}>
          <View style={styles.headingView}>
            <Text style={styles.heading}>Welcome</Text>
            <Text style={styles.subHeading}>
              Amet minim molit non desserunt ullamco est sit aliqua dolor do
              amet sint
              </Text>
          </View>

          <View style={styles.formView}>
            {/* dragon */}
            {/* <View>
                <Label style={styles.label}>Identifier</Label>
                <Item style={styles.formItem}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter Identifier"
                    value={id}
                    onChangeText={this.onChange('id')}
                  />
                </Item>
              </View>
              <View>
                <Text style={styles.error}>{error && error.id ? error.id : ''}</Text>
              </View> */}

            <View>
              <Label style={styles.label}>Primary Location</Label>
              <Item style={styles.formItem}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Select Location"
                  value={location}
                  onChangeText={this.onChange('location')}
                />
                <SvgXml width="19" height="20" xml={ArrowLoactionIcon} style={{ margin: 5 }} />
              </Item>
            </View>
            <View>
              <Text style={styles.error}>{error && error.location ? error.location : ''}</Text>
            </View>
          </View>

          <View style={styles.buttonView}>
            <TouchableOpacity style={styles.continueButtonTouch} onPress={this.onSubmit}>
              <View style={styles.continueButtonView}>
                <Text style={styles.continueText}>Scan</Text>
                <View style={styles.rightArrowView}>
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
        {/* </ScrollView> */}
      </Container>
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
  parentView: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: '8%',
    paddingHorizontal: 24,
    height: windowHeight - 40
  },
  headingView: {
    justifyContent: 'center',
    alignItems: 'center',
    alignContent: 'center',
  },
  formView: {
    width: '100%',
  },
  buttonView: {
    width: '100%',
    justifyContent: 'center',
  },
  heading: {
    marginBottom: 32,
    fontSize: 40,
    lineHeight: 50,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#000',
  },
  subHeading: {
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Poppins-Regular',
    color: '#4A4A4A',
  },
  label: {
    marginBottom: 5,
    marginLeft: 2,
    fontSize: 14,
    lineHeight: 21,
    color: '#4A4A4A',
  },
  formItem: {
    width: '100%',
    padding: 8,
    paddingRight: 40,
    borderColor: appColors.inputBorder,
    borderBottomWidth: 2,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderRadius: 15,
  },
  textInput: {
    width: '100%',
    borderBottomWidth: 0,
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    lineHeight: 22,
    height: 50,
  },
  mt20: {
    marginTop: 20,
  },
  continueButtonTouch: {
    backgroundColor: appColors.buttonBg,
    width: '100%',
    borderRadius: 10,
    height: 60,
    display: 'flex',
    padding: 15,
  },
  continueButtonView: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: 'row',
    alignContent: 'center',
    borderRadius: 20,
  },
  continueText: {
    fontSize: 18,
    fontFamily: 'Poppins-Regular',
    marginLeft: 10,
    color: appColors.white,
  },
  rightArrowView: {
    width: 30,
    backgroundColor: appColors.white,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
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
    color: 'white',
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
  error: {
    color: '#FF0000',
  }
});

export default reduxConnect(
  (state: ReduxState): $Shape<Props> => ({
    logs: state.logs,
    sensorTag: state.activeSensorTag,
    connectionState: state.connectionState,
    currentTest: state.currentTest,
  }),
  {
    clearLogs,
    connect,
    disconnect,
    forgetSensorTag,
    executeTest,
    setLocation,
    setId,
  },
)(Login);
