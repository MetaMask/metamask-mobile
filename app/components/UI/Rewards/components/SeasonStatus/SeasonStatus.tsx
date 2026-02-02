import React from 'react';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  TextVariant,
  Text,
  FontWeight,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import MetamaskRewardsPointsImage from '../../../../../images/rewards/metamask-rewards-points.svg';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import { useSelector } from 'react-redux';
import {
  selectSeasonStatusLoading,
  selectBalanceTotal,
  selectSeasonEndDate,
  selectSeasonName,
  selectSeasonStatusError,
  selectSeasonStartDate,
} from '../../../../../reducers/rewards/selectors';
import { formatNumber, formatTimeRemaining } from '../../utils/formatUtils';
import RewardsErrorBanner from '../RewardsErrorBanner';
import { useSeasonStatus } from '../../hooks/useSeasonStatus';

const SeasonStatus: React.FC = () => {
  const theme = useTheme();
  const { fetchSeasonStatus } = useSeasonStatus({
    onlyForExplicitFetch: false,
  });
  const balanceTotal = useSelector(selectBalanceTotal);
  const seasonStatusLoading = useSelector(selectSeasonStatusLoading);
  const seasonStatusError = useSelector(selectSeasonStatusError);
  const seasonStartDate = useSelector(selectSeasonStartDate);
  const seasonEndDate = useSelector(selectSeasonEndDate);
  const seasonName = useSelector(selectSeasonName);

  const timeRemaining = React.useMemo(() => {
    if (!seasonEndDate) {
      return null;
    }
    return formatTimeRemaining(new Date(seasonEndDate));
  }, [seasonEndDate]);

  if (seasonStatusLoading) {
    return <Skeleton height={78} width="100%" />;
  }

  if (seasonStatusError && !seasonStartDate) {
    return (
      <RewardsErrorBanner
        title={strings('rewards.season_status_error.error_fetching_title')}
        description={strings(
          'rewards.season_status_error.error_fetching_description',
        )}
        onConfirm={() => {
          fetchSeasonStatus();
        }}
        confirmButtonLabel={strings('rewards.season_status_error.retry_button')}
      />
    );
  }

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="px-4 py-4 rounded-xl w-full"
      style={{ backgroundColor: theme.colors.background.section }}
    >
      {/* Left side - Points */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-4 flex-1"
      >
        <MetamaskRewardsPointsImage
          name="MetamaskRewardsPoints"
          width={24}
          height={24}
        />
        <Box flexDirection={BoxFlexDirection.Column}>
          <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Bold}>
            {formatNumber(balanceTotal)}
          </Text>
          <Text variant={TextVariant.BodySm} twClassName="text-alternative">
            {strings('rewards.season_status.points_earned')}
          </Text>
        </Box>
      </Box>

      {/* Right side - Season info */}
      <Box
        flexDirection={BoxFlexDirection.Column}
        alignItems={BoxAlignItems.End}
      >
        {!!seasonName && (
          <Text
            variant={TextVariant.BodySm}
            twClassName="text-default text-right"
          >
            {seasonName}
          </Text>
        )}
        {!!timeRemaining && (
          <Text
            variant={TextVariant.BodySm}
            twClassName="text-alternative text-right"
          >
            {timeRemaining}
          </Text>
        )}
      </Box>
    </Box>
  );
};

export default SeasonStatus;
