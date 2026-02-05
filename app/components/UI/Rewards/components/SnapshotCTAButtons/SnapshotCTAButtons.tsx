import React, { useCallback, useMemo } from 'react';
import {
  Box,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { SnapshotPrerequisitesDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { selectIsFirstTimePerpsUser } from '../../../Perps/selectors/perpsController';
import {
  SwapBridgeNavigationLocation,
  useSwapBridgeNavigation,
} from '../../../Bridge/hooks/useSwapBridgeNavigation';
import {
  CTA_CONFIG,
  getUniqueActivityTypesWithCTA,
  CTAHandlerParams,
} from './SnapshotCTAButtons.handlers';

/**
 * Props for the SnapshotCTAButtons component
 */
interface SnapshotCTAButtonsProps {
  /**
   * The prerequisites data containing conditions with activity types
   */
  prerequisites: SnapshotPrerequisitesDto;
}

/**
 * SnapshotCTAButtons displays action buttons based on prerequisite activity types.
 * Enables users to navigate to relevant features (Swap, Perps, Predict, Card, mUSD Deposit, Shield).
 *
 * Layout: 2-column grid at the bottom of the page
 *
 * @example
 * <SnapshotCTAButtons prerequisites={snapshot.prerequisites} />
 */
const SnapshotCTAButtons: React.FC<SnapshotCTAButtonsProps> = ({
  prerequisites,
}) => {
  const navigation = useNavigation();
  const isFirstTimePerpsUser = useSelector(selectIsFirstTimePerpsUser);

  // Use swap/bridge navigation hook
  const { goToSwaps } = useSwapBridgeNavigation({
    location: SwapBridgeNavigationLocation.Rewards,
    sourcePage: 'snapshot_detail',
  });

  // Extract unique activity types that have CTA handlers
  const activityTypes = useMemo(
    () => getUniqueActivityTypesWithCTA(prerequisites.conditions),
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
    (activityType: string) => {
      const config = CTA_CONFIG[activityType as keyof typeof CTA_CONFIG];
      if (config) {
        config.handler(handlerParams);
      }
    },
    [handlerParams],
  );

  // Don't render if no CTA buttons to show
  if (activityTypes.length === 0) {
    return null;
  }

  return (
    <Box
      twClassName="flex-row flex-wrap gap-3 mt-6"
      testID="snapshot-cta-buttons"
    >
      {activityTypes.map((activityType) => {
        const config = CTA_CONFIG[activityType];
        if (!config) {
          return null;
        }

        return (
          <Box
            key={activityType}
            twClassName="w-[48%]"
            testID={`snapshot-cta-button-container-${activityType}`}
          >
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              label={config.label}
              onPress={() => handleCTAPress(activityType)}
              testID={`snapshot-cta-button-${activityType}`}
            />
          </Box>
        );
      })}
    </Box>
  );
};

export default SnapshotCTAButtons;
