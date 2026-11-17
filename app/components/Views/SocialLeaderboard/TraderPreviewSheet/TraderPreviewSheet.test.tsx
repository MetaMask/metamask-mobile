import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { TraderProfileResponse } from '@metamask/social-controllers';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
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

const TERMS_URL = 'https://link.metamask.io/rewards/terms';
const BENEFIT_TITLE = 'Earning 50% rebates on Swaps and Perps';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockDispatch = jest.fn();
const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn();
let mockProfile: TraderProfileResponse | null = null;
let mockReferralOffer: SocialPreviewReferralOffer = {
  status: 'none',
  pendingReferralCode: null,
  benefitTitle: null,
  termsLink: null,
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

jest.mock('../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: () => null,
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
        { children, testID }: { children: React.ReactNode; testID?: string },
        ref: React.Ref<{ onCloseBottomSheet: (callback?: () => void) => void }>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: (callback?: () => void) => callback?.(),
        }));
        return <View testID={testID}>{children}</View>;
      },
    ),
  };
});

jest.mock('../../../UI/SocialFeed/components/TraderAvatar', () => {
  const { View } = jest.requireActual('react-native');
  return ({ testID }: { testID?: string }) => <View testID={testID} />;
});

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
  stats: Partial<TraderProfileResponse['stats']> = {},
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
      ...stats,
    },
  }) as unknown as TraderProfileResponse;

const offerReferral = (
  overrides: Partial<SocialPreviewReferralOffer> = {},
): void => {
  mockReferralOffer = {
    status: 'offered',
    pendingReferralCode: 'CODE1234',
    benefitTitle: BENEFIT_TITLE,
    termsLink: null,
    ...overrides,
  };
};

const openPositionLink = (ownerTraderId = 'trader-1'): void => {
  mockParams = { traderId: 'trader-1', positionId: 'position-1' };
  mockSharedPosition = {
    feedItem: { id: 'composer-position-1' } as SocialV1FeedItem,
    ownerTraderId,
    isLoading: false,
  };
};

describe('TraderPreviewSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProfile = buildProfile();
    mockReferralOffer = {
      status: 'none',
      pendingReferralCode: null,
      benefitTitle: null,
      termsLink: null,
    };
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

  describe('profile link', () => {
    it('shows the handle as the sheet heading', () => {
      render(<TraderPreviewSheet />);

      const handle = screen.getByTestId(TraderPreviewSheetSelectorsIDs.HANDLE);
      expect(handle).toHaveTextContent('@theflyingdutch');
      expect(handle.props.accessibilityRole).toBe('header');
      expect(
        screen.getByTestId(TraderPreviewSheetSelectorsIDs.AVATAR),
      ).toBeOnTheScreen();
    });

    it('shows followers and win rate in the stats card', () => {
      render(<TraderPreviewSheet />);

      expect(
        screen.getByTestId(TraderPreviewSheetSelectorsIDs.FOLLOWERS_COUNT),
      ).toHaveTextContent('11');
      expect(
        screen.getByTestId(TraderPreviewSheetSelectorsIDs.WIN_RATE),
      ).toHaveTextContent('25%');
      expect(
        screen.getByTestId(TraderPreviewSheetSelectorsIDs.STATS_CARD).props
          .accessibilityLabel,
      ).toBe(
        `${strings('social_leaderboard.trader_profile.followers')} 11, ${strings(
          'social_leaderboard.trader_profile.win_rate',
        )} 25%`,
      );
    });

    it('shows a dash when the trader has no win rate yet', () => {
      mockProfile = buildProfile({}, { winRate30d: null } as Partial<
        TraderProfileResponse['stats']
      >);

      render(<TraderPreviewSheet />);

      expect(
        screen.getByTestId(TraderPreviewSheetSelectorsIDs.WIN_RATE),
      ).toHaveTextContent('\u2014');
    });

    it('hides the win rate of a private trader', () => {
      mockProfile = buildProfile({ tradingPrivacy: 'private' } as Partial<
        TraderProfileResponse['profile']
      >);

      render(<TraderPreviewSheet />);

      expect(
        screen.getByTestId(TraderPreviewSheetSelectorsIDs.FOLLOWERS_COUNT),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(TraderPreviewSheetSelectorsIDs.WIN_RATE),
      ).toBeNull();
    });

    it('shows no position card or stats line', () => {
      render(<TraderPreviewSheet />);

      expect(
        screen.queryByTestId(TraderPreviewSheetSelectorsIDs.POSITION_CARD),
      ).toBeNull();
      expect(
        screen.queryByTestId(TraderPreviewSheetSelectorsIDs.STATS_LINE),
      ).toBeNull();
      expect(mockUseSharedPositionPreview).toHaveBeenCalledWith(
        undefined,
        'trader-1',
      );
    });

    it('holds the header and stats card while the profile loads', () => {
      mockProfile = null;

      render(<TraderPreviewSheet />);

      expect(
        screen.getByTestId(TraderPreviewSheetSelectorsIDs.HEADER_SKELETON),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(TraderPreviewSheetSelectorsIDs.STATS_SKELETON),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(TraderPreviewSheetSelectorsIDs.HANDLE),
      ).toBeNull();
    });
  });

  describe('position link', () => {
    it('shows the shared position as a feed card without copy trade', () => {
      openPositionLink();

      render(<TraderPreviewSheet />);

      expect(screen.getByTestId('mock-position-card')).toHaveTextContent(
        'composer-position-1:expanded=true:copy=false',
      );
      expect(mockUseSharedPositionPreview).toHaveBeenCalledWith(
        'position-1',
        'trader-1',
      );
    });

    it('shows followers and win rate on one line instead of the stats card', () => {
      openPositionLink();

      render(<TraderPreviewSheet />);

      expect(
        screen.getByTestId(TraderPreviewSheetSelectorsIDs.STATS_LINE),
      ).toHaveTextContent(
        `${strings('social_leaderboard.trader_profile.followers_count_plural', {
          count: '11',
        })} · ${strings('social_leaderboard.feed.trader_stats.win_rate', {
          winRate: '25%',
        })}`,
      );
      expect(
        screen.queryByTestId(TraderPreviewSheetSelectorsIDs.STATS_CARD),
      ).toBeNull();
    });

    it('leaves the win rate out of the line for a private trader', () => {
      openPositionLink();
      mockProfile = buildProfile({ tradingPrivacy: 'private' } as Partial<
        TraderProfileResponse['profile']
      >);

      render(<TraderPreviewSheet />);

      expect(
        screen.getByTestId(TraderPreviewSheetSelectorsIDs.STATS_LINE),
      ).toHaveTextContent(
        strings('social_leaderboard.trader_profile.followers_count_plural', {
          count: '11',
        }),
      );
    });

    it('holds the stats line, with no stats card, while the profile loads', () => {
      openPositionLink();
      mockProfile = null;

      render(<TraderPreviewSheet />);

      expect(
        screen.getByTestId(TraderPreviewSheetSelectorsIDs.STATS_LINE_SKELETON),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(TraderPreviewSheetSelectorsIDs.STATS_SKELETON),
      ).toBeNull();
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

      openPositionLink();
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
        screen.getByTestId(
          TraderPreviewSheetSelectorsIDs.POSITION_CARD_SKELETON,
        ),
      ).toBeOnTheScreen();
      jest.useRealTimers();
    });

    it('shows the profile of the position owner when the link named another trader', () => {
      openPositionLink('trader-2');

      render(<TraderPreviewSheet />);

      expect(mockUseTraderProfile).toHaveBeenLastCalledWith('trader-2');
    });
  });

  describe('referral', () => {
    it('shows the offered code with the server benefit copy', () => {
      offerReferral();

      render(<TraderPreviewSheet />);

      expect(
        screen.getByTestId(TraderPreviewSheetSelectorsIDs.REFERRAL_CODE),
      ).toHaveTextContent(
        strings('social_leaderboard.trader_preview.referral_code', {
          code: 'CODE1234',
        }),
      );
      expect(
        screen.getByTestId(TraderPreviewSheetSelectorsIDs.REFERRAL_BENEFIT),
      ).toHaveTextContent(BENEFIT_TITLE);
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          interaction_type: 'viewed',
          referral_code: 'CODE1234',
        }),
      );
    });

    it('shows Learn more after the benefit copy', () => {
      offerReferral({ termsLink: { label: 'Learn more', url: TERMS_URL } });

      render(<TraderPreviewSheet />);

      expect(
        screen.getByTestId(TraderPreviewSheetSelectorsIDs.REFERRAL_BENEFIT),
      ).toHaveTextContent(`${BENEFIT_TITLE} Learn more`);
    });

    it('shows Learn more alone without benefit copy', () => {
      offerReferral({
        benefitTitle: null,
        termsLink: { label: 'Learn more', url: TERMS_URL },
      });

      render(<TraderPreviewSheet />);

      expect(
        screen.getByTestId(TraderPreviewSheetSelectorsIDs.REFERRAL_BENEFIT),
      ).toHaveTextContent('Learn more');
    });

    it('shows only the code without benefit copy or terms link', () => {
      offerReferral({ benefitTitle: null });

      render(<TraderPreviewSheet />);

      expect(
        screen.getByTestId(TraderPreviewSheetSelectorsIDs.REFERRAL_CODE),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(TraderPreviewSheetSelectorsIDs.REFERRAL_BENEFIT),
      ).toBeNull();
    });

    it('shows the code for a position link too', () => {
      openPositionLink();
      offerReferral();

      render(<TraderPreviewSheet />);

      expect(
        screen.getByTestId(TraderPreviewSheetSelectorsIDs.REFERRAL_CODE_ROW),
      ).toBeOnTheScreen();
    });

    it('opens the invite terms in the in-app browser from Learn more', () => {
      offerReferral({ termsLink: { label: 'Learn more', url: TERMS_URL } });
      render(<TraderPreviewSheet />);

      fireEvent.press(
        screen.getByTestId(TraderPreviewSheetSelectorsIDs.REFERRAL_TERMS_LINK),
      );

      expect(mockNavigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
        screen: Routes.BROWSER.VIEW,
        params: expect.objectContaining({ newTabUrl: TERMS_URL }),
      });
    });

    it('shows no Learn more link without a terms link', () => {
      offerReferral();

      render(<TraderPreviewSheet />);

      expect(
        screen.queryByTestId(
          TraderPreviewSheetSelectorsIDs.REFERRAL_TERMS_LINK,
        ),
      ).toBeNull();
    });

    it('holds space for the code while the check runs', () => {
      mockReferralOffer = {
        status: 'checking',
        pendingReferralCode: 'CODE1234',
        benefitTitle: null,
        termsLink: null,
      };

      render(<TraderPreviewSheet />);

      expect(
        screen.getByTestId(
          TraderPreviewSheetSelectorsIDs.REFERRAL_CODE_SKELETON,
        ),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(TraderPreviewSheetSelectorsIDs.REFERRAL_CODE_ROW),
      ).toBeNull();
    });

    it('hides the code when it is not offered', () => {
      mockReferralOffer = {
        status: 'none',
        pendingReferralCode: 'CODE1234',
        benefitTitle: null,
        termsLink: null,
      };

      render(<TraderPreviewSheet />);

      expect(
        screen.queryByTestId(TraderPreviewSheetSelectorsIDs.REFERRAL_CODE_ROW),
      ).toBeNull();
      expect(
        screen.queryByTestId(
          TraderPreviewSheetSelectorsIDs.REFERRAL_CODE_SKELETON,
        ),
      ).toBeNull();
    });
  });

  describe('actions', () => {
    it('asks to join Social', () => {
      render(<TraderPreviewSheet />);

      expect(
        screen.getByTestId(TraderPreviewSheetSelectorsIDs.JOIN_BUTTON),
      ).toHaveTextContent(strings('social_leaderboard.trader_preview.join'));
    });

    it('starts onboarding with the offered referral code on join', () => {
      offerReferral();
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
      mockReferralOffer = {
        status: 'none',
        pendingReferralCode: 'CODE1234',
        benefitTitle: null,
        termsLink: null,
      };
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
      mockReferralOffer = {
        status: 'checking',
        pendingReferralCode: 'CODE1234',
        benefitTitle: null,
        termsLink: null,
      };
      render(<TraderPreviewSheet />);

      fireEvent.press(
        screen.getByTestId(TraderPreviewSheetSelectorsIDs.JOIN_BUTTON),
      );

      expect(ensureSocialTermsAccepted).not.toHaveBeenCalled();
    });

    it('drops the link and answers the referral when closed without joining', () => {
      offerReferral();
      const { unmount } = render(<TraderPreviewSheet />);

      fireEvent.press(
        screen.getByTestId(TraderPreviewSheetSelectorsIDs.CLOSE_BUTTON),
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
});
