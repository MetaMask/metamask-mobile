import React, { useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Rive, { Alignment, Fit } from 'rive-react-native';
import I18n, { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import useTooltipModal from '../../../../../components/hooks/useTooltipModal';
import { useRewardsIconAnimation } from '../../../Bridge/hooks/useRewardsIconAnimation';
import { getIntlNumberFormatter } from '../../../../../util/intl';
import {
  RewardPointsDisplayProps,
  RewardDisplayState,
} from './RewardPointsDisplay.types';
import styleSheet from './RewardPointsDisplay.styles';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import/no-commonjs
const RewardsIconAnimation = require('../../../../../animations/rewards_icon_animations.riv');

const RewardPointsDisplay: React.FC<RewardPointsDisplayProps> = ({
  estimatedPoints,
  bonusBips,
  isLoading = false,
  hasError = false,
  shouldShow = true,
  isRefresh = false,
}) => {
  const { openTooltipModal } = useTooltipModal();
  // Determine the display state based on props
  const displayState: RewardDisplayState = useMemo(() => {
    if (!shouldShow) return RewardDisplayState.Preload;
    if (hasError) return RewardDisplayState.ErrorState;
    if (isRefresh) return RewardDisplayState.Refresh;
    if (isLoading) return RewardDisplayState.Loading;
    if (estimatedPoints !== undefined && estimatedPoints > 0) {
      return RewardDisplayState.Loaded;
    }
    return RewardDisplayState.Preload;
  }, [shouldShow, hasError, isRefresh, isLoading, estimatedPoints]);

  const { styles } = useStyles(styleSheet, { state: displayState });

  // Use the existing Bridge rewards icon animation hook
  const { riveRef } = useRewardsIconAnimation({
    isRewardsLoading: isLoading,
    estimatedPoints: estimatedPoints ?? null,
    hasRewardsError: hasError,
    shouldShowRewardsRow: shouldShow,
    isRefresh,
  });

  // Format points display
  const locale = I18n.locale;
  const intlNumberFormatter = getIntlNumberFormatter(locale, {
    maximumFractionDigits: 0,
  });

  const formattedEstimatedPoints = useMemo(() => {
    if (hasError) {
      return strings('perps.unable_to_load');
    }
    if (estimatedPoints !== null && estimatedPoints !== undefined) {
      return intlNumberFormatter.format(Math.floor(estimatedPoints));
    }
    return null;
  }, [hasError, estimatedPoints, intlNumberFormatter]);

  // Simple content rendering with explicit cases
  let displayContent = null;

  if (displayState === RewardDisplayState.ErrorState) {
    displayContent = (
      <View style={styles.contentContainer}>
        <Text variant={TextVariant.BodyMD} style={styles.errorText}>
          {strings('perps.unable_to_load')}
        </Text>
        <TouchableOpacity
          onPress={() =>
            openTooltipModal(
              strings('perps.points_error'),
              strings('perps.points_error_content'),
            )
          }
        >
          <Icon
            name={IconName.Info}
            size={IconSize.Sm}
            color={IconColor.Muted}
          />
        </TouchableOpacity>
      </View>
    );
  } else if (isLoading || displayState === RewardDisplayState.Loading) {
    // Show nothing during loading, just icon
    displayContent = null;
  } else if (
    formattedEstimatedPoints &&
    typeof formattedEstimatedPoints === 'string' &&
    formattedEstimatedPoints.trim()
  ) {
    displayContent = (
      <View style={styles.contentContainer}>
        <Text variant={TextVariant.BodyMD} color={TextColor.Primary}>
          {formattedEstimatedPoints}
        </Text>
        {bonusBips && bonusBips > 0 && typeof bonusBips === 'number' ? (
          <Text variant={TextVariant.BodySM} color={TextColor.Success}>
            {`+${(bonusBips / 100).toFixed(1)}%`}
          </Text>
        ) : null}
      </View>
    );
  }

  // Don't render if shouldn't show
  if (!shouldShow) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Rive Animation Icon */}
      <Rive
        ref={riveRef}
        source={RewardsIconAnimation}
        fit={Fit.FitHeight}
        alignment={Alignment.CenterRight}
        style={styles.riveIcon}
      />

      {/* Points Display Container */}
      <View style={styles.pointsContainer}>{displayContent}</View>
    </View>
  );
};

export default RewardPointsDisplay;
