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

const mockShowToast = jest.fn();
jest.mock('../../../../../../core/ToastService/ToastService', () => ({
  __esModule: true,
  default: {
    showToast: (...args: unknown[]) => mockShowToast(...args),
  },
}));

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
    expect(mockShowToast).toHaveBeenCalledTimes(1);
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.WATCHLIST_TOKEN_ADDED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'token_details',
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
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.WATCHLIST_TOKEN_REMOVED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'token_details',
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
        asset_type: 'native',
      }),
    );
  });

  it('calls onAfterToggle after a successful press', () => {
    const onAfterToggle = jest.fn();
    const { getByTestId } = render(
      <WatchlistStarButton
        assetId={
          'eip155:1/erc20:0xabc' as `${string}:${string}/${string}:${string}`
        }
        assetType="erc20"
        source="token_details"
        onAfterToggle={onAfterToggle}
      />,
    );

    fireEvent.press(getByTestId('watchlist-star-button'));

    expect(onAfterToggle).toHaveBeenCalledTimes(1);
  });
});
