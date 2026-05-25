import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import MoreSection from './MoreSection';
import Routes from '../../../../../constants/navigation/Routes';
import { METAMASK_SUPPORT_URL } from '../../../../../constants/urls';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { ActionLocation } from '../../../../../util/analytics/actionButtonTracking';
import { AnalyticsEventBuilder } from '../../../../../util/analytics/AnalyticsEventBuilder';
import { createMockUseAnalyticsHook } from '../../../../../util/test/analyticsMock';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { WalletViewSelectorsIDs } from '../../../Wallet/WalletView.testIds';

const mockNavigate = jest.fn();
const mockTrackEvent = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => '0x1'),
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics');
jest.mocked(useAnalytics).mockReturnValue(
  createMockUseAnalyticsHook({
    trackEvent: mockTrackEvent,
    createEventBuilder: AnalyticsEventBuilder.createEventBuilder,
  }),
);

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

const renderSection = () => render(<MoreSection />);

describe('MoreSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAnalytics).mockReturnValue(
      createMockUseAnalyticsHook({
        trackEvent: mockTrackEvent,
        createEventBuilder: AnalyticsEventBuilder.createEventBuilder,
      }),
    );
  });

  it('renders the More actions', () => {
    renderSection();

    expect(screen.getByText('More')).toBeOnTheScreen();
    expect(screen.getByText('Import a token')).toBeOnTheScreen();
    expect(screen.getByText('Import an NFT')).toBeOnTheScreen();
    expect(screen.getByText('Contact support')).toBeOnTheScreen();
  });

  it('navigates to import token and tracks location', () => {
    renderSection();

    fireEvent.press(
      screen.getByTestId(WalletViewSelectorsIDs.IMPORT_TOKEN_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalledWith('AddAsset', {
      assetType: 'token',
    });
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: MetaMetricsEvents.TOKEN_IMPORT_CLICKED.category,
        properties: expect.objectContaining({
          source: 'manual',
          chain_id: '1',
          location: ActionLocation.HOME,
        }),
      }),
    );
  });

  it('navigates to import NFT and tracks location', () => {
    renderSection();

    fireEvent.press(
      screen.getByTestId(WalletViewSelectorsIDs.IMPORT_NFT_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalledWith('AddAsset', {
      assetType: 'collectible',
    });
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Wallet View',
        properties: expect.objectContaining({
          action: 'Wallet View',
          name: 'Add Collectibles',
          location: ActionLocation.HOME,
        }),
      }),
    );
  });

  it('opens support and tracks location', () => {
    renderSection();

    fireEvent.press(
      screen.getByTestId(
        WalletViewSelectorsIDs.HOMEPAGE_MORE_CONTACT_SUPPORT_BUTTON,
      ),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: {
        url: METAMASK_SUPPORT_URL,
        title: 'Contact support',
      },
    });
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Navigation Drawer',
        properties: expect.objectContaining({
          action: 'Navigation Drawer',
          name: 'Get Help',
          location: ActionLocation.HOME,
        }),
      }),
    );
  });
});
