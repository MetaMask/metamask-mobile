import React from 'react';
import { StyleSheet, View } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import TraderAvatar from '../../../Homepage/Sections/TopTraders/components/TraderAvatar';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { TopTrader } from '../../../Homepage/Sections/TopTraders/types';
import { formatSignedUsd } from '../../utils/formatters';
import { ONBOARDING_COLORS } from '../constants';
import { SocialLeaderboardOnboardingSelectorsIDs } from '../SocialLeaderboardOnboarding.testIds';

const AVATAR_SIZE = 48;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: ONBOARDING_COLORS.cardBackground,
    borderWidth: 1,
    borderColor: ONBOARDING_COLORS.cardBorder,
  },
  textColumn: {
    flex: 1,
    minWidth: 0,
  },
});

export interface OnboardingLeaderboardCardProps {
  trader: TopTrader;
  testID?: string;
}

/**
 * Presentational card used on the "Follow the best" onboarding slide. Renders
 * the trader's avatar, username, and weekly PnL using live leaderboard data
 * (the dynamic React Native overlay; the surrounding motion comes from Rive).
 */
const OnboardingLeaderboardCard: React.FC<OnboardingLeaderboardCardProps> = ({
  trader,
  testID,
}) => {
  const pnlText = formatSignedUsd(trader.pnlValue);
  const isPnlPositive = trader.pnlValue >= 0;

  return (
    <View
      style={styles.card}
      testID={
        testID ?? SocialLeaderboardOnboardingSelectorsIDs.LEADERBOARD_CARD
      }
    >
      <View>
        <TraderAvatar
          imageUrl={trader.avatarUri}
          address={trader.address}
          size={AVATAR_SIZE}
          recyclingKey={trader.id}
        />
      </View>
      <View style={styles.textColumn}>
        <Text
          variant={TextVariant.HeadingMD}
          style={{ color: ONBOARDING_COLORS.onBrandText }}
          numberOfLines={1}
        >
          {trader.username}
        </Text>
        <Text
          variant={TextVariant.BodyMD}
          color={isPnlPositive ? TextColor.Success : TextColor.Error}
          numberOfLines={1}
        >
          {pnlText}
        </Text>
      </View>
    </View>
  );
};

export default OnboardingLeaderboardCard;
