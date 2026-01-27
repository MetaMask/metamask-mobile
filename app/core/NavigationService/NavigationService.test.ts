import NavigationService from './NavigationService';
import Logger from '../../util/Logger';
import type { NavigationContainerRef } from '@react-navigation/native';

describe('NavigationService', () => {
  let mockNavigation: NavigationContainerRef;
  let mockRequestAnimationFrame: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock requestAnimationFrame - execute callback immediately for testing
    mockRequestAnimationFrame = jest
      .spyOn(global, 'requestAnimationFrame')
      .mockImplementation((cb) => {
        cb(0);
        return 0;
      });

    mockNavigation = {
      navigate: jest.fn(),
      reset: jest.fn(),
      goBack: jest.fn(),
      dispatch: jest.fn(),
    } as unknown as NavigationContainerRef;

    jest.spyOn(Logger, 'error');
  });

  afterEach(() => {
    mockRequestAnimationFrame.mockRestore();
  });

  describe('navigation getter', () => {
    it('throws error when navigation does not exist', () => {
      expect(() => NavigationService.navigation).toThrow(
        'Navigation reference does not exist!',
      );
      expect(Logger.error).toHaveBeenCalledWith(
        new Error('Navigation reference does not exist!'),
      );
    });

    it('returns navigation proxy when navigation exists', () => {
      NavigationService.navigation = mockNavigation;

      const navigation = NavigationService.navigation;

      expect(navigation).toBeDefined();
      expect(typeof navigation.navigate).toBe('function');
      expect(typeof navigation.reset).toBe('function');
    });
  });

  describe('navigation setter', () => {
    it('throws error when navigation is invalid', () => {
      const invalidNavigation = {} as NavigationContainerRef;

      expect(() => {
        NavigationService.navigation = invalidNavigation;
      }).toThrow('Navigation reference is not valid!');
      expect(Logger.error).toHaveBeenCalledWith(
        new Error('Navigation reference is not valid!'),
      );
    });

    it('sets navigation when valid', () => {
      NavigationService.navigation = mockNavigation;

      expect(() => NavigationService.navigation).not.toThrow();
    });

    it('throws error when navigation is missing required methods', () => {
      const incompleteNavigation = {
        // missing navigate
      } as unknown as NavigationContainerRef;

      expect(() => {
        NavigationService.navigation = incompleteNavigation;
      }).toThrow('Navigation reference is not valid!');
    });
  });

  describe('deferred navigation methods', () => {
    it('defers navigate calls via requestAnimationFrame', () => {
      NavigationService.navigation = mockNavigation;

      NavigationService.navigation.navigate('TestScreen');

      expect(mockRequestAnimationFrame).toHaveBeenCalled();
      expect(mockNavigation.navigate).toHaveBeenCalledWith('TestScreen');
    });

    it('defers reset calls via requestAnimationFrame', () => {
      NavigationService.navigation = mockNavigation;
      const resetState = { routes: [{ name: 'Login' }] };

      NavigationService.navigation.reset(resetState);

      expect(mockRequestAnimationFrame).toHaveBeenCalled();
      expect(mockNavigation.reset).toHaveBeenCalledWith(resetState);
    });
  });

  describe('proxy pass-through behavior', () => {
    it('binds and returns non-deferred function methods directly', () => {
      NavigationService.navigation = mockNavigation;

      NavigationService.navigation.goBack();

      expect(mockNavigation.goBack).toHaveBeenCalled();
      expect(mockRequestAnimationFrame).not.toHaveBeenCalled();
    });

    it('returns non-function properties directly', () => {
      const navWithProperty = {
        ...mockNavigation,
        key: 'test-nav-key',
      } as unknown as NavigationContainerRef;
      NavigationService.navigation = navWithProperty;

      const navigation =
        NavigationService.navigation as NavigationContainerRef & {
          key: string;
        };

      expect(navigation.key).toBe('test-nav-key');
    });
  });
});
