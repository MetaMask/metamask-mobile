import NavigationService from './NavigationService';
import Logger from '../../util/Logger';
import type {
  NavigationContainerRef,
  ParamListBase,
} from '@react-navigation/native';

jest.mock('../AgenticService/AgenticService', () => ({
  __esModule: true,
  default: {
    install: jest.fn(),
  },
}));

describe('NavigationService', () => {
  let mockNavigation: NavigationContainerRef<ParamListBase>;
  let mockRequestAnimationFrame: jest.SpyInstance;
  let mockLoggerError: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset NavigationService state to ensure test isolation
    NavigationService.resetForTesting();

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
      getState: jest.fn(() => ({
        routes: [{ name: 'Home' }],
        index: 0,
        key: 'nav-key',
        stale: false,
        type: 'stack',
        routeNames: ['Home'],
      })),
      getCurrentRoute: jest.fn(() => ({ name: 'Home', key: 'home-key' })),
      canGoBack: jest.fn(() => true),
      getRootState: jest.fn(() => ({
        routes: [{ name: 'Home' }],
        index: 0,
        key: 'nav-key',
        stale: false,
        type: 'stack',
        routeNames: ['Home'],
      })),
    } as unknown as NavigationContainerRef<ParamListBase>;

    mockLoggerError = jest.spyOn(Logger, 'error');
  });

  afterEach(() => {
    mockRequestAnimationFrame.mockRestore();
    mockLoggerError.mockRestore();
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

    it('can be accessed multiple times after being set', () => {
      NavigationService.navigation = mockNavigation;

      const navigation1 = NavigationService.navigation;
      const navigation2 = NavigationService.navigation;

      expect(navigation1).toBeDefined();
      expect(navigation2).toBeDefined();
    });
  });

  describe('navigation setter', () => {
    it('throws error when navigation is invalid', () => {
      const invalidNavigation = {} as NavigationContainerRef<ParamListBase>;

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
      } as unknown as NavigationContainerRef<ParamListBase>;

      expect(() => {
        NavigationService.navigation = incompleteNavigation;
      }).toThrow('Navigation reference is not valid!');
    });

    it('throws error when navigate is not a function', () => {
      const invalidNavigation = {
        navigate: 'not a function',
      } as unknown as NavigationContainerRef<ParamListBase>;

      expect(() => {
        NavigationService.navigation = invalidNavigation;
      }).toThrow('Navigation reference is not valid!');
    });

    it('accepts navigation with only navigate function', () => {
      const minimalNavigation = {
        navigate: jest.fn(),
      } as unknown as NavigationContainerRef<ParamListBase>;

      NavigationService.navigation = minimalNavigation;

      expect(() => NavigationService.navigation).not.toThrow();
    });

    it('can be updated with new navigation reference', () => {
      NavigationService.navigation = mockNavigation;

      const newMockNavigation = {
        ...mockNavigation,
        navigate: jest.fn(),
      } as unknown as NavigationContainerRef<ParamListBase>;

      NavigationService.navigation = newMockNavigation;
      NavigationService.navigation.navigate('NewScreen');

      expect(newMockNavigation.navigate).toHaveBeenCalled();
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

    it('navigate passes all arguments to the original function', () => {
      NavigationService.navigation = mockNavigation;

      NavigationService.navigation.navigate('TestScreen', { id: 123 });

      expect(mockNavigation.navigate).toHaveBeenCalledWith('TestScreen', {
        id: 123,
      });
    });

    it('reset passes the complete state object', () => {
      NavigationService.navigation = mockNavigation;
      const resetState = {
        index: 0,
        routes: [{ name: 'Home' }, { name: 'Settings' }],
      };

      NavigationService.navigation.reset(resetState);

      expect(mockNavigation.reset).toHaveBeenCalledWith(resetState);
    });

    it('handles navigate called multiple times', () => {
      NavigationService.navigation = mockNavigation;

      NavigationService.navigation.navigate('Screen1');
      NavigationService.navigation.navigate('Screen2');
      NavigationService.navigation.navigate('Screen3');

      expect(mockRequestAnimationFrame).toHaveBeenCalledTimes(3);
      expect(mockNavigation.navigate).toHaveBeenCalledTimes(3);
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
      } as unknown as NavigationContainerRef<ParamListBase>;
      NavigationService.navigation = navWithProperty;

      const navigation =
        NavigationService.navigation as NavigationContainerRef<ParamListBase> & {
          key: string;
        };

      expect(navigation.key).toBe('test-nav-key');
    });

    it('dispatch method is called directly without deferral', () => {
      NavigationService.navigation = mockNavigation;
      const action = { type: 'NAVIGATE', payload: { name: 'Test' } };

      NavigationService.navigation.dispatch(action);

      expect(mockNavigation.dispatch).toHaveBeenCalledWith(action);
      expect(mockRequestAnimationFrame).not.toHaveBeenCalled();
    });

    it('canGoBack returns the expected value', () => {
      NavigationService.navigation = mockNavigation;

      const result = NavigationService.navigation.canGoBack();

      expect(result).toBe(true);
      expect(mockNavigation.canGoBack).toHaveBeenCalled();
    });

    it('getState returns the current navigation state', () => {
      NavigationService.navigation = mockNavigation;

      const state = NavigationService.navigation.getState();

      expect(state).toEqual({
        routes: [{ name: 'Home' }],
        index: 0,
        key: 'nav-key',
        stale: false,
        type: 'stack',
        routeNames: ['Home'],
      });
    });

    it('getCurrentRoute returns the current route', () => {
      NavigationService.navigation = mockNavigation;

      const route = NavigationService.navigation.getCurrentRoute();

      expect(route).toEqual({ name: 'Home', key: 'home-key' });
    });

    it('getRootState returns the root navigation state', () => {
      NavigationService.navigation = mockNavigation;

      const rootState = NavigationService.navigation.getRootState();

      expect(rootState).toEqual({
        routes: [{ name: 'Home' }],
        index: 0,
        key: 'nav-key',
        stale: false,
        type: 'stack',
        routeNames: ['Home'],
      });
    });
  });

  describe('resetForTesting', () => {
    it('resets navigation to undefined state', () => {
      NavigationService.navigation = mockNavigation;
      expect(() => NavigationService.navigation).not.toThrow();

      NavigationService.resetForTesting();

      expect(() => NavigationService.navigation).toThrow(
        'Navigation reference does not exist!',
      );
    });

    it('allows setting new navigation after reset', () => {
      NavigationService.navigation = mockNavigation;
      NavigationService.resetForTesting();

      NavigationService.navigation = mockNavigation;

      expect(() => NavigationService.navigation).not.toThrow();
    });
  });

  describe('proxy edge cases', () => {
    it('handles symbol properties correctly', () => {
      NavigationService.navigation = mockNavigation;

      const navigation = NavigationService.navigation;

      expect(() => {
        const symbolKey = Symbol('test');
        const navRecord = navigation as unknown as Record<symbol, unknown>;
        const _symbolValue = navRecord[symbolKey];
        expect(_symbolValue).toBeUndefined();
      }).not.toThrow();
    });

    it('handles numeric property access', () => {
      const navWithNumericProp = {
        ...mockNavigation,
        0: 'first',
      } as unknown as NavigationContainerRef<ParamListBase>;
      NavigationService.navigation = navWithNumericProp;

      const navigation =
        NavigationService.navigation as NavigationContainerRef<ParamListBase> & {
          0: string;
        };

      expect(navigation[0]).toBe('first');
    });
  });

  describe('function binding context', () => {
    it('preserves this context for non-deferred methods', () => {
      type NavContextType = typeof mockNavigation & {
        goBack: () => boolean;
      };

      const navWithContext: NavContextType = {
        ...mockNavigation,
        goBack(this: NavContextType) {
          return this === navWithContext;
        },
      };

      NavigationService.navigation =
        navWithContext as unknown as NavigationContainerRef<ParamListBase>;

      const result = NavigationService.navigation.goBack();

      expect(result).toBe(true);
    });
  });
});
