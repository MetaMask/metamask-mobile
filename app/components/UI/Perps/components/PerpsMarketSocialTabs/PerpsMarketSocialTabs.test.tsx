import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  getPerpsMarketDetailsTabSelector,
  PerpsMarketDetailsViewSelectorsIDs,
} from '../../Perps.testIds';
import PerpsMarketSocialTabs from './PerpsMarketSocialTabs';

const mockTrack = jest.fn();
jest.mock('../../hooks', () => ({
  usePerpsEventTracking: () => ({ track: mockTrack }),
}));

jest.mock('../../../SocialLeaderboard', () => ({
  SocialLeaderboard: () => null,
}));

const renderTabs = (
  props: Partial<React.ComponentProps<typeof PerpsMarketSocialTabs>> = {},
) =>
  renderWithProvider(
    <PerpsMarketSocialTabs
      symbol="ETH"
      overview={<Text>overview content</Text>}
      {...props}
    />,
  );

const pressTab = (tab: 'overview' | 'top_traders' | 'feed') =>
  fireEvent.press(screen.getByTestId(getPerpsMarketDetailsTabSelector(tab)));

describe('PerpsMarketSocialTabs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the tab bar with the overview first', () => {
    renderTabs();

    expect(
      screen.getByTestId(PerpsMarketDetailsViewSelectorsIDs.SOCIAL_TABS),
    ).toBeOnTheScreen();
    expect(screen.getByText('overview content')).toBeOnTheScreen();
  });

  it('tells the host which tab opened', () => {
    const onTabChange = jest.fn();
    renderTabs({ onTabChange });

    pressTab('feed');
    pressTab('top_traders');
    pressTab('overview');

    expect(onTabChange.mock.calls).toEqual([
      ['feed'],
      ['top_traders'],
      ['overview'],
    ]);
  });

  it('does not repeat the callback or the event when the active tab is pressed again', () => {
    const onTabChange = jest.fn();
    renderTabs({ onTabChange });

    pressTab('overview');

    expect(onTabChange).not.toHaveBeenCalled();
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('keeps the tab analytics', () => {
    renderTabs();

    pressTab('feed');

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_UI_INTERACTION,
      expect.objectContaining({ tab_name: 'feed', asset: 'ETH' }),
    );
  });

  it('keeps the footer off Feed and shows it on the other tabs', () => {
    renderTabs({ footer: <Text>risk disclaimer</Text> });

    expect(screen.getByText('risk disclaimer')).toBeOnTheScreen();

    pressTab('feed');

    expect(screen.queryByText('risk disclaimer')).toBeNull();

    pressTab('top_traders');

    expect(screen.getByText('risk disclaimer')).toBeOnTheScreen();
  });

  it('hides the overview content once another tab is active', () => {
    renderTabs();

    pressTab('feed');

    expect(screen.queryByText('overview content')).toBeNull();
  });
});
