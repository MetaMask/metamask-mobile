import { createElement, type ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { getVersion } from 'react-native-device-info';
import type { Json } from '@metamask/utils';
import type { Position } from '@metamask/perps-controller';
import type { Position as SocialPosition } from '@metamask/social-controllers';
import { getDefaultProfileControllerState } from '@metamask/profile-controller';
import Routes from '../../../../constants/navigation/Routes';
import type { RootState } from '../../../../reducers';
import { PERPS_SOCIAL_ENABLED_FLAG_KEY } from '../selectors/featureFlags';
import {
  SOCIAL_V1_AB_KEY,
  SocialV1Variant,
} from '../../../Views/SocialLeaderboard/SocialV1View/abTestConfig';
import { usePerpsSharePosition } from './usePerpsSharePosition';

const PERPS_ACCOUNT_ADDRESS = '0x0000000000000000000000000000000000000001';
const OTHER_ACCOUNT_ADDRESS = '0x0000000000000000000000000000000000000002';
let mockSelectedAccountAddress = PERPS_ACCOUNT_ADDRESS;

const mockNavigate = jest.fn();
const mockGetSessionProfile = jest.fn();
const mockFetchAndUpdateProfile = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  context: {
    AuthenticationController: {
      getSessionProfile: () => mockGetSessionProfile(),
    },
    ProfileController: {
      fetchAndUpdateProfile: (profileId: string) =>
        mockFetchAndUpdateProfile(profileId),
    },
  },
}));

jest.mock('../../../../selectors/multichainAccounts/accounts', () => ({
  ...jest.requireActual('../../../../selectors/multichainAccounts/accounts'),
  selectSelectedInternalAccountByScope: () => () => ({
    address: mockSelectedAccountAddress,
  }),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockTraderPositionsState: {
  openPositions: SocialPosition[];
  isLoadingOpen: boolean;
} = {
  openPositions: [],
  isLoadingOpen: false,
};

jest.mock(
  '../../../Views/SocialLeaderboard/TraderProfileView/hooks/useTraderPositions',
  () => ({
    useTraderPositions: () => ({
      openPositions: mockTraderPositionsState.openPositions,
      closedPositions: [],
      isLoadingOpen: mockTraderPositionsState.isLoadingOpen,
      isLoadingClosed: false,
      error: null,
      openError: null,
      closedError: null,
      refetch: jest.fn(),
    }),
  }),
);

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const position = {
  symbol: 'ETH',
  size: '2.5',
} as Position;
const marketPrice = '2900';

const socialProfile = {
  profileId: 'profile-1',
  username: 'trader',
  displayName: 'trader',
  bio: '',
  linkedAddresses: [`eip155:1:${PERPS_ACCOUNT_ADDRESS}`],
  avatarUrl: '',
  tradingPrivacy: 'public',
  connectedToX: false,
  createdAt: '',
  updatedAt: '',
};

const indexedEthLong = {
  tokenSymbol: 'ETH',
  chain: 'hyperliquid',
  perpPositionType: 'long',
} as SocialPosition;

let activeState: RootState;

const publishSocialProfile = () => {
  activeState = {
    ...activeState,
    engine: {
      ...activeState.engine,
      backgroundState: {
        ...activeState.engine.backgroundState,
        ProfileController: {
          profile: socialProfile,
        },
      },
    },
  } as RootState;
};

const sheetNavigation = [
  Routes.PERPS.MODALS.ROOT,
  {
    screen: Routes.PERPS.MODALS.SHARE_POSITION,
    params: {
      position,
      marketPrice,
      accountAddress: PERPS_ACCOUNT_ADDRESS,
      socialPosition: indexedEthLong,
    },
  },
];
const pnlCardNavigation = [
  Routes.PERPS.PNL_HERO_CARD,
  { position, marketPrice },
];

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });

const createDeferred = <T>() => {
  let resolve: (value: T) => void = () => undefined;
  let reject: (error: unknown) => void = () => undefined;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
};

const renderWithGates = (
  {
    perpsSocialEnabled = true,
    socialLeaderboardEnabled = true,
    hasSocialProfile = true,
    isSignedIn = true,
  }: {
    perpsSocialEnabled?: boolean;
    socialLeaderboardEnabled?: boolean;
    hasSocialProfile?: boolean;
    isSignedIn?: boolean;
  } = {},
  queryClient = createQueryClient(),
) => {
  const remoteFeatureFlags: Record<string, Json> = {
    [PERPS_SOCIAL_ENABLED_FLAG_KEY]: {
      enabled: perpsSocialEnabled,
      minimumVersion: '0.0.0',
    },
    [SOCIAL_V1_AB_KEY]: SocialV1Variant.Treatment,
    aiSocialLeaderboardEnabled: {
      enabled: socialLeaderboardEnabled,
      minimumVersion: '0.0.0',
    },
  };
  const state = {
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          remoteFeatureFlags,
          cacheTimestamp: 0,
        },
        AuthenticationController: { isSignedIn },
        ProfileController: hasSocialProfile
          ? { profile: socialProfile }
          : getDefaultProfileControllerState(),
      },
    },
  } as unknown as RootState;
  activeState = state;
  mockUseSelector.mockImplementation((selector) => selector(activeState));

  return renderHook(() => usePerpsSharePosition(), {
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children),
  });
};

const flushQueries = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

describe('usePerpsSharePosition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectedAccountAddress = PERPS_ACCOUNT_ADDRESS;
    jest.mocked(getVersion).mockReturnValue('8.17.0');
    mockTraderPositionsState.openPositions = [indexedEthLong];
    mockTraderPositionsState.isLoadingOpen = false;
    mockGetSessionProfile.mockResolvedValue({
      profileId: 'session-profile-id',
    });
    mockFetchAndUpdateProfile.mockImplementation(async () => {
      publishSocialProfile();
      return socialProfile;
    });
  });

  it('opens the Share position sheet with the Perps account when the user can post to the Social feed', () => {
    const { result } = renderWithGates();

    result.current.sharePosition(position, marketPrice);

    expect(mockNavigate).toHaveBeenCalledWith(...sheetNavigation);
  });

  it.each([
    [
      'Perps social is off',
      { perpsSocialEnabled: false, hasSocialProfile: false },
    ],
    [
      'the Social leaderboard is off',
      { socialLeaderboardEnabled: false, hasSocialProfile: false },
    ],
    ['the user is signed out', { isSignedIn: false, hasSocialProfile: false }],
  ])('opens the PnL hero card directly when %s', (_, gates) => {
    const { result } = renderWithGates(gates);

    result.current.sharePosition(position, marketPrice);

    expect(mockNavigate).toHaveBeenCalledWith(...pnlCardNavigation);
  });

  it('opens the PnL hero card when Perps social is off even with a Social profile', () => {
    const { result } = renderWithGates({ perpsSocialEnabled: false });

    result.current.sharePosition(position, marketPrice);

    expect(mockNavigate).toHaveBeenCalledWith(...pnlCardNavigation);
  });

  it('loads the Social profile when the Social feed is available and the profile has not loaded', async () => {
    renderWithGates({ hasSocialProfile: false });

    await waitFor(() =>
      expect(mockFetchAndUpdateProfile).toHaveBeenCalledWith(
        'session-profile-id',
      ),
    );
  });

  it('opens the PnL hero card immediately while the profile lookup from screen load is still running', async () => {
    const profileLookup = createDeferred<typeof socialProfile>();
    mockFetchAndUpdateProfile.mockReturnValue(profileLookup.promise);
    const { result } = renderWithGates({ hasSocialProfile: false });
    await waitFor(() => expect(mockFetchAndUpdateProfile).toHaveBeenCalled());

    const bitcoinPosition = { ...position, symbol: 'BTC' } as Position;
    act(() => {
      result.current.sharePosition(position, marketPrice);
      result.current.sharePosition(bitcoinPosition, marketPrice);
    });

    expect(mockNavigate).toHaveBeenNthCalledWith(1, ...pnlCardNavigation);
    expect(mockNavigate).toHaveBeenNthCalledWith(
      2,
      Routes.PERPS.PNL_HERO_CARD,
      {
        position: bitcoinPosition,
        marketPrice,
      },
    );
    expect(mockGetSessionProfile).toHaveBeenCalledTimes(1);
    expect(mockFetchAndUpdateProfile).toHaveBeenCalledTimes(1);
    profileLookup.resolve(socialProfile);
  });

  it('opens the share sheet from the finished screen-load lookup without looking up again', async () => {
    const profileLookup = createDeferred<typeof socialProfile>();
    mockFetchAndUpdateProfile.mockImplementation(async () => {
      publishSocialProfile();
      return profileLookup.promise;
    });
    const { result } = renderWithGates({ hasSocialProfile: false });
    await waitFor(() => expect(mockFetchAndUpdateProfile).toHaveBeenCalled());

    await act(async () => {
      profileLookup.resolve(socialProfile);
    });
    await waitFor(() =>
      expect(result.current.findSocialPosition(position)).toBeDefined(),
    );

    act(() => {
      result.current.sharePosition(position, marketPrice);
    });

    expect(mockNavigate).toHaveBeenCalledWith(...sheetNavigation);
    expect(mockGetSessionProfile).toHaveBeenCalledTimes(1);
    expect(mockFetchAndUpdateProfile).toHaveBeenCalledTimes(1);
  });

  it('opens the PnL hero card when the position belongs to another wallet', () => {
    mockSelectedAccountAddress = OTHER_ACCOUNT_ADDRESS;
    const { result } = renderWithGates();

    result.current.sharePosition(position, marketPrice);

    expect(mockNavigate).toHaveBeenCalledWith(...pnlCardNavigation);
  });

  it('opens the PnL hero card when Social has not indexed the position', () => {
    mockTraderPositionsState.openPositions = [];
    const { result } = renderWithGates();

    result.current.sharePosition(position, marketPrice);

    expect(mockNavigate).toHaveBeenCalledWith(...pnlCardNavigation);
  });

  it('opens the PnL hero card for a position from a provider other than Hyperliquid', () => {
    const lighterPosition = { ...position, providerId: 'lighter' } as Position;
    const { result } = renderWithGates();

    result.current.sharePosition(lighterPosition, marketPrice);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.PNL_HERO_CARD, {
      position: lighterPosition,
      marketPrice,
    });
  });

  it('opens the PnL hero card immediately while the position index is still loading', () => {
    mockTraderPositionsState.isLoadingOpen = true;
    mockTraderPositionsState.openPositions = [];
    const { result } = renderWithGates();

    result.current.sharePosition(position, marketPrice);

    expect(mockNavigate).toHaveBeenCalledWith(...pnlCardNavigation);
  });

  it('opens the PnL hero card immediately when a still-loading index cannot match this wallet', () => {
    mockTraderPositionsState.isLoadingOpen = true;
    mockSelectedAccountAddress = OTHER_ACCOUNT_ADDRESS;
    const { result } = renderWithGates();

    result.current.sharePosition(position, marketPrice);

    expect(mockNavigate).toHaveBeenCalledWith(...pnlCardNavigation);
  });

  it('does not look up the Social profile again when share is tapped after a failed lookup', async () => {
    mockGetSessionProfile.mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderWithGates({ hasSocialProfile: false });
    await waitFor(() => expect(mockGetSessionProfile).toHaveBeenCalledTimes(1));
    await flushQueries();

    act(() => {
      result.current.sharePosition(position, marketPrice);
    });

    expect(mockNavigate).toHaveBeenCalledWith(...pnlCardNavigation);
    expect(mockGetSessionProfile).toHaveBeenCalledTimes(1);
    expect(mockFetchAndUpdateProfile).not.toHaveBeenCalled();
  });

  it('does not keep a failed session lookup as a missing profile when the screen remounts', async () => {
    mockGetSessionProfile.mockRejectedValueOnce(new Error('Network error'));
    const queryClient = createQueryClient();
    const firstMount = renderWithGates(
      { hasSocialProfile: false },
      queryClient,
    );
    await waitFor(() => expect(mockGetSessionProfile).toHaveBeenCalledTimes(1));
    await flushQueries();
    firstMount.unmount();

    renderWithGates({ hasSocialProfile: false }, queryClient);

    await waitFor(() =>
      expect(mockFetchAndUpdateProfile).toHaveBeenCalledWith(
        'session-profile-id',
      ),
    );
    expect(mockGetSessionProfile).toHaveBeenCalledTimes(2);
  });

  it('does not reload a confirmed missing Social profile when the screen remounts', async () => {
    mockFetchAndUpdateProfile.mockRejectedValue(
      new Error('GET_PROFILE_FAILED: 404'),
    );
    const queryClient = createQueryClient();
    const firstMount = renderWithGates(
      { hasSocialProfile: false },
      queryClient,
    );
    await waitFor(() =>
      expect(mockFetchAndUpdateProfile).toHaveBeenCalledTimes(1),
    );
    await flushQueries();
    firstMount.unmount();

    const { result } = renderWithGates(
      { hasSocialProfile: false },
      queryClient,
    );
    await flushQueries();

    expect(mockFetchAndUpdateProfile).toHaveBeenCalledTimes(1);
    result.current.sharePosition(position, marketPrice);
    expect(mockNavigate).toHaveBeenCalledWith(...pnlCardNavigation);
  });

  it.each([
    [
      'Perps social is off',
      { perpsSocialEnabled: false, hasSocialProfile: false },
    ],
    [
      'the Social leaderboard is off',
      { socialLeaderboardEnabled: false, hasSocialProfile: false },
    ],
    ['the user is signed out', { isSignedIn: false, hasSocialProfile: false }],
    ['the profile has already loaded', {}],
  ])('does not load the Social profile when %s', async (_, gates) => {
    renderWithGates(gates);

    await flushQueries();

    expect(mockGetSessionProfile).not.toHaveBeenCalled();
    expect(mockFetchAndUpdateProfile).not.toHaveBeenCalled();
  });
});
