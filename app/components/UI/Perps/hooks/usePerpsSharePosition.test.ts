import { createElement, type ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { getVersion } from 'react-native-device-info';
import type { Json } from '@metamask/utils';
import type { Position } from '@metamask/perps-controller';
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

const sheetNavigation = [
  Routes.PERPS.MODALS.ROOT,
  {
    screen: Routes.PERPS.MODALS.SHARE_POSITION,
    params: { position, marketPrice, accountAddress: PERPS_ACCOUNT_ADDRESS },
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
  mockUseSelector.mockImplementation((selector) => selector(state));

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
    mockGetSessionProfile.mockResolvedValue({
      profileId: 'session-profile-id',
    });
    mockFetchAndUpdateProfile.mockResolvedValue(socialProfile);
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

  it('waits for a profile lookup in flight, then opens the sheet when the profile arrives', async () => {
    const profileLookup = createDeferred<typeof socialProfile>();
    mockFetchAndUpdateProfile.mockReturnValue(profileLookup.promise);
    const { result } = renderWithGates({ hasSocialProfile: false });
    await waitFor(() => expect(mockFetchAndUpdateProfile).toHaveBeenCalled());

    act(() => {
      result.current.sharePosition(position, marketPrice);
    });
    expect(mockNavigate).not.toHaveBeenCalled();

    await act(async () => {
      profileLookup.resolve(socialProfile);
    });

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith(...sheetNavigation),
    );
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('waits for a profile lookup in flight, then opens the PnL hero card when no profile exists', async () => {
    const profileLookup = createDeferred<typeof socialProfile>();
    mockFetchAndUpdateProfile.mockReturnValue(profileLookup.promise);
    const { result } = renderWithGates({ hasSocialProfile: false });
    await waitFor(() => expect(mockFetchAndUpdateProfile).toHaveBeenCalled());

    act(() => {
      result.current.sharePosition(position, marketPrice);
    });
    expect(mockNavigate).not.toHaveBeenCalled();

    await act(async () => {
      profileLookup.reject(new Error('GET_PROFILE_FAILED: 404'));
    });

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith(...pnlCardNavigation),
    );
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('retries once when the lookup a share is waiting on fails, then opens the sheet', async () => {
    const firstLookup = createDeferred<{ profileId: string }>();
    mockGetSessionProfile.mockReturnValueOnce(firstLookup.promise);
    const { result } = renderWithGates({ hasSocialProfile: false });
    await waitFor(() => expect(mockGetSessionProfile).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.sharePosition(position, marketPrice);
    });
    await act(async () => {
      firstLookup.reject(new Error('Network error'));
    });

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith(...sheetNavigation),
    );
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockGetSessionProfile).toHaveBeenCalledTimes(2);
  });

  it('opens the PnL hero card when the retry for a waiting share also fails', async () => {
    const firstLookup = createDeferred<{ profileId: string }>();
    mockGetSessionProfile
      .mockReturnValueOnce(firstLookup.promise)
      .mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderWithGates({ hasSocialProfile: false });
    await waitFor(() => expect(mockGetSessionProfile).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.sharePosition(position, marketPrice);
    });
    await act(async () => {
      firstLookup.reject(new Error('Network error'));
    });

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith(...pnlCardNavigation),
    );
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockGetSessionProfile).toHaveBeenCalledTimes(2);
  });

  it('keeps a single retry when share is tapped again while the retry is in flight', async () => {
    const firstLookup = createDeferred<{ profileId: string }>();
    const retryLookup = createDeferred<{ profileId: string }>();
    mockGetSessionProfile
      .mockReturnValueOnce(firstLookup.promise)
      .mockReturnValueOnce(retryLookup.promise);
    const { result } = renderWithGates({ hasSocialProfile: false });
    await waitFor(() => expect(mockGetSessionProfile).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.sharePosition(position, marketPrice);
    });
    await act(async () => {
      firstLookup.reject(new Error('Network error'));
    });
    await waitFor(() => expect(mockGetSessionProfile).toHaveBeenCalledTimes(2));

    act(() => {
      result.current.sharePosition(position, marketPrice);
    });
    await act(async () => {
      retryLookup.reject(new Error('Network error'));
    });

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith(...pnlCardNavigation),
    );
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockGetSessionProfile).toHaveBeenCalledTimes(2);
  });

  it('keeps the sharing account when the selected account changes during the profile lookup', async () => {
    const profileLookup = createDeferred<typeof socialProfile>();
    mockFetchAndUpdateProfile.mockReturnValue(profileLookup.promise);
    mockSelectedAccountAddress = OTHER_ACCOUNT_ADDRESS;
    const { result, rerender } = renderWithGates({ hasSocialProfile: false });
    await waitFor(() => expect(mockFetchAndUpdateProfile).toHaveBeenCalled());

    act(() => {
      result.current.sharePosition(position, marketPrice);
    });
    mockSelectedAccountAddress = PERPS_ACCOUNT_ADDRESS;
    rerender({});
    await act(async () => {
      profileLookup.resolve(socialProfile);
    });

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.MODALS.ROOT, {
        screen: Routes.PERPS.MODALS.SHARE_POSITION,
        params: {
          position,
          marketPrice,
          accountAddress: OTHER_ACCOUNT_ADDRESS,
        },
      }),
    );
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('retries a failed session lookup on share and recovers to the sheet', async () => {
    mockGetSessionProfile.mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderWithGates({ hasSocialProfile: false });
    await waitFor(() => expect(mockGetSessionProfile).toHaveBeenCalledTimes(1));
    await flushQueries();
    expect(mockFetchAndUpdateProfile).not.toHaveBeenCalled();

    act(() => {
      result.current.sharePosition(position, marketPrice);
    });

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith(...sheetNavigation),
    );
    expect(mockGetSessionProfile).toHaveBeenCalledTimes(2);
    expect(mockFetchAndUpdateProfile).toHaveBeenCalledWith(
      'session-profile-id',
    );
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
