import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { goToRamps } from './navigation';
import {
  createUnsupportedRegionModalNavigationDetails,
  createErrorModalNavigationDetails,
} from '../components';

jest.mock('../components', () => ({
  createUnsupportedRegionModalNavigationDetails: jest.fn(() => [
    'RampComponentsUnsupportedRegionModal',
    {},
  ]),
  createErrorModalNavigationDetails: jest.fn(() => [
    'RampComponentsErrorModal',
    {},
  ]),
}));

describe('navigation utils', () => {
  describe('goToRamps', () => {
    let mockNavigation: NavigationProp<ParamListBase>;

    beforeEach(() => {
      mockNavigation = {
        navigate: jest.fn(),
      } as unknown as NavigationProp<ParamListBase>;
    });

    it('navigates to unsupported region modal', () => {
      goToRamps(mockNavigation, 'unsupportedRegion');

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        'RampComponentsUnsupportedRegionModal',
        {},
      );
      expect(createUnsupportedRegionModalNavigationDetails).toHaveBeenCalled();
    });

    it('navigates to error modal', () => {
      goToRamps(mockNavigation, 'error');

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        'RampComponentsErrorModal',
        {},
      );
      expect(createErrorModalNavigationDetails).toHaveBeenCalled();
    });
  });
});
