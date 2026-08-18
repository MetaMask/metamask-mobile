import React from 'react';
import { fireEvent, renderHook, act } from '@testing-library/react-native';
import {
  RobinhoodBanner,
  RobinhoodBannerSurface,
  useRobinhoodBanner,
  ROBINHOOD_BANNER_TEST_ID,
  ROBINHOOD_BANNER_DISMISS_TEST_ID,
} from './RobinhoodBanner';
import StorageWrapper from '../../../store/storage-wrapper';
import Routes from '../../../constants/navigation/Routes';
import {
  ROBINHOOD_EXPLORE_BANNER_DISMISSED,
  ROBINHOOD_SWAPS_BANNER_DISMISSED,
} from '../../../constants/storage';
import { TokenDetailsSource } from '../TokenDetails/constants/constants';
import { NetworkToCaipChainId } from '../NetworkMultiSelector/NetworkMultiSelector.constants';
import renderWithProvider from '../../../util/test/renderWithProvider';

jest.mock('../../../store/storage-wrapper', () => ({
  getItemSync: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({ navigate: mockNavigate }),
  };
});

const mockGetItemSync = jest.mocked(StorageWrapper.getItemSync);
const mockSetItem = jest.mocked(StorageWrapper.setItem);

describe('RobinhoodBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItemSync.mockReturnValue(null);
    mockSetItem.mockResolvedValue(undefined);
  });

  it('renders the title and subtitle copy', () => {
    const { getByText } = renderWithProvider(
      <RobinhoodBanner onDismiss={jest.fn()} onPress={jest.fn()} />,
    );

    expect(getByText('bridge.robinhood_banner_title')).toBeOnTheScreen();
    expect(getByText('bridge.robinhood_banner_subtitle')).toBeOnTheScreen();
  });

  it('calls onPress when the banner is tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = renderWithProvider(
      <RobinhoodBanner onDismiss={jest.fn()} onPress={onPress} />,
    );

    fireEvent.press(getByTestId(ROBINHOOD_BANNER_TEST_ID));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when the close button is tapped', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = renderWithProvider(
      <RobinhoodBanner onDismiss={onDismiss} onPress={jest.fn()} />,
    );

    fireEvent.press(getByTestId(ROBINHOOD_BANNER_DISMISS_TEST_ID));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe('useRobinhoodBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItemSync.mockReturnValue(null);
    mockSetItem.mockResolvedValue(undefined);
  });

  it.each([
    [RobinhoodBannerSurface.Swaps, ROBINHOOD_SWAPS_BANNER_DISMISSED],
    [RobinhoodBannerSurface.ExploreCrypto, ROBINHOOD_EXPLORE_BANNER_DISMISSED],
  ])('reads the dismissal key for the %s surface', (surface, storageKey) => {
    renderHook(() => useRobinhoodBanner(surface));

    expect(mockGetItemSync).toHaveBeenCalledWith(storageKey);
  });

  it('shows the banner when no dismissal is stored', () => {
    const { result } = renderHook(() =>
      useRobinhoodBanner(RobinhoodBannerSurface.ExploreCrypto),
    );

    expect(result.current.shouldShow).toBe(true);
  });

  it('hides the banner when the surface was already dismissed', () => {
    mockGetItemSync.mockReturnValue('true');

    const { result } = renderHook(() =>
      useRobinhoodBanner(RobinhoodBannerSurface.ExploreCrypto),
    );

    expect(result.current.shouldShow).toBe(false);
  });

  it('keeps the Explore banner visible when only the Swaps surface was dismissed', () => {
    mockGetItemSync.mockImplementation((key) =>
      key === ROBINHOOD_SWAPS_BANNER_DISMISSED ? 'true' : null,
    );

    const { result } = renderHook(() =>
      useRobinhoodBanner(RobinhoodBannerSurface.ExploreCrypto),
    );

    expect(result.current.shouldShow).toBe(true);
  });

  it('persists dismissal against the surface key and hides the banner', () => {
    const { result } = renderHook(() =>
      useRobinhoodBanner(RobinhoodBannerSurface.ExploreCrypto),
    );

    act(() => {
      result.current.dismiss();
    });

    expect(mockSetItem).toHaveBeenCalledWith(
      ROBINHOOD_EXPLORE_BANNER_DISMISSED,
      'true',
    );
    expect(result.current.shouldShow).toBe(false);
  });

  it('stays dismissed when persisting the dismissal rejects', async () => {
    mockSetItem.mockRejectedValue(new Error('storage unavailable'));

    const { result } = renderHook(() =>
      useRobinhoodBanner(RobinhoodBannerSurface.ExploreCrypto),
    );

    await act(async () => {
      result.current.dismiss();
    });

    expect(result.current.shouldShow).toBe(false);
  });

  it.each([
    [RobinhoodBannerSurface.Swaps, TokenDetailsSource.BannerRobinhoodSwaps],
    [
      RobinhoodBannerSurface.ExploreCrypto,
      TokenDetailsSource.BannerRobinhoodExplore,
    ],
  ])(
    'navigates to the Robinhood token list attributed to the %s surface',
    (surface, tokenDetailsSource) => {
      const { result } = renderHook(() => useRobinhoodBanner(surface));

      act(() => {
        result.current.handlePress();
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.WALLET.TRENDING_TOKENS_FULL_VIEW,
        {
          initialNetwork: [NetworkToCaipChainId.ROBINHOOD],
          tokenDetailsSource,
        },
      );
    },
  );
});
