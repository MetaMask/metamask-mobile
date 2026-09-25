import React from 'react';
import {
  BadgeCount,
  BadgeCountSize,
  BadgeWrapper,
  BadgeWrapperPosition,
  BadgeWrapperPositionAnchorShape,
  IconName,
  MainActionButton,
} from '@metamask/design-system-react-native';
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
  const showBadge = badgeCount > 0;

  return (
    <BadgeWrapper
      badge={
        showBadge ? (
          <BadgeCount
            count={badgeCount}
            max={99}
            size={BadgeCountSize.Md}
            testID={PREDICT_PORTFOLIO_TEST_IDS.ACTION_BADGE}
          />
        ) : null
      }
      position={BadgeWrapperPosition.TopRight}
      positionAnchorShape={BadgeWrapperPositionAnchorShape.Rectangular}
      twClassName="flex-1"
      childrenContainerProps={{
        style: { flex: 1 },
      }}
    >
      <MainActionButton
        accessibilityLabel={accessibilityLabel ?? label}
        isDisabled={disabled}
        iconName={iconName}
        label={label}
        onPress={onPress}
        testID={testID}
        twClassName="w-full"
      />
    </BadgeWrapper>
  );
};

export default PredictPortfolioAction;
