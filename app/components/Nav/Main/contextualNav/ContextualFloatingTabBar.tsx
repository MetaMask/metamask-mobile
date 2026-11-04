import React, { useCallback, useEffect, useState } from 'react';
import { Keyboard, Platform, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import TabBarFloatingItem from '../../../../component-library/components/Navigation/TabBarFloating/TabBarFloatingItem';
import TabBarFloatingSurface from '../../../../component-library/components/Navigation/TabBarFloating/TabBarFloatingSurface';
import { useBlurMaterial } from '../../../../component-library/hooks/useBlurMaterial';
import {
  TAB_BAR_FLOATING_GAP,
  TAB_BAR_FLOATING_HEIGHT,
  TAB_BAR_FLOATING_HORIZONTAL_INSET,
  TAB_BAR_FLOATING_ICON_DIMENSION,
  TAB_BAR_FLOATING_ICON_SIZE,
  TAB_BAR_FLOATING_LABEL_FONT_SIZE,
  TAB_BAR_FLOATING_LABEL_LINE_HEIGHT,
} from '../../../../component-library/components/Navigation/TabBarFloating/TabBarFloating.constants';
import { getTabBarFloatingBottomPadding } from '../../../../component-library/components/Navigation/TabBarFloating/TabBarFloating.utils';
import type { ContextualTab } from './contextualSection';

export interface ContextualFloatingTab<T extends string = ContextualTab> {
  id: T;
  label: string;
  iconName: IconName;
}

export interface ContextualFloatingTabBarProps<
  T extends string = ContextualTab,
> {
  tabs: ContextualFloatingTab<T>[];
  activeTab: T;
  onTabPress: (tab: T) => void;
  onHomePress: () => void;
  testIDPrefix: string;
}

const ROW_STYLE: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: TAB_BAR_FLOATING_GAP,
};

const OVERLAY_STYLE: ViewStyle = {
  zIndex: 50,
  elevation: 50,
};

const PILL_STYLE: ViewStyle = { height: TAB_BAR_FLOATING_HEIGHT };

const CIRCLE_STYLE: ViewStyle = {
  height: TAB_BAR_FLOATING_HEIGHT,
  width: TAB_BAR_FLOATING_HEIGHT,
};

/**
 * Section footer. Same surface, item, and circle as the home floating bar.
 */
const ContextualFloatingTabBar = <T extends string>({
  tabs,
  activeTab,
  onTabPress,
  onHomePress,
  testIDPrefix,
}: ContextualFloatingTabBarProps<T>) => {
  const tw = useTailwind();
  const { bottom: bottomInset } = useSafeAreaInsets();
  const { isBlurAvailable, colorScheme } = useBlurMaterial();
  const [isKeyboardHidden, setIsKeyboardHidden] = useState(true);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return undefined;
    }
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardHidden(false);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardHidden(true);
    });
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const handleTabPress = useCallback(
    (nextTab: T) => {
      playImpact(ImpactMoment.TabChange);
      onTabPress(nextTab);
    },
    [onTabPress],
  );

  const handleHomePress = useCallback(() => {
    playImpact(ImpactMoment.TabChange);
    onHomePress();
  }, [onHomePress]);

  if (!isKeyboardHidden) {
    return null;
  }

  const bottomPadding = getTabBarFloatingBottomPadding(bottomInset);

  return (
    <View
      style={[
        tw.style('absolute bottom-0 left-0 right-0'),
        OVERLAY_STYLE,
        {
          paddingBottom: bottomPadding,
          paddingHorizontal: TAB_BAR_FLOATING_HORIZONTAL_INSET,
        },
      ]}
      testID={`${testIDPrefix}-tab-bar`}
      pointerEvents="box-none"
    >
      <View style={ROW_STYLE} pointerEvents="box-none">
        <TabBarFloatingSurface
          isBlurAvailable={isBlurAvailable}
          colorScheme={colorScheme}
          twClassName="flex-1 flex-row items-center rounded-full p-1"
          style={PILL_STYLE}
          testID={`${testIDPrefix}-tab-pill`}
        >
          {tabs.map((item) => (
            <TabBarFloatingItem
              key={item.id}
              testID={`${testIDPrefix}-tab-${item.id}`}
              iconName={item.iconName}
              label={item.label}
              isActive={activeTab === item.id}
              fullContrast
              onPress={() => handleTabPress(item.id)}
            />
          ))}
        </TabBarFloatingSurface>
        <TabBarFloatingSurface
          isBlurAvailable={isBlurAvailable}
          colorScheme={colorScheme}
          twClassName="items-center justify-center rounded-full"
          style={CIRCLE_STYLE}
        >
          <ButtonAnimated
            onPress={handleHomePress}
            style={tw.style(
              'h-full w-full items-center justify-center rounded-full bg-transparent',
            )}
            testID={`${testIDPrefix}-home-button`}
            accessibilityLabel={strings('bottom_nav.home')}
            accessibilityRole="button"
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
      </View>
    </View>
  );
};

export default ContextualFloatingTabBar;
