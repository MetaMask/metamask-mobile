import { Linking } from 'react-native';

Linking.addEventListener = jest.fn();
Linking.removeEventListener = jest.fn();
Linking.openURL = jest.fn();
Linking.canOpenURL = jest.fn();
Linking.getInitialURL = jest.fn();

export { Linking };
