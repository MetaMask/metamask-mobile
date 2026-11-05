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
import GroupedSurface from '../../../../../../../component-library/components-temp/elevation/GroupedSurface';
import { PREDICT_PORTFOLIO_TEST_IDS } from './PredictPortfolio.testIds';

export interface PredictPortfolioActionProps {
  accessibilityLabel?: string;
  badgeCount?: number;
  disabled?: boolean;
  iconName: IconName;
  isGlass?: boolean;
  label: string;
  onPress: () => void;
  testID?: string;
}

const PredictPortfolioAction: React.FC<PredictPortfolioActionProps> = ({
  accessibilityLabel,
  badgeCount = 0,
  disabled = false,
  iconName,
  isGlass: _isGlass = false,
  label,
  onPress,
  testID,
}) => {
  const tw = useTailwind();
  const showBadge = badgeCount > 0;

  const button = (
    <ButtonAnimated
      accessibilityLabel={accessibilityLabel ?? label}
      accessible
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      testID={testID}
      style={({ pressed }) =>
        tw.style(
          'items-center justify-center rounded-2xl px-1 py-3',
          // `flex-1` in the glass column sizes the tile from zero height.
          'grow',
          pressed && !disabled && 'bg-pressed',
          disabled ? 'opacity-50' : 'opacity-100',
        )
      }
    >
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
        positionAnchorShape={BadgeWrapperPositionAnchorShape.Circular}
        positionXOffset={8}
        twClassName="self-center"
      >
        <Icon
          name={iconName}
          size={IconSize.Lg}
          color={IconColor.IconAlternative}
        />
      </BadgeWrapper>
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
  );

  return (
    <GroupedSurface
      radiusClassName="rounded-2xl"
      twClassName="min-w-[68px] grow"
    >
      {button}
    </GroupedSurface>
  );
};

export default PredictPortfolioAction;
