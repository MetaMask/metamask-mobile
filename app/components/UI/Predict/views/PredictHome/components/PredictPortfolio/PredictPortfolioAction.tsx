import React from 'react';
import {
  BadgeCount,
  BadgeCountSize,
  BadgeWrapper,
  BadgeWrapperPosition,
  BadgeWrapperPositionAnchorShape,
  ButtonAnimated,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
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
      <ButtonAnimated
        accessibilityLabel={accessibilityLabel ?? label}
        accessible
        disabled={disabled}
        onPress={disabled ? undefined : onPress}
        testID={testID}
        style={({ pressed }) =>
          tw.style(
            'w-full items-center justify-center rounded-2xl px-1 py-3 min-w-[68px]',
            pressed && !disabled ? 'bg-muted-pressed' : 'bg-muted',
            disabled ? 'opacity-50' : 'opacity-100',
          )
        }
      >
        <Icon
          name={iconName}
          size={IconSize.Lg}
          color={IconColor.IconAlternative}
        />
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
          twClassName="mt-0.5 w-full text-center shrink"
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {label}
        </Text>
      </ButtonAnimated>
    </BadgeWrapper>
  );
};

export default PredictPortfolioAction;
