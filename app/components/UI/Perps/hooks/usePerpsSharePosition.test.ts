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

const mockNavigate = jest.fn();
const mockGetSessionProfileId = jest.fn();
const mockFetchAndUpdateProfile = jest.fn();

jest.mock(
  '../../../../util/notifications/utils/get-session-profile-id',
  () => ({
    getSessionProfileId: () => mockGetSessionProfileId(),
  }),
);

jest.mock('../../../../core/Engine', () => ({
  context: {
    ProfileController: {
      fetchAndUpdateProfile: (profileId: string) =>
        mockFetchAndUpdateProfile(profileId),
    },
  },
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
  linkedAddresses: ['eip155:1:0x0000000000000000000000000000000000000001'],
  avatarUrl: '',
  tradingPrivacy: 'public',
  connectedToX: false,
  createdAt: '',
  updatedAt: '',
};

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });

const renderWithGates = (
  {
    perpsSocialEnabled = true,
    socialLeaderboardEnabled = true,
    hasSocialProfile = true,
  }: {
    perpsSocialEnabled?: boolean;
    socialLeaderboardEnabled?: boolean;
    hasSocialProfile?: boolean;
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

describe('usePerpsSharePosition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getVersion).mockReturnValue('8.17.0');
    mockGetSessionProfileId.mockResolvedValue('session-profile-id');
    mockFetchAndUpdateProfile.mockResolvedValue(socialProfile);
  });

  it('opens the Share position sheet when the user can post to the Social feed', () => {
    const { result } = renderWithGates();

    result.current.sharePosition(position, marketPrice);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.MODALS.ROOT, {
      screen: Routes.PERPS.MODALS.SHARE_POSITION,
      params: { position, marketPrice },
    });
  });

  it.each([
    ['Perps social is off', { perpsSocialEnabled: false }],
    ['the Social leaderboard is off', { socialLeaderboardEnabled: false }],
    ['the user has no Social profile', { hasSocialProfile: false }],
  ])('opens the PnL hero card directly when %s', (_, gates) => {
    const { result } = renderWithGates(gates);

    result.current.sharePosition(position, marketPrice);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.PNL_HERO_CARD, {
      position,
      marketPrice,
    });
  });

  it('loads the Social profile when the Social feed is available and the profile has not loaded', async () => {
    renderWithGates({ hasSocialProfile: false });

    await waitFor(() =>
      expect(mockFetchAndUpdateProfile).toHaveBeenCalledWith(
        'session-profile-id',
      ),
    );
  });

  it('does not reload a missing Social profile when the screen remounts', async () => {
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
    firstMount.unmount();

    renderWithGates({ hasSocialProfile: false }, queryClient);
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockFetchAndUpdateProfile).toHaveBeenCalledTimes(1);
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
    ['the profile has already loaded', {}],
  ])('does not load the Social profile when %s', async (_, gates) => {
    renderWithGates(gates);

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockGetSessionProfileId).not.toHaveBeenCalled();
    expect(mockFetchAndUpdateProfile).not.toHaveBeenCalled();
  });
});
