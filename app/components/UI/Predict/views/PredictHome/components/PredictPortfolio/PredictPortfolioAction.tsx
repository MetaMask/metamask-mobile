import React from 'react';
import {
  BadgeCount,
  BadgeCountSize,
  Box,
  IconName,
  MainActionButton,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { PREDICT_PORTFOLIO_TEST_IDS } from './PredictPortfolio.testIds';

export interface PredictPortfolioActionProps {
  accessibilityLabel?: string;
  badgeCount?: number;
  disabled?: boolean;
  iconName: IconName;
  label: string;
  onPress: () => void;
  testID?: string;
}

const PredictPortfolioAction: React.FC<PredictPortfolioActionProps> = ({
  accessibilityLabel,
  badgeCount = 0,
  disabled = false,
  iconName,
  label,
  onPress,
  testID,
}) => {
  const tw = useTailwind();
  const showBadge = badgeCount > 0;

  return (
    <Box twClassName="relative flex-1">
      <MainActionButton
        accessibilityLabel={accessibilityLabel ?? label}
        isDisabled={disabled}
        iconName={iconName}
        label={label}
        onPress={onPress}
        testID={testID}
        twClassName="min-h-[74px]"
      />
      {showBadge && (
        <BadgeCount
          count={badgeCount}
          max={99}
          pointerEvents="none"
          size={BadgeCountSize.Md}
          style={tw.style('absolute right-2 top-2')}
          testID={PREDICT_PORTFOLIO_TEST_IDS.ACTION_BADGE}
        />
      )}
    </Box>
  );
};

export default PredictPortfolioAction;
