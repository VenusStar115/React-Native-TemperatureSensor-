import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import Login from './components/Login';
import SensorTag from './components/SensorTag';
import Sensor from './components/Sensor';

const Stack = createStackNavigator();

export function Router() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName="Login">
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="SensorTag" component={SensorTag} />
      <Stack.Screen name="Sensor" component={Sensor} />
    </Stack.Navigator>
  );
}
