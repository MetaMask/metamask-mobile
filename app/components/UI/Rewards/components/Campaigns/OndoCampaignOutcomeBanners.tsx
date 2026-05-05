import React from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import RewardsInfoBanner from '../RewardsInfoBanner';
import type { OndoGmCampaignParticipantOutcomeStatus } from '../../../../../core/Engine/controllers/rewards-controller/types';

export interface WinnerPendingBannerProps {
  onPress: () => void;
}

export const WinnerPendingBanner = React.memo<WinnerPendingBannerProps>(
  ({ onPress }) => (
    <Pressable
      accessibilityLabel={strings(
        'rewards.ondo_outcome_banner.winner_pending.a11y',
      )}
      onPress={onPress}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="bg-muted rounded-xl p-4 gap-3"
      >
        <Box twClassName="flex-1 gap-0.5">
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {strings('rewards.ondo_outcome_banner.winner_pending.title')}
          </Text>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('rewards.ondo_outcome_banner.winner_pending.description')}
          </Text>
        </Box>
        <Icon
          name={IconName.ArrowRight}
          size={IconSize.Sm}
          color={IconColor.IconAlternative}
        />
      </Box>
    </Pressable>
  ),
);

export const WinnerFinalizedBanner = React.memo(() => (
  <RewardsInfoBanner
    title={strings('rewards.ondo_outcome_banner.winner_finalized.title')}
    description={strings(
      'rewards.ondo_outcome_banner.winner_finalized.description',
    )}
  />
));

export const ParticipantFinalizedBanner = React.memo(() => (
  <RewardsInfoBanner
    title={strings('rewards.ondo_outcome_banner.participant_finalized.title')}
    description={strings(
      'rewards.ondo_outcome_banner.participant_finalized.description',
    )}
  />
));

export const ParticipantPendingBanner = React.memo(() => (
  <RewardsInfoBanner
    title={strings('rewards.ondo_outcome_banner.participant_pending.title')}
    description={strings(
      'rewards.ondo_outcome_banner.participant_pending.description',
    )}
  />
));

export interface OndoGmCampaignOutcomeBannerProps {
  outcomeStatus: OndoGmCampaignParticipantOutcomeStatus;
  winnerVerificationCode: string | null | undefined;
  onWinnerPress: () => void;
}

export const OndoGmCampaignOutcomeBanner =
  React.memo<OndoGmCampaignOutcomeBannerProps>(
    ({ outcomeStatus, winnerVerificationCode, onWinnerPress }) => {
      const hasCode = Boolean(winnerVerificationCode);
      const isFinalized = outcomeStatus === 'finalized';
      if (hasCode && !isFinalized)
        return <WinnerPendingBanner onPress={onWinnerPress} />;
      if (hasCode && isFinalized) return <WinnerFinalizedBanner />;
      if (isFinalized) return <ParticipantFinalizedBanner />;
      return <ParticipantPendingBanner />;
    },
  );
