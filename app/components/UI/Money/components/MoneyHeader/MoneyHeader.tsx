import React from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { IconName } from '@metamask/design-system-react-native';
import type { SharedValue } from 'react-native-reanimated';
import { strings } from '../../../../../../locales/i18n';
import HeaderRootGlass from '../../../../../component-library/components-temp/HeaderRootGlass';
import HeaderStandardAnimatedGlass from '../../../../../component-library/components-temp/HeaderStandardAnimatedGlass';
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
}

/**
 * The pushed Money screen, which carries a back affordance and a title that
 * collapses into the header as the page scrolls.
 */
interface MoneyHeaderPushedProps {
  onBack: () => void;
  /** Scroll offset of the page's animated ScrollView. */
  scrollY: SharedValue<number>;
  /** Measured height of the page's leading section, title included. */
  titleSectionHeight: SharedValue<number>;
}

/** The Money tab, which is rooted in the tab bar and has nothing to go back to. */
interface MoneyHeaderTabProps {
  onBack?: never;
  /** Scroll offset of the page, which fades the glass backdrop in. */
  scrollY?: SharedValue<number>;
  titleSectionHeight?: never;
}

export type MoneyHeaderProps = MoneyHeaderCommonProps &
  (MoneyHeaderPushedProps | MoneyHeaderTabProps);

const MoneyHeader = (props: MoneyHeaderProps) => {
  const { onMenuPress, isGlass = false, onLayout } = props;

  const menuButtonProps = {
    iconName: IconName.MoreVertical,
    onPress: onMenuPress,
    accessibilityLabel: 'Menu',
    testID: MoneyHeaderTestIds.MENU_BUTTON,
    // The icon sits on a glass capsule; the default press fill covers it.
    twClassName: 'bg-transparent',
  };

  if (props.onBack) {
    return (
      <HeaderStandardAnimatedGlass
        isGlass={isGlass}
        onLayout={onLayout}
        includesTopInset={isGlass}
        testID={MoneyHeaderTestIds.CONTAINER}
        title={strings('money.title')}
        titleProps={{
          testID: MoneyHeaderTestIds.TITLE,
        }}
        scrollY={props.scrollY}
        titleSectionHeight={props.titleSectionHeight}
        onBack={props.onBack}
        backButtonProps={{
          accessibilityLabel: strings('navigation.back'),
          testID: MoneyHeaderTestIds.BACK_BUTTON,
        }}
        endButtonIconProps={[menuButtonProps]}
      />
    );
  }

  return (
    <HeaderRootGlass
      isGlass={isGlass}
      onLayout={onLayout}
      includesTopInset={isGlass}
      scrollY={props.scrollY}
      testID={MoneyHeaderTestIds.CONTAINER}
      twClassName="pl-4 pr-3"
      title={strings('money.title')}
      titleProps={{
        testID: MoneyHeaderTestIds.TITLE,
      }}
      endButtonIconProps={[menuButtonProps]}
    />
  );
};

export default MoneyHeader;
