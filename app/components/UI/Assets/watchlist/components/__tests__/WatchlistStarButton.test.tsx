import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { selectTokenWatchlistEnabled } from '../../../selectors/featureFlags';

const mockUseSelector = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: (state: unknown) => unknown) =>
    mockUseSelector(selector),
}));

const mockToggle = jest.fn();
const mockUseTokenWatchlist = jest.fn(() => ({
  isWatched: false,
  isLoading: false,
  toggle: mockToggle,
}));
jest.mock('../../hooks/useTokenWatchlist', () => ({
  useTokenWatchlist: (...args: unknown[]) =>
    mockUseTokenWatchlist(...(args as [])),
}));

jest.mock('../../../selectors/featureFlags', () => ({
  selectTokenWatchlistEnabled: jest.fn(),
}));

const mockToast = jest.fn();
jest.mock('@metamask/design-system-react-native', () => {
  const actualDesignSystem = jest.requireActual(
    '@metamask/design-system-react-native',
  );

  return {
    ...actualDesignSystem,
    toast: Object.assign((...args: unknown[]) => mockToast(...args), {
      dismiss: jest.fn(),
    }),
  };
});

const mockTrackEvent = jest.fn();
const mockBuild = jest.fn().mockReturnValue({ event: 'mock' });
const mockAddProperties = jest.fn().mockReturnValue({ build: mockBuild });
const mockCreateEventBuilder = jest
  .fn()
  .mockReturnValue({ addProperties: mockAddProperties });

jest.mock('../../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

import { ToastSeverity } from '@metamask/design-system-react-native';
import WatchlistStarButton from '../WatchlistStarButton';

describe('WatchlistStarButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectTokenWatchlistEnabled) return true;
      return undefined;
    });
    mockUseTokenWatchlist.mockReturnValue({
      isWatched: false,
      isLoading: false,
      toggle: mockToggle,
    });
  });

  it('returns null when feature flag is off', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectTokenWatchlistEnabled) return false;
      return undefined;
    });

    const { toJSON } = render(
      <WatchlistStarButton
        assetId={
          'eip155:1/erc20:0xabc' as `${string}:${string}/${string}:${string}`
        }
        assetType="erc20"
        source="token_details"
      />,
    );

    expect(toJSON()).toBeNull();
  });

  it('returns null when assetId is null', () => {
    const { toJSON } = render(
      <WatchlistStarButton
        assetId={null}
        assetType="erc20"
        source="token_details"
      />,
    );

    expect(toJSON()).toBeNull();
  });

  it('renders star icon when token is not watched', () => {
    const { getByTestId } = render(
      <WatchlistStarButton
        assetId={
          'eip155:1/erc20:0xabc' as `${string}:${string}/${string}:${string}`
        }
        assetType="erc20"
        source="token_details"
      />,
    );

    expect(getByTestId('watchlist-star-button')).toBeDefined();
  });

  it('calls toggle, shows toast, and fires WATCHLIST_TOKEN_ADDED on press when not watched', () => {
    const { getByTestId } = render(
      <WatchlistStarButton
        assetId={
          'eip155:1/erc20:0xabc' as `${string}:${string}/${string}:${string}`
        }
        assetType="erc20"
        hasBalance
        source="token_details"
      />,
    );

    fireEvent.press(getByTestId('watchlist-star-button'));

    expect(mockToggle).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.any(String),
        severity: ToastSeverity.Success,
        hasNoTimeout: false,
      }),
    );
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.WATCHLIST_TOKEN_ADDED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'token_details',
        asset_id: 'eip155:1/erc20:0xabc',
        asset_type: 'erc20',
        has_balance: true,
      }),
    );
  });

  it('fires WATCHLIST_TOKEN_REMOVED on press when already watched', () => {
    mockUseTokenWatchlist.mockReturnValue({
      isWatched: true,
      isLoading: false,
      toggle: mockToggle,
    });

    const { getByTestId } = render(
      <WatchlistStarButton
        assetId={
          'eip155:1/erc20:0xabc' as `${string}:${string}/${string}:${string}`
        }
        assetType="erc20"
        hasBalance
        source="token_details"
      />,
    );

    fireEvent.press(getByTestId('watchlist-star-button'));

    expect(mockToggle).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.any(String),
        severity: ToastSeverity.Success,
        hasNoTimeout: false,
      }),
    );
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.WATCHLIST_TOKEN_REMOVED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'token_details',
        asset_id: 'eip155:1/erc20:0xabc',
        asset_type: 'erc20',
      }),
    );
    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.not.objectContaining({
        has_balance: expect.anything(),
      }),
    );
  });

  it('passes source and assetType through to analytics', () => {
    const { getByTestId } = render(
      <WatchlistStarButton
        assetId={
          'eip155:1/slip44:60' as `${string}:${string}/${string}:${string}`
        }
        assetType="native"
        source="watchlist_homepage"
      />,
    );

    fireEvent.press(getByTestId('watchlist-star-button'));

    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'watchlist_homepage',
        asset_id: 'eip155:1/slip44:60',
        asset_type: 'native',
      }),
    );
  });
});
