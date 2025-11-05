import { NavigationProp, ParamListBase } from '@react-navigation/native';
import {
  createUnsupportedRegionModalNavigationDetails,
  createErrorModalNavigationDetails,
} from '../components';

export type RampModalType = 'unsupportedRegion' | 'error';

/**
 * Navigate to a ramps modal
 * @param navigation - Navigation prop from React Navigation
 * @param modalType - Type of modal to navigate to ('unsupportedRegion' or 'error')
 */
export const goToRamps = (
  navigation: NavigationProp<ParamListBase>,
  modalType: RampModalType,
): void => {
  if (modalType === 'unsupportedRegion') {
    navigation.navigate(...createUnsupportedRegionModalNavigationDetails());
  } else if (modalType === 'error') {
    navigation.navigate(...createErrorModalNavigationDetails());
  }
};
