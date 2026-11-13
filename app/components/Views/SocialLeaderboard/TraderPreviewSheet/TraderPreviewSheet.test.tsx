import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { TraderProfileResponse } from '@metamask/social-controllers';
import { strings } from '../../../../../locales/i18n';
import { clearPendingReferralCode } from '../../../../reducers/rewardsMoney';
import { ensureSocialTermsAccepted } from '../terms/socialTermsAcceptance';
import TraderPreviewSheet, {
  POSITION_PREVIEW_WAIT_MS,
} from './TraderPreviewSheet';
import { TraderPreviewSheetSelectorsIDs } from './TraderPreviewSheet.testIds';
import {
  getPendingSocialPreviewTarget,
  setPendingSocialPreviewTarget,
} from './pendingSocialPreviewTarget';
import type { SocialPreviewReferralOffer } from './useSocialPreviewReferralOffer';
import type { SharedPositionPreview } from './useSharedPositionPreview';
import type { SocialV1FeedItem } from '../../../UI/SocialFeed/types';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockDispatch = jest.fn();
const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn();
let mockProfile: TraderProfileResponse | null = null;
let mockReferralOffer: SocialPreviewReferralOffer = {
  status: 'none',
  pendingReferralCode: null,
};
let mockParams: { traderId: string; positionId?: string } = {
  traderId: 'trader-1',
};
let mockSharedPosition: SharedPositionPreview = {
  feedItem: null,
  ownerTraderId: undefined,
  isLoading: false,
};
const mockUseTraderProfile = jest.fn();
const mockSheetClassName = jest.fn();
const mockUseSharedPositionPreview = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}));

jest.mock('../../../../util/navigation/navUtils', () => ({
  useParams: () => mockParams,
}));

// Renders children and runs the close callback right away, without the sheet
// animation.
jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return {
    ...actual,
    BottomSheet: ReactActual.forwardRef(
      (
        {
          children,
          testID,
          twClassName,
        }: {
          children: React.ReactNode;
          testID?: string;
          twClassName?: string;
        },
        ref: React.Ref<{ onCloseBottomSheet: (callback?: () => void) => void }>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: (callback?: () => void) => callback?.(),
        }));
        mockSheetClassName(twClassName);
        return <View testID={testID}>{children}</View>;
      },
    ),
  };
});

jest.mock('../../../UI/SocialFeed/components/TraderAvatar', () => {
  const { View } = jest.requireActual('react-native');
  return ({ testID }: { testID?: string }) => <View testID={testID} />;
});

jest.mock('../components/SkeletonShell', () => ({
  SkeletonShell: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../TraderProfileView/hooks/useTraderProfile', () => ({
  useTraderProfile: (traderId: string) => {
    mockUseTraderProfile(traderId);
    return { profile: mockProfile };
  },
}));

jest.mock('./useSharedPositionPreview', () => ({
  useSharedPositionPreview: (positionId?: string, traderId?: string) => {
    mockUseSharedPositionPreview(positionId, traderId);
    return mockSharedPosition;
  },
}));

jest.mock('../../../UI/SocialFeed/components/SocialFeedPositionCard', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    PositionCardBody: ({
      item,
      expanded,
      showCopyTrade,
    }: {
      item: { id: string };
      expanded?: boolean;
      showCopyTrade?: boolean;
    }) => (
      <Text testID="mock-position-card">
        {`${item.id}:expanded=${String(expanded)}:copy=${String(showCopyTrade)}`}
      </Text>
    ),
  };
});

jest.mock('./useSocialPreviewReferralOffer', () => ({
  useSocialPreviewReferralOffer: () => mockReferralOffer,
}));

jest.mock('../terms/socialTermsAcceptance', () => ({
  ensureSocialTermsAccepted: jest.fn(),
}));

jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: () => ({
      addProperties: (properties: unknown) => {
        mockAddProperties(properties);
        return { build: () => properties };
      },
    }),
  }),
}));

const buildProfile = (
  overrides: Partial<TraderProfileResponse['profile']> = {},
): TraderProfileResponse =>
  ({
    profile: {
      profileId: 'trader-1',
      name: 'theflyingdutch',
      displayName: 'Theflyingdutch',
      address: '0x1234',
      imageUrl: null,
      createdAt: '2026-11-03T00:00:00.000Z',
      tradingPrivacy: 'public',
      ...overrides,
    },
    followerCount: 11,
    followingCount: 8,
    stats: {
      pnl30d: 0.42,
      winRate30d: 0.25,
      medianHoldMinutes: null,
      volumeUsd30d: 228.69,
    },
  }) as unknown as TraderProfileResponse;

describe('TraderPreviewSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProfile = buildProfile();
    mockReferralOffer = { status: 'none', pendingReferralCode: null };
    mockParams = { traderId: 'trader-1' };
    mockSharedPosition = {
      feedItem: null,
      ownerTraderId: undefined,
      isLoading: false,
    };
    setPendingSocialPreviewTarget({
      kind: 'trader',
      traderId: 'trader-1',
      stage: 'previewing',
    });
  });

  afterEach(() => {
    setPendingSocialPreviewTarget(null);
  });

  it('shows the trader profile and 30d performance', () => {
    render(<TraderPreviewSheet />);

    expect(
      screen.getByTestId(TraderPreviewSheetSelectorsIDs.DISPLAY_NAME),
    ).toHaveTextContent('Theflyingdutch');
    expect(
      screen.getByTestId(TraderPreviewSheetSelectorsIDs.HANDLE),
    ).toHaveTextContent('@theflyingdutch');
    expect(
      screen.getByTestId(TraderPreviewSheetSelectorsIDs.FOLLOWERS_COUNT),
    ).toHaveTextContent('11');
    expect(
      screen.getByTestId(TraderPreviewSheetSelectorsIDs.FOLLOWING_COUNT),
    ).toHaveTextContent('8');
    expect(
      screen.getByTestId(TraderPreviewSheetSelectorsIDs.PERFORMANCE_SECTION),
    ).toBeOnTheScreen();
    expect(screen.getByText('25%')).toBeOnTheScreen();
  });

  it('shows realized P&L but not unrealized P&L', () => {
    render(<TraderPreviewSheet />);

    expect(
      screen.getByText(strings('social_leaderboard.my_profile.realized_pnl')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(
        strings('social_leaderboard.my_profile.unrealized_pnl'),
      ),
    ).toBeNull();
  });

  it('shows no position card for a profile link', () => {
    render(<TraderPreviewSheet />);

    expect(
      screen.queryByTestId(TraderPreviewSheetSelectorsIDs.POSITION_CARD),
    ).toBeNull();
    expect(mockUseSharedPositionPreview).toHaveBeenCalledWith(
      undefined,
      'trader-1',
    );
  });

  it('shows the shared position as a feed card without copy trade', () => {
    mockParams = { traderId: 'trader-1', positionId: 'position-1' };
    mockSharedPosition = {
      feedItem: { id: 'composer-position-1' } as SocialV1FeedItem,
      ownerTraderId: 'trader-1',
      isLoading: false,
    };

    render(<TraderPreviewSheet />);

    expect(screen.getByTestId('mock-position-card')).toHaveTextContent(
      'composer-position-1:expanded=true:copy=false',
    );
    expect(mockUseSharedPositionPreview).toHaveBeenCalledWith(
      'position-1',
      'trader-1',
    );
  });

  it('hides performance and asks to join Social for a position link', () => {
    mockParams = { traderId: 'trader-1', positionId: 'position-1' };
    mockSharedPosition = {
      feedItem: { id: 'composer-position-1' } as SocialV1FeedItem,
      ownerTraderId: 'trader-1',
      isLoading: false,
    };

    render(<TraderPreviewSheet />);

    expect(
      screen.getByTestId(TraderPreviewSheetSelectorsIDs.DISPLAY_NAME),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(TraderPreviewSheetSelectorsIDs.PERFORMANCE_SECTION),
    ).toBeNull();
    expect(
      screen.getByTestId(TraderPreviewSheetSelectorsIDs.JOIN_BUTTON),
    ).toHaveTextContent(strings('social_leaderboard.trader_preview.join'));
  });

  it('shows the referral code and still asks to join Social for a position link', () => {
    mockParams = { traderId: 'trader-1', positionId: 'position-1' };
    mockReferralOffer = { status: 'offered', pendingReferralCode: 'CODE1234' };

    render(<TraderPreviewSheet />);

    expect(
      screen.getByTestId(TraderPreviewSheetSelectorsIDs.REFERRAL_CODE),
    ).toHaveTextContent('CODE1234');
    expect(
      screen.getByTestId(TraderPreviewSheetSelectorsIDs.JOIN_BUTTON),
    ).toHaveTextContent(strings('social_leaderboard.trader_preview.join'));
  });

  it('waits for the shared position before opening the sheet', () => {
    mockParams = { traderId: 'trader-1', positionId: 'position-1' };
    mockSharedPosition = {
      feedItem: null,
      ownerTraderId: undefined,
      isLoading: true,
    };

    const { rerender } = render(<TraderPreviewSheet />);

    expect(
      screen.queryByTestId(TraderPreviewSheetSelectorsIDs.CONTAINER),
    ).toBeNull();

    mockSharedPosition = {
      feedItem: { id: 'composer-position-1' } as SocialV1FeedItem,
      ownerTraderId: 'trader-1',
      isLoading: false,
    };
    rerender(<TraderPreviewSheet />);

    expect(
      screen.getByTestId(TraderPreviewSheetSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('mock-position-card')).toBeOnTheScreen();
  });

  it('opens with a card skeleton when the position takes longer than the wait', () => {
    jest.useFakeTimers();
    mockParams = { traderId: 'trader-1', positionId: 'position-1' };
    mockSharedPosition = {
      feedItem: null,
      ownerTraderId: undefined,
      isLoading: true,
    };

    render(<TraderPreviewSheet />);
    act(() => {
      jest.advanceTimersByTime(POSITION_PREVIEW_WAIT_MS);
    });

    expect(
      screen.getByTestId(TraderPreviewSheetSelectorsIDs.POSITION_CARD_SKELETON),
    ).toBeOnTheScreen();
    jest.useRealTimers();
  });

  it('shows the profile of the position owner when the link named another trader', () => {
    mockParams = { traderId: 'trader-1', positionId: 'position-1' };
    mockSharedPosition = {
      feedItem: { id: 'composer-position-1' } as SocialV1FeedItem,
      ownerTraderId: 'trader-2',
      isLoading: false,
    };

    render(<TraderPreviewSheet />);

    expect(mockUseTraderProfile).toHaveBeenLastCalledWith('trader-2');
  });

  it('shows a skeleton while the profile loads', () => {
    mockProfile = null;

    render(<TraderPreviewSheet />);

    expect(
      screen.getByTestId(TraderPreviewSheetSelectorsIDs.HEADER_SKELETON),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(TraderPreviewSheetSelectorsIDs.PERFORMANCE_SECTION),
    ).toBeNull();
  });

  it('holds space for performance while a profile link loads', () => {
    mockProfile = null;

    render(<TraderPreviewSheet />);

    expect(
      screen.getByTestId(TraderPreviewSheetSelectorsIDs.PERFORMANCE_SKELETON),
    ).toBeOnTheScreen();
    expect(mockSheetClassName).toHaveBeenLastCalledWith(undefined);
  });

  it('sizes a position link to its content, with no performance placeholder', () => {
    mockProfile = null;
    mockParams = { traderId: 'trader-1', positionId: 'position-1' };
    mockSharedPosition = {
      feedItem: { id: 'composer-position-1' } as SocialV1FeedItem,
      ownerTraderId: 'trader-1',
      isLoading: false,
    };

    render(<TraderPreviewSheet />);

    expect(mockSheetClassName).toHaveBeenLastCalledWith(undefined);
    expect(
      screen.queryByTestId(TraderPreviewSheetSelectorsIDs.PERFORMANCE_SKELETON),
    ).toBeNull();
  });

  it('holds space for the referral code while the check runs', () => {
    mockReferralOffer = { status: 'checking', pendingReferralCode: 'CODE1234' };

    render(<TraderPreviewSheet />);

    expect(
      screen.getByTestId(TraderPreviewSheetSelectorsIDs.REFERRAL_CODE_SKELETON),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(TraderPreviewSheetSelectorsIDs.REFERRAL_CODE),
    ).toBeNull();
  });

  it('hides performance for a private trader', () => {
    mockProfile = buildProfile({ tradingPrivacy: 'private' } as Partial<
      TraderProfileResponse['profile']
    >);

    render(<TraderPreviewSheet />);

    expect(
      screen.queryByTestId(TraderPreviewSheetSelectorsIDs.PERFORMANCE_SECTION),
    ).toBeNull();
  });

  it('asks to join Social for a profile link without a referral', () => {
    render(<TraderPreviewSheet />);

    expect(
      screen.getByTestId(TraderPreviewSheetSelectorsIDs.JOIN_BUTTON),
    ).toHaveTextContent(strings('social_leaderboard.trader_preview.join'));
  });

  it('shows the referral code and still asks to join Social for a profile link', () => {
    mockReferralOffer = { status: 'offered', pendingReferralCode: 'CODE1234' };

    render(<TraderPreviewSheet />);

    expect(
      screen.getByTestId(TraderPreviewSheetSelectorsIDs.JOIN_BUTTON),
    ).toHaveTextContent(strings('social_leaderboard.trader_preview.join'));
    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        interaction_type: 'viewed',
        referral_code: 'CODE1234',
      }),
    );
    expect(
      screen.getByTestId(TraderPreviewSheetSelectorsIDs.REFERRAL_CODE),
    ).toHaveTextContent('CODE1234');
  });

  it('hides the referral code when it is not offered', () => {
    mockReferralOffer = { status: 'none', pendingReferralCode: 'CODE1234' };

    render(<TraderPreviewSheet />);

    expect(
      screen.queryByTestId(TraderPreviewSheetSelectorsIDs.REFERRAL_CODE_ROW),
    ).toBeNull();
  });

  it('starts onboarding with the offered referral code on join', () => {
    mockReferralOffer = { status: 'offered', pendingReferralCode: 'CODE1234' };
    render(<TraderPreviewSheet />);

    fireEvent.press(
      screen.getByTestId(TraderPreviewSheetSelectorsIDs.JOIN_BUTTON),
    );

    expect(getPendingSocialPreviewTarget()).toEqual({
      kind: 'trader',
      traderId: 'trader-1',
      stage: 'onboarding',
      referralCode: 'CODE1234',
    });
    expect(mockDispatch).toHaveBeenCalledWith(
      clearPendingReferralCode('CODE1234'),
    );
    expect(ensureSocialTermsAccepted).toHaveBeenCalledWith(mockNavigate);
  });

  it('starts onboarding without a referral code when it was not offered', () => {
    mockReferralOffer = { status: 'none', pendingReferralCode: 'CODE1234' };
    render(<TraderPreviewSheet />);

    fireEvent.press(
      screen.getByTestId(TraderPreviewSheetSelectorsIDs.JOIN_BUTTON),
    );

    expect(getPendingSocialPreviewTarget()).toEqual({
      kind: 'trader',
      traderId: 'trader-1',
      stage: 'onboarding',
    });
  });

  it('keeps the join button busy while the referral check runs', () => {
    mockReferralOffer = { status: 'checking', pendingReferralCode: 'CODE1234' };
    render(<TraderPreviewSheet />);

    fireEvent.press(
      screen.getByTestId(TraderPreviewSheetSelectorsIDs.JOIN_BUTTON),
    );

    expect(ensureSocialTermsAccepted).not.toHaveBeenCalled();
  });

  it('drops the link and answers the referral when closed without joining', () => {
    mockReferralOffer = { status: 'offered', pendingReferralCode: 'CODE1234' };
    const { unmount } = render(<TraderPreviewSheet />);

    fireEvent.press(
      screen.getByTestId(TraderPreviewSheetSelectorsIDs.NOT_NOW_BUTTON),
    );
    unmount();

    expect(getPendingSocialPreviewTarget()).toBeNull();
    expect(mockDispatch).toHaveBeenCalledWith(
      clearPendingReferralCode('CODE1234'),
    );
    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({ interaction_type: 'dismissed' }),
    );
    expect(ensureSocialTermsAccepted).not.toHaveBeenCalled();
  });

  it('keeps the link for onboarding when the sheet closes after join', () => {
    const { unmount } = render(<TraderPreviewSheet />);

    fireEvent.press(
      screen.getByTestId(TraderPreviewSheetSelectorsIDs.JOIN_BUTTON),
    );
    unmount();

    expect(getPendingSocialPreviewTarget()?.stage).toBe('onboarding');
  });
});
