import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import Routes from '../../../../constants/navigation/Routes';
import FeedView from './FeedView';
import {
  FeedViewSelectorsIDs,
  getFeedAudienceOptionTestId,
  getFeedTradeButtonTestId,
} from './FeedView.testIds';

const mockNavigate = jest.fn();
const mockPlayImpact = jest.fn().mockResolvedValue(undefined);

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  return {
    ...Reanimated,
    withSpring: jest.fn((value: number) => value),
  };
});

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../../util/haptics', () => ({
  playImpact: () => mockPlayImpact(),
  playSelection: jest.fn().mockResolvedValue(undefined),
  ImpactMoment: { PrimaryCTA: 'primaryCta' },
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../TraderPositionView/components/QuickBuy', () => {
  const { View } = jest.requireActual('react-native');
  return {
    QuickBuy: {
      Root: ({ isVisible }: { isVisible: boolean }) =>
        isVisible ? <View testID="mock-quick-buy-open" /> : null,
    },
    TOP_TRADERS_QUICK_BUY_FEATURES: {},
  };
});

describe('FeedView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the type selector, audience toggle, and feed list for the "all" audience', () => {
    renderWithProvider(<FeedView />);

    expect(
      screen.getByTestId(FeedViewSelectorsIDs.TYPE_SELECTOR),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(FeedViewSelectorsIDs.AUDIENCE_TOGGLE),
    ).toBeOnTheScreen();
    expect(screen.getByTestId(FeedViewSelectorsIDs.LIST)).toBeOnTheScreen();
  });

  it('shows the empty state when switching to the Following audience', () => {
    renderWithProvider(<FeedView />);

    fireEvent.press(
      screen.getByTestId(getFeedAudienceOptionTestId('following')),
    );

    expect(
      screen.getByTestId(FeedViewSelectorsIDs.EMPTY_STATE),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(FeedViewSelectorsIDs.LIST),
    ).not.toBeOnTheScreen();
  });

  it('opens the QuickBuy sheet with a CTA haptic when a spot Trade is pressed', () => {
    renderWithProvider(<FeedView />);

    fireEvent.press(screen.getByTestId(getFeedTradeButtonTestId('feed-1')));

    expect(mockPlayImpact).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('mock-quick-buy-open')).toBeOnTheScreen();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to the Perps market detail page when a perps Trade is pressed', () => {
    renderWithProvider(<FeedView />);

    fireEvent.press(screen.getByTestId(getFeedTradeButtonTestId('feed-2')));

    expect(mockPlayImpact).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.PERPS.ROOT,
      expect.objectContaining({
        screen: Routes.PERPS.MARKET_DETAILS,
        params: expect.objectContaining({ source: 'social_feed' }),
      }),
    );
  });
});
