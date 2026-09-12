import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { getSubnavPillTestId } from '../shell/SubnavPills';
import SocialV1View from './SocialV1View';
import { SocialV1ViewSelectorsIDs } from './SocialV1View.testIds';
import { SOCIAL_V1_AB_KEY } from './abTestConfig';

const mockPlaySelection = jest.fn().mockResolvedValue(undefined);
const mockTrack = jest.fn();
const mockNavigate = jest.fn();
const mockOpenSystemSettings = jest.fn();
let mockRouteParams: { showNotificationsBanner?: boolean } = {};

const mockUseABTest = jest.fn();
jest.mock('../../../../hooks/useABTest', () => ({
  useABTest: (...args: unknown[]) => {
    mockUseABTest(...args);
    return {
      variant: { useSocialV1: true },
      variantName: 'treatment',
      isActive: true,
    };
  },
}));

jest.mock('../analytics', () => {
  const actual = jest.requireActual('../analytics');
  return {
    ...actual,
    useSocialLeaderboardAnalytics: () => ({ track: mockTrack }),
  };
});

jest.mock('react-native-pager-view', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const MockPagerView = ReactActual.forwardRef(
    (
      props: {
        children?: React.ReactNode;
        onPageSelected?: (e: { nativeEvent: { position: number } }) => void;
        testID?: string;
      },
      _ref: React.Ref<unknown>,
    ) => (
      <View testID={props.testID} onPageSelected={props.onPageSelected}>
        {props.children}
      </View>
    ),
  );
  MockPagerView.displayName = 'MockPagerView';
  return { __esModule: true, default: MockPagerView };
});

jest.mock('../../../../util/haptics', () => ({
  playSelection: () => mockPlaySelection(),
}));

jest.mock('../TopTradersView', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, { testID: 'top-traders-view' }),
  };
});

jest.mock(
  '../../../../util/notifications/services/NotificationService',
  () => ({
    __esModule: true,
    default: { openSystemSettings: () => mockOpenSystemSettings() },
  }),
);

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: mockNavigate }),
    useRoute: () => ({ params: mockRouteParams, name: 'SocialV1View' }),
  };
});

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('SocialV1View', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {};
  });

  it('renders Feed, Live trades, and Leaderboard tabs', () => {
    renderWithProvider(<SocialV1View />);

    expect(
      screen.getByTestId(`${SocialV1ViewSelectorsIDs.TABS}-tab-0-label`),
    ).toHaveTextContent('social_leaderboard.feed.tabs.feed');
    expect(
      screen.getByTestId(`${SocialV1ViewSelectorsIDs.TABS}-tab-1-label`),
    ).toHaveTextContent('social_leaderboard.feed.tabs.live_trades');
    expect(
      screen.getByTestId(`${SocialV1ViewSelectorsIDs.TABS}-tab-2-label`),
    ).toHaveTextContent('social_leaderboard.feed.tabs.leaderboard');
  });

  it('renders every tab subnav', () => {
    renderWithProvider(<SocialV1View />);

    expect(
      screen.getByTestId(getSubnavPillTestId('trending')),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(getSubnavPillTestId('following')),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(getSubnavPillTestId('memecoins')),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(getSubnavPillTestId('topTraders')),
    ).toBeOnTheScreen();
  });

  it('mounts the leaderboard list once the Leaderboard tab is opened', () => {
    renderWithProvider(<SocialV1View />);

    expect(screen.queryByTestId('top-traders-view')).toBeNull();

    fireEvent.press(
      screen.getByTestId(`${SocialV1ViewSelectorsIDs.TABS}-tab-2`),
    );

    expect(screen.getByTestId('top-traders-view')).toBeOnTheScreen();
  });

  it('emits TSA-1122 exposure when the v1 home opens', () => {
    renderWithProvider(<SocialV1View />);

    expect(mockUseABTest).toHaveBeenCalledWith(
      SOCIAL_V1_AB_KEY,
      expect.anything(),
      expect.objectContaining({ experimentName: 'Social V1' }),
    );
  });

  it('renders placeholder header actions that do not navigate', () => {
    renderWithProvider(<SocialV1View />);

    fireEvent.press(screen.getByTestId(SocialV1ViewSelectorsIDs.AVATAR_BUTTON));
    fireEvent.press(screen.getByTestId(SocialV1ViewSelectorsIDs.HEART_BUTTON));
    fireEvent.press(screen.getByTestId(SocialV1ViewSelectorsIDs.PLUS_BUTTON));

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('omits the header back button', () => {
    renderWithProvider(<SocialV1View />);

    expect(screen.queryByTestId('social-v1-view-back-button')).toBeNull();
  });

  it('tracks Live trades tab selection', () => {
    renderWithProvider(<SocialV1View />);

    fireEvent.press(
      screen.getByTestId(`${SocialV1ViewSelectorsIDs.TABS}-tab-1`),
    );

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_INTERACTION,
      expect.objectContaining({
        interaction_type: 'tab_changed',
        tab: 'tab_live_trades',
      }),
    );
  });
});
