import { passcodeType } from './passcodeType';
import AUTHENTICATION_TYPE from '../../constants/userProperties';
import Device from '../device';
import { Platform } from 'react-native';

describe('Biometry utils: passcode string type by device type', () => {
  it('should return android passcode type', () => {
    Platform.OS = 'android';
    expect(Device.isAndroid()).toBe(true);
    const type = AUTHENTICATION_TYPE.PASSCODE;
    expect(passcodeType(type)).toEqual('device_passcode_android');
  });
  it('should return ios passcode type', () => {
    Platform.OS = 'ios';
    expect(Device.isIos()).toBe(true);
    const type = AUTHENTICATION_TYPE.PASSCODE;
    expect(passcodeType(type)).toEqual('device_passcode_ios');
  });
});
