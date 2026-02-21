import { Linking } from 'react-native';
import Routes from '../../../../../constants/navigation/Routes';
import { SHIELD_WEBSITE_URL } from '../../../../../constants/shield';
import type {
  PointsEventEarnType,
  DropPrerequisiteDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';

/**
 * Configuration for CTA buttons based on activity type
 */
interface CTAConfig {
  /**
   * Display label for the CTA button
   */
  label: string;

  /**
   * Handler function to execute on button press
   */
  handler: (
    params: CTAHandlerParams,
    prerequisite: DropPrerequisiteDto,
  ) => void;
}

/**
 * Parameters passed to CTA handlers
 */
interface CTAHandlerParams {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: { navigate: (...args: any[]) => void };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  goToSwaps: (...args: any[]) => void;
  isFirstTimePerpsUser?: boolean;
}

/**
 * Navigate to Swaps/Bridge with Unified mode
 */
const handleSwapPress = ({ goToSwaps }: CTAHandlerParams): void => {
  goToSwaps();
};

/**
 * Navigate to Perps - Tutorial for first-time users, Home for returning users
 */
const handlePerpsPress = ({
  navigation,
  isFirstTimePerpsUser,
}: CTAHandlerParams): void => {
  if (isFirstTimePerpsUser) {
    navigation.navigate(Routes.PERPS.TUTORIAL);
  } else {
    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.PERPS_HOME,
    });
  }
};

/**
 * Navigate to Predict market list
 */
const handlePredictPress = ({ navigation }: CTAHandlerParams): void => {
  navigation.navigate(Routes.PREDICT.ROOT, {
    screen: Routes.PREDICT.MARKET_LIST,
  });
};

/**
 * Navigate to Card welcome/onboarding
 */
const handleCardPress = ({ navigation }: CTAHandlerParams): void => {
  navigation.navigate(Routes.CARD.ROOT, {
    screen: Routes.CARD.WELCOME,
  });
};

/**
 * Navigate to Earn mUSD conversion education
 */
const handleMusdDepositPress = ({ navigation }: CTAHandlerParams): void => {
  navigation.navigate(Routes.EARN.ROOT, {
    screen: Routes.EARN.MUSD.CONVERSION_EDUCATION,
  });
};

/**
 * Open Shield website in external browser
 */
const handleShieldPress = (): void => {
  Linking.openURL(SHIELD_WEBSITE_URL);
};

/**
 * Map of activity types to their CTA configurations
 * Only includes activity types that should show CTA buttons
 */
export const CTA_CONFIG: Partial<Record<PointsEventEarnType, CTAConfig>> = {
  SWAP: {
    label: 'Swap',
    handler: handleSwapPress,
  },
  PERPS: {
    label: 'Trade',
    handler: handlePerpsPress,
  },
  PREDICT: {
    label: 'Predict',
    handler: handlePredictPress,
  },
  CARD: {
    label: 'Get Card',
    handler: handleCardPress,
  },
  MUSD_DEPOSIT: {
    label: 'Deposit mUSD',
    handler: handleMusdDepositPress,
  },
  SHIELD: {
    label: 'Shield',
    handler: handleShieldPress,
  },
};

/**
 * Represents a condition with its activity type that has a CTA handler
 */
interface ConditionWithActivityType {
  condition: DropPrerequisiteDto;
  activityType: PointsEventEarnType;
}

/**
 * Gets unique activity types from prerequisite conditions that have CTA handlers,
 * paired with their source conditions.
 *
 * @param conditions - Array of prerequisite conditions
 * @returns Array of objects containing condition and activity type pairs
 */
export const getConditionsWithActivityTypes = (
  conditions: DropPrerequisiteDto[],
): ConditionWithActivityType[] => {
  const seenActivityTypes = new Set<PointsEventEarnType>();
  const result: ConditionWithActivityType[] = [];

  conditions.forEach((condition) => {
    condition.activityTypes.forEach((activityType) => {
      if (CTA_CONFIG[activityType] && !seenActivityTypes.has(activityType)) {
        seenActivityTypes.add(activityType);
        result.push({ condition, activityType });
      }
    });
  });

  return result;
};

export type { CTAConfig, CTAHandlerParams, ConditionWithActivityType };
