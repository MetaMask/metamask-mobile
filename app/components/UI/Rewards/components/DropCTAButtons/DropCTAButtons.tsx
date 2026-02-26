import React, { useCallback, useMemo } from 'react';
import {
  Box,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { DropPrerequisitesDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { selectIsFirstTimePerpsUser } from '../../../Perps/selectors/perpsController';
import {
  SwapBridgeNavigationLocation,
  useSwapBridgeNavigation,
} from '../../../Bridge/hooks/useSwapBridgeNavigation';
import {
  CTA_CONFIG,
  getConditionsWithActivityTypes,
  CTAHandlerParams,
  ConditionWithActivityType,
} from './DropCTAButtons.handlers';

/**
 * Props for the DropCTAButtons component
 */
interface DropCTAButtonsProps {
  /**
   * The prerequisites data containing conditions with activity types
   */
  prerequisites: DropPrerequisitesDto;
}

/**
 * DropCTAButtons displays action buttons based on prerequisite activity types.
 * Enables users to navigate to relevant features (Swap, Perps, Predict, Card, mUSD Deposit, Shield).
 *
 * Layout: 2-column grid at the bottom of the page
 *
 * @example
 * <DropCTAButtons prerequisites={drop.prerequisites} />
 */
const DropCTAButtons: React.FC<DropCTAButtonsProps> = ({ prerequisites }) => {
  const navigation = useNavigation();
  const isFirstTimePerpsUser = useSelector(selectIsFirstTimePerpsUser);

  // Use swap/bridge navigation hook
  const { goToSwaps } = useSwapBridgeNavigation({
    location: SwapBridgeNavigationLocation.Rewards,
    sourcePage: 'drop_detail',
  });

  // Extract conditions with their unique activity types that have CTA handlers
  const conditionsWithActivityTypes = useMemo(
    () => getConditionsWithActivityTypes(prerequisites.conditions),
    [prerequisites.conditions],
  );

  // Create handler params for CTA buttons
  const handlerParams: CTAHandlerParams = useMemo(
    () => ({
      navigation,
      goToSwaps,
      isFirstTimePerpsUser,
    }),
    [navigation, goToSwaps, isFirstTimePerpsUser],
  );

  // Handle CTA button press
  const handleCTAPress = useCallback(
    ({ condition, activityType }: ConditionWithActivityType) => {
      const config = CTA_CONFIG[activityType];
      if (config) {
        config.handler(handlerParams, condition);
      }
    },
    [handlerParams],
  );

  // Don't render if no CTA buttons to show
  if (conditionsWithActivityTypes.length === 0) {
    return null;
  }

  return (
    <Box twClassName="flex-row flex-wrap gap-3 mt-6" testID="drop-cta-buttons">
      {conditionsWithActivityTypes.map(({ condition, activityType }) => {
        const config = CTA_CONFIG[activityType];
        if (!config) {
          return null;
        }

        return (
          <Box
            key={activityType}
            twClassName="w-[48%]"
            testID={`drop-cta-button-container-${activityType}`}
          >
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={() => handleCTAPress({ condition, activityType })}
              testID={`drop-cta-button-${activityType}`}
            >
              {config.label}
            </Button>
          </Box>
        );
      })}
    </Box>
  );
};

export default DropCTAButtons;
