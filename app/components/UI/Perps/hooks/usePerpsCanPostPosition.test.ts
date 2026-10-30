import { createElement, type ReactNode } from 'react';
import { renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { getVersion } from 'react-native-device-info';
import { getDefaultProfileControllerState } from '@metamask/profile-controller';
import type { Json } from '@metamask/utils';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  type Position,
} from '@metamask/perps-controller';
import type { Position as SocialPosition } from '@metamask/social-controllers';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import type { RootState } from '../../../../reducers';
import { PERPS_SOCIAL_ENABLED_FLAG_KEY } from '../selectors/featureFlags';
import {
  SOCIAL_V1_AB_KEY,
  SocialV1Variant,
} from '../../../Views/SocialLeaderboard/SocialV1View/abTestConfig';
import { PERPS_SHARE_POSITION_INTERACTION_TYPE } from '../Views/PerpsSharePositionView/PerpsSharePositionView.constants';
import {
  findIndexedPerpsSocialPosition,
  getPerpsShareDirection,
  postPerpsPositionToFeed,
  usePerpsCanPostPosition,
} from './usePerpsCanPostPosition';

const LINKED_ADDRESS = '0x0000000000000000000000000000000000000001';
const OTHER_ADDRESS = '0x0000000000000000000000000000000000000002';

const perpsPosition = { symbol: 'ETH', size: '2.5' } as Position;

const indexedEthLong = {
  positionId: 'social-eth-long',
  tokenSymbol: 'ETH',
  chain: 'hyperliquid',
  perpPositionType: 'long',
} as SocialPosition;

const mockTraderPositionsState: {
  openPositions: SocialPosition[];
  isLoadingOpen: boolean;
  address: string;
} = {
  openPositions: [],
  isLoadingOpen: false,
  address: '',
};

jest.mock('../../../../core/Engine', () => ({
  context: {
    AuthenticationController: {
      getSessionProfile: jest.fn(),
    },
    ProfileController: {
      fetchAndUpdateProfile: jest.fn(),
    },
  },
}));

jest.mock('../../../../selectors/multichainAccounts/accounts', () => ({
  ...jest.requireActual('../../../../selectors/multichainAccounts/accounts'),
  selectSelectedInternalAccountByScope: () => () => ({
    address: LINKED_ADDRESS,
  }),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(),
}));

jest.mock(
  '../../../Views/SocialLeaderboard/TraderProfileView/hooks/useTraderPositions',
  () => ({
    useTraderPositions: (address: string) => {
      mockTraderPositionsState.address = address;
      return {
        openPositions: mockTraderPositionsState.openPositions,
        closedPositions: [],
        isLoadingOpen: mockTraderPositionsState.isLoadingOpen,
        isLoadingClosed: false,
        error: null,
        openError: null,
        closedError: null,
        refetch: jest.fn(),
      };
    },
  }),
);

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const renderCanPost = ({
  perpsSocialEnabled = true,
  socialLeaderboardEnabled = true,
  hasSocialProfile = true,
  isSignedIn = true,
}: {
  perpsSocialEnabled?: boolean;
  socialLeaderboardEnabled?: boolean;
  hasSocialProfile?: boolean;
  isSignedIn?: boolean;
} = {}) => {
  const state = {
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          remoteFeatureFlags: {
            [PERPS_SOCIAL_ENABLED_FLAG_KEY]: {
              enabled: perpsSocialEnabled,
              minimumVersion: '0.0.0',
            },
            [SOCIAL_V1_AB_KEY]: SocialV1Variant.Treatment,
            aiSocialLeaderboardEnabled: {
              enabled: socialLeaderboardEnabled,
              minimumVersion: '0.0.0',
            },
          } as Record<string, Json>,
          cacheTimestamp: 0,
        },
        AuthenticationController: { isSignedIn },
        ProfileController: hasSocialProfile
          ? {
              profile: {
                profileId: 'profile-1',
                username: 'trader',
                displayName: 'trader',
                bio: '',
                linkedAddresses: [`eip155:1:${LINKED_ADDRESS}`],
                avatarUrl: '',
                tradingPrivacy: 'public',
                connectedToX: false,
                createdAt: '',
                updatedAt: '',
              },
            }
          : getDefaultProfileControllerState(),
      },
    },
  } as unknown as RootState;
  mockUseSelector.mockImplementation((selector) => selector(state));

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return renderHook(() => usePerpsCanPostPosition(), {
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children),
  });
};

describe('findIndexedPerpsSocialPosition', () => {
  it('returns the open Hyperliquid position with the same symbol and direction', () => {
    expect(
      findIndexedPerpsSocialPosition({
        position: perpsPosition,
        accountAddress: LINKED_ADDRESS,
        linkedAddress: LINKED_ADDRESS,
        openPositions: [indexedEthLong],
      }),
    ).toBe(indexedEthLong);
  });

  it.each([
    ['the symbol differs', { ...indexedEthLong, tokenSymbol: 'BTC' }],
    ['the direction differs', { ...indexedEthLong, perpPositionType: 'short' }],
    ['the chain differs', { ...indexedEthLong, chain: 'lighter' }],
  ])('returns nothing when %s', (_, candidate) => {
    expect(
      findIndexedPerpsSocialPosition({
        position: perpsPosition,
        accountAddress: LINKED_ADDRESS,
        linkedAddress: LINKED_ADDRESS,
        openPositions: [candidate as SocialPosition],
      }),
    ).toBeUndefined();
  });

  it('returns nothing when the position is not on the linked wallet', () => {
    expect(
      findIndexedPerpsSocialPosition({
        position: perpsPosition,
        accountAddress: OTHER_ADDRESS,
        linkedAddress: LINKED_ADDRESS,
        openPositions: [indexedEthLong],
      }),
    ).toBeUndefined();
  });

  it('returns nothing when the position is not a Hyperliquid position', () => {
    expect(
      findIndexedPerpsSocialPosition({
        position: { ...perpsPosition, providerId: 'lighter' },
        accountAddress: LINKED_ADDRESS,
        linkedAddress: LINKED_ADDRESS,
        openPositions: [indexedEthLong],
      }),
    ).toBeUndefined();
  });
});

describe('getPerpsShareDirection', () => {
  it('treats a positive size as long and a negative size as short', () => {
    expect(getPerpsShareDirection(perpsPosition)).toBe('long');
    expect(getPerpsShareDirection({ ...perpsPosition, size: '-1' })).toBe(
      'short',
    );
  });
});

describe('postPerpsPositionToFeed', () => {
  it('tracks the Post to MetaMask interaction and opens the composer', () => {
    const track = jest.fn();
    const openComposer = jest.fn();

    postPerpsPositionToFeed({
      socialPosition: indexedEthLong,
      symbol: 'ETH',
      direction: 'long',
      track,
      openComposer,
    });

    expect(track).toHaveBeenCalledWith(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
        PERPS_SHARE_POSITION_INTERACTION_TYPE.POST_TO_METAMASK,
      [PERPS_EVENT_PROPERTY.ASSET]: 'ETH',
      [PERPS_EVENT_PROPERTY.DIRECTION]: PERPS_EVENT_VALUE.DIRECTION.LONG,
    });
    expect(openComposer).toHaveBeenCalledWith({
      position: indexedEthLong,
      entryPoint: 'perps',
      openFeedAfterPost: true,
    });
  });
});

describe('usePerpsCanPostPosition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getVersion).mockReturnValue('8.17.0');
    mockTraderPositionsState.openPositions = [indexedEthLong];
    mockTraderPositionsState.isLoadingOpen = false;
    mockTraderPositionsState.address = '';
  });

  it('can post when the flags, profile, linked wallet, and indexed position all match', () => {
    const { result } = renderCanPost();

    expect(result.current.canPost(perpsPosition)).toBe(true);
    expect(result.current.findSocialPosition(perpsPosition)).toBe(
      indexedEthLong,
    );
    expect(mockTraderPositionsState.address).toBe(LINKED_ADDRESS);
  });

  it.each([
    ['Perps social is off', { perpsSocialEnabled: false }],
    ['the Social leaderboard is off', { socialLeaderboardEnabled: false }],
    ['the user is signed out', { isSignedIn: false, hasSocialProfile: false }],
    ['the user has no profile', { hasSocialProfile: false }],
  ])('cannot post when %s', (_, gates) => {
    const { result } = renderCanPost(gates);

    expect(result.current.canPost(perpsPosition)).toBe(false);
  });

  it('cannot post when the indexed positions do not match', () => {
    mockTraderPositionsState.openPositions = [];
    const { result } = renderCanPost();

    expect(result.current.canPost(perpsPosition)).toBe(false);
  });

  it('cannot post until the loaded index contains a match', () => {
    mockTraderPositionsState.isLoadingOpen = true;
    mockTraderPositionsState.openPositions = [];
    const { result, rerender } = renderCanPost();

    expect(result.current.canPost(perpsPosition)).toBe(false);

    mockTraderPositionsState.isLoadingOpen = false;
    mockTraderPositionsState.openPositions = [indexedEthLong];
    rerender({});

    expect(result.current.canPost(perpsPosition)).toBe(true);
  });
});
