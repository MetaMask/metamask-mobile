import React from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { IconName } from '@metamask/design-system-react-native';
import type { SharedValue } from 'react-native-reanimated';
import { strings } from '../../../../../../locales/i18n';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { MoneyHeaderTestIds } from './MoneyHeader.testIds';

interface MoneyHeaderCommonProps {
  /**
   * Handler for the options menu button
   */
  onMenuPress: () => void;
  /**
   * Floats the header over the page on its glass backdrop, with the buttons in
   * capsules, as on the brand refresh.
   */
  isGlass?: boolean;
  /** Reports the floating header's height; pair with `useHeaderGlassInset`. */
  onLayout?: (event: LayoutChangeEvent) => void;
  /** Scroll offset of the page, which fades the glass backdrop in. */
  scrollY?: SharedValue<number>;
  /**
   * Accepted so existing pushed-screen callers keep compiling. The title stays
   * in the bar, so this no longer drives a collapsing large title.
   */
  titleSectionHeight?: SharedValue<number>;
}

interface MoneyHeaderBackProps {
  onBack?: () => void;
}

export type MoneyHeaderProps = MoneyHeaderCommonProps & MoneyHeaderBackProps;

const MoneyHeader = ({
  onMenuPress,
  isGlass = false,
  onLayout,
  scrollY,
  onBack,
}: MoneyHeaderProps) => {
  const menuButtonProps = {
    iconName: IconName.MoreVertical,
    onPress: onMenuPress,
    accessibilityLabel: 'Menu',
    testID: MoneyHeaderTestIds.MENU_BUTTON,
    // The icon sits on a glass capsule; the default press fill covers it.
    twClassName: 'bg-transparent',
  };

  return (
    <HeaderStandardGlass
      isGlass={isGlass}
      onLayout={onLayout}
      includesTopInset={isGlass}
      scrollY={scrollY}
      testID={MoneyHeaderTestIds.CONTAINER}
      title={strings('money.title')}
      titleProps={{
        testID: MoneyHeaderTestIds.TITLE,
        accessibilityRole: 'header',
      }}
      onBack={onBack}
      backButtonProps={
        onBack
          ? {
              accessibilityLabel: strings('navigation.back'),
              testID: MoneyHeaderTestIds.BACK_BUTTON,
            }
          : undefined
      }
      endButtonIconProps={[menuButtonProps]}
    />
  );
};

export default MoneyHeader;
