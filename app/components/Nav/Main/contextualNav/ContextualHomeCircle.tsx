import React, { useCallback } from 'react';
import { type ViewStyle } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  ButtonAnimated,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../locales/i18n';
import { playImpact, ImpactMoment } from '../../../../util/haptics';
import TabBarFloatingSurface from '../../../../component-library/components/Navigation/TabBarFloating/TabBarFloatingSurface';
import { useBlurMaterial } from '../../../../component-library/hooks/useBlurMaterial';
import {
  TAB_BAR_FLOATING_HEIGHT,
  TAB_BAR_FLOATING_ICON_DIMENSION,
  TAB_BAR_FLOATING_ICON_SIZE,
  TAB_BAR_FLOATING_LABEL_FONT_SIZE,
  TAB_BAR_FLOATING_LABEL_LINE_HEIGHT,
} from '../../../../component-library/components/Navigation/TabBarFloating/TabBarFloating.constants';

export interface ContextualHomeCircleProps {
  onPress: () => void;
  testID: string;
}

/**
 * Extends the 62pt circle past 44pt / 48dp. The circle already clears both
 * floors; the slop keeps a short miss on the rim.
 */
const CIRCLE_HIT_SLOP = { top: 4, bottom: 4, left: 4, right: 4 };

const CIRCLE_STYLE: ViewStyle = {
  height: TAB_BAR_FLOATING_HEIGHT,
  width: TAB_BAR_FLOATING_HEIGHT,
};

/**
 * Round Home control that sits to the right of a section pill.
 */
const ContextualHomeCircle = ({
  onPress,
  testID,
}: ContextualHomeCircleProps) => {
  const tw = useTailwind();
  const { isBlurAvailable, colorScheme } = useBlurMaterial();

  const handlePress = useCallback(() => {
    playImpact(ImpactMoment.TabChange);
    onPress();
  }, [onPress]);

  return (
    <TabBarFloatingSurface
      isBlurAvailable={isBlurAvailable}
      colorScheme={colorScheme}
      twClassName="items-center justify-center rounded-full"
      style={CIRCLE_STYLE}
    >
      <ButtonAnimated
        onPress={handlePress}
        hitSlop={CIRCLE_HIT_SLOP}
        style={tw.style(
          'h-full w-full items-center justify-center rounded-full bg-transparent',
        )}
        testID={testID}
        accessibilityLabel={strings('bottom_nav.home')}
        accessibilityRole="button"
        accessibilityState={{ selected: false }}
        accessible
      >
        <Icon
          name={IconName.Home}
          size={TAB_BAR_FLOATING_ICON_SIZE}
          color={IconColor.IconDefault}
          style={{
            width: TAB_BAR_FLOATING_ICON_DIMENSION,
            height: TAB_BAR_FLOATING_ICON_DIMENSION,
          }}
        />
        <Text
          variant={TextVariant.BodyXs}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
          numberOfLines={1}
          twClassName="mt-0.5 text-center"
          style={{
            fontSize: TAB_BAR_FLOATING_LABEL_FONT_SIZE,
            lineHeight: TAB_BAR_FLOATING_LABEL_LINE_HEIGHT,
          }}
          maxFontSizeMultiplier={1}
        >
          {strings('bottom_nav.home')}
        </Text>
      </ButtonAnimated>
    </TabBarFloatingSurface>
  );
};

export default ContextualHomeCircle;
