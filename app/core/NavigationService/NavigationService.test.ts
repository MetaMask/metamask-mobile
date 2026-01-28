import NavigationService from './NavigationService';
import Logger from '../../util/Logger';
import type { NavigationContainerRef } from '@react-navigation/native';
import type { RootParamList } from '../../util/navigation/types';

describe('NavigationService', () => {
  let mockNavigation: NavigationContainerRef<RootParamList>;

  beforeEach(() => {
    // Reset any internal state
    jest.clearAllMocks();

    // Create a mock navigation
    mockNavigation = {
      navigate: jest.fn(),
    } as unknown as NavigationContainerRef<RootParamList>;

    // Spy on Logger
    jest.spyOn(Logger, 'error');
  });

  describe('navigation getter', () => {
    it('should throw error if navigation does not exist', () => {
      expect(() => NavigationService.navigation).toThrow(
        'Navigation reference does not exist!',
      );
      expect(Logger.error).toHaveBeenCalledWith(
        new Error('Navigation reference does not exist!'),
      );
    });

    it('should return navigation if it exists', () => {
      NavigationService.navigation = mockNavigation;
      expect(NavigationService.navigation).toBe(mockNavigation);
    });
  });

  describe('navigation setter', () => {
    it('should throw error if navigation is invalid', () => {
      const invalidNavigation = {} as NavigationContainerRef<RootParamList>;

      expect(() => {
        NavigationService.navigation = invalidNavigation;
      }).toThrow('Navigation reference is not valid!');

      expect(Logger.error).toHaveBeenCalledWith(
        new Error('Navigation reference is not valid!'),
      );
    });

    it('should set navigation if valid', () => {
      NavigationService.navigation = mockNavigation;
      expect(NavigationService.navigation).toBe(mockNavigation);
    });

    it('should validate navigation has required methods', () => {
      const incompleteNavigation = {
        // missing navigate
      } as unknown as NavigationContainerRef<RootParamList>;

      expect(() => {
        NavigationService.navigation = incompleteNavigation;
      }).toThrow('Navigation reference is not valid!');
    });
  });
});
