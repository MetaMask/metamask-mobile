import React, { useCallback } from 'react';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { Box } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { RootStackParamList } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { TraderPositionViewSelectorsIDs } from '../TraderPositionView.testIds';
import ErrorState from '../../../Homepage/components/ErrorState/ErrorState';

interface TraderPositionFallbackProps {
  traderId: string;
  traderName?: string;
}

/**
 * Fallback state rendered when the canonical position cannot be resolved
 * (no match after fetch, or a fetch error). Routes back to the trader's
 * profile page if a traderId is available, otherwise back to the leaderboard.
 */
const TraderPositionFallback: React.FC<TraderPositionFallbackProps> = ({
  traderId,
  traderName,
}) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const handlePrimaryAction = useCallback(() => {
    if (traderId) {
      navigation.navigate(Routes.SOCIAL_LEADERBOARD.PROFILE, {
        traderId,
        traderName: traderName ?? '',
      });
    } else {
      navigation.navigate(Routes.SOCIAL_LEADERBOARD.VIEW);
    }
  }, [navigation, traderId, traderName]);

  const actionLabel = traderId
    ? strings('social_leaderboard.trader_position.fallback_back_to_profile')
    : strings(
        'social_leaderboard.trader_position.fallback_back_to_leaderboard',
      );

  return (
    <Box testID={TraderPositionViewSelectorsIDs.FALLBACK}>
      <ErrorState
        title={strings('social_leaderboard.trader_position.fallback_title')}
        subtitle={strings(
          'social_leaderboard.trader_position.fallback_subtitle',
        )}
        onRetry={handlePrimaryAction}
        actionLabel={actionLabel}
        actionButtonTestID={
          TraderPositionViewSelectorsIDs.FALLBACK_PRIMARY_ACTION
        }
      />
    </Box>
  );
};

export default TraderPositionFallback;
