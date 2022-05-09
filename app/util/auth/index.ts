import Device from '../device';
import AUTHENTICATION_TYPE from '../../constants/userProperties';

/**
 * Determines the passcode type used in locales to dispaly the platform specific text
 * @param type - AUTHENTICATION_TYPE
 * @returns String of passcodeType for UI display of components
 */
// eslint-disable-next-line import/prefer-default-export
export const passcodeType = (type: AUTHENTICATION_TYPE): string =>
  Device.isIos() ? type + '_ios' : type + '_android';
