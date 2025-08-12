import { useNavigation } from '@react-navigation/native';

import Routes from '../../../../../constants/navigation/Routes';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useSendNavbar } from './useSendNavbar';

const mockSetOptions = jest.fn();
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('./useSendActions', () => ({
  useSendActions: () => ({
    handleCancelPress: jest.fn(),
    handleBackPress: jest.fn(),
  }),
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      background: {
        default: '#ffffff',
      },
    },
  }),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => jest.fn((className) => className),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: ({ children }: { children: React.ReactNode }) => children,
  }),
}));

describe('useSendNavbar', () => {
  const mockNavigation = {
    setOptions: mockSetOptions,
    goBack: mockGoBack,
    navigate: mockNavigate,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
  });

  describe('when currentRoute is not ASSET', () => {
    it('sets navigation options with default header configuration', () => {
      const currentRoute = Routes.SEND.AMOUNT;

      renderHookWithProvider(() => useSendNavbar({ currentRoute }));

      expect(mockSetOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          headerLeft: expect.any(Function),
          headerRight: expect.any(Function),
          headerTitle: expect.any(Function),
          headerStyle: {
            backgroundColor: '#ffffff',
            shadowColor: 'transparent',
            elevation: 0,
          },
        }),
      );
    });

    it('calls setOptions with navigation options', () => {
      const currentRoute = Routes.SEND.RECIPIENT;

      renderHookWithProvider(() => useSendNavbar({ currentRoute }));

      expect(mockSetOptions).toHaveBeenCalledTimes(1);
    });

    it('includes headerLeft function that renders back button', () => {
      const currentRoute = Routes.SEND.AMOUNT;

      renderHookWithProvider(() => useSendNavbar({ currentRoute }));

      const navigationOptions = mockSetOptions.mock.calls[0][0];
      expect(navigationOptions.headerLeft).toBeDefined();
      expect(typeof navigationOptions.headerLeft).toBe('function');
    });

    it('includes headerRight function that renders close button', () => {
      const currentRoute = Routes.SEND.AMOUNT;

      renderHookWithProvider(() => useSendNavbar({ currentRoute }));

      const navigationOptions = mockSetOptions.mock.calls[0][0];
      expect(navigationOptions.headerRight).toBeDefined();
      expect(typeof navigationOptions.headerRight).toBe('function');
    });

    it('includes headerTitle function that renders title', () => {
      const currentRoute = Routes.SEND.AMOUNT;

      renderHookWithProvider(() => useSendNavbar({ currentRoute }));

      const navigationOptions = mockSetOptions.mock.calls[0][0];
      expect(navigationOptions.headerTitle).toBeDefined();
      expect(typeof navigationOptions.headerTitle).toBe('function');
    });
  });

  describe('when currentRoute is ASSET', () => {
    it('sets navigation options with custom header configuration for ASSET route', () => {
      const currentRoute = Routes.SEND.ASSET;

      renderHookWithProvider(() => useSendNavbar({ currentRoute }));

      expect(mockSetOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          headerLeft: expect.any(Function),
          headerRight: expect.any(Function),
          headerTitle: null,
          headerStyle: {
            backgroundColor: '#ffffff',
            shadowColor: 'transparent',
            elevation: 0,
          },
        }),
      );
    });

    it('overrides headerLeft to show title instead of back button', () => {
      const currentRoute = Routes.SEND.ASSET;

      renderHookWithProvider(() => useSendNavbar({ currentRoute }));

      const navigationOptions = mockSetOptions.mock.calls[0][0];
      expect(navigationOptions.headerLeft).toBeDefined();
      expect(typeof navigationOptions.headerLeft).toBe('function');
    });

    it('sets headerTitle to null for ASSET route', () => {
      const currentRoute = Routes.SEND.ASSET;

      renderHookWithProvider(() => useSendNavbar({ currentRoute }));

      const navigationOptions = mockSetOptions.mock.calls[0][0];
      expect(navigationOptions.headerTitle).toBeNull();
    });
  });
});
