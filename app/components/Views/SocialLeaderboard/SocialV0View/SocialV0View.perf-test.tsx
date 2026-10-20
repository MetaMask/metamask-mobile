import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { measureRenders } from 'reassure';
import { FeatureFlagOverrideProvider } from '../../../../contexts/FeatureFlagOverrideContext';
import { UIMessengerProvider } from '../../../../contexts/ui-messenger';
import configureStore from '../../../../util/test/configureStore';
import { createMockUIMessenger } from '../../../../util/test/mock-ui-messenger';
import { mockTheme, ThemeContext } from '../../../../util/theme';
import SocialV1View from '../SocialV1View';
import SocialV0View from './SocialV0View';

/**
 * JS-only render cost of the Follow Trading shell.
 *
 * Page bodies are 40 empty views, a lower bound on the production tree.
 * With `addListener` present and `transitionEnd` never fired, the patched
 * screen's measured commit is the header plus the static placeholder. The
 * unpatched screen mounts the pager and every stubbed page in that commit.
 * These numbers are not device timings.
 */
let mockRouteName = 'SocialV0View';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      canGoBack: () => true,
      addListener: jest.fn(() => jest.fn()),
    }),
    useRoute: () => ({ name: mockRouteName, params: {} }),
    useFocusEffect: jest.fn(),
  };
});

jest.mock('react-native-pager-view', () => {
  const ReactActual = jest.requireActual('react');
  const { View: NativeView } = jest.requireActual('react-native');
  const MockPagerView = ReactActual.forwardRef(
    (
      props: { children?: React.ReactNode; testID?: string },
      _ref: React.Ref<unknown>,
    ) => <NativeView testID={props.testID}>{props.children}</NativeView>,
  );
  MockPagerView.displayName = 'MockPagerView';
  return { __esModule: true, default: MockPagerView };
});

jest.mock('../../../../hooks/useABTest', () => ({
  useABTest: () => ({
    variant: { useSocialV1: true },
    variantName: 'control',
    isActive: false,
  }),
}));

jest.mock('../analytics', () => {
  const events = jest.requireActual('../analytics/socialLeaderboardEvents');
  return {
    ...events,
    useSocialLeaderboardAnalytics: () => ({ track: jest.fn() }),
  };
});

jest.mock('../FeedView/hooks/usePrefetchTraderFeeds', () => ({
  usePrefetchTraderFeeds: jest.fn(),
}));

jest.mock('../hooks/useOpenSocialNotificationPreferences', () => ({
  useOpenSocialNotificationPreferences: () => ({
    openNotificationPreferences: jest.fn(),
  }),
}));

jest.mock('../../../../util/haptics', () => ({
  playSelection: jest.fn(),
}));

jest.mock(
  '../../../../util/notifications/services/NotificationService',
  () => ({
    __esModule: true,
    default: { openSystemSettings: jest.fn() },
  }),
);

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  return {
    ...Reanimated,
    useReducedMotion: jest.fn(() => false),
  };
});

jest.mock('../TopTradersView', () =>
  jest.requireActual('./socialPerfStubPage'),
);
jest.mock('../FeedView', () => jest.requireActual('./socialPerfStubPage'));
jest.mock('../shell/EmptyShellTabPage', () =>
  jest.requireActual('./socialPerfStubPage'),
);
jest.mock('../shell/LeaderboardShellTabPage', () =>
  jest.requireActual('./socialPerfStubPage'),
);
jest.mock('../LiveTradesView', () =>
  jest.requireActual('./socialPerfStubPage'),
);

jest.mock('../FeedView/components/FeedSpotBuyAction', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const { View } =
    jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: ReactActual.forwardRef(() => ReactActual.createElement(View)),
  };
});

jest.mock('../MyProfileView/hooks', () => ({
  useMyProfile: () => ({
    profile: null,
    isLoading: false,
    error: null,
    refresh: jest.fn(),
  }),
}));

jest.mock('../hooks/useOpenSocialPostComposer', () => ({
  useOpenSocialPostComposer: () => ({ openComposer: jest.fn() }),
}));

const store = configureStore({});
const uiMessenger = createMockUIMessenger();

const PerfProviders: React.ComponentType<{
  children: React.ReactElement;
}> = ({ children }) => (
  <Provider store={store}>
    <UIMessengerProvider value={uiMessenger}>
      <ThemeContext.Provider value={mockTheme}>
        <FeatureFlagOverrideProvider>
          <NavigationContainer>{children}</NavigationContainer>
        </FeatureFlagOverrideProvider>
      </ThemeContext.Provider>
    </UIMessengerProvider>
  </Provider>
);

test('SocialV0View mount', async () => {
  mockRouteName = 'SocialV0View';
  await measureRenders(<SocialV0View />, { wrapper: PerfProviders });
});

test('SocialV1View mount', async () => {
  mockRouteName = 'SocialV1View';
  await measureRenders(<SocialV1View />, { wrapper: PerfProviders });
});
