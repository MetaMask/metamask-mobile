import React from 'react';
import type { LayoutChangeEvent } from 'react-native';
import {
  Box,
  Button,
  ButtonSize,
  IconName,
} from '@metamask/design-system-react-native';
import type { SharedValue } from 'react-native-reanimated';
import { strings } from '../../../../../../locales/i18n';
import ButtonIconGlass from '../../../../../component-library/components-temp/ButtonIconGlass';
import HeaderRootGlass from '../../../../../component-library/components-temp/HeaderRootGlass';
import HeaderStandardAnimatedGlass from '../../../../../component-library/components-temp/HeaderStandardAnimatedGlass';
import { MoneyHeaderTestIds } from './MoneyHeader.testIds';

/** The Pro entry point, as resolved by the page that owns Pro access. */
export interface MoneyHeaderProButton {
  /** Button copy, which differs for subscribers and non-subscribers. */
  label: string;
  /** Opens the Pro subscription flow, or the Pro hub for a subscriber. */
  onPress: () => void;
}

interface MoneyHeaderCommonProps {
  /**
   * Handler for the options menu button
   */
  onMenuPress: () => void;
  /**
   * The Pro entry point. Omit it to leave the Pro button out entirely — the
   * page decides whether the user may see it, since it also owns where the
   * button goes and what it is called.
   */
  proButton?: MoneyHeaderProButton;
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
  const { onMenuPress, proButton, isGlass = false, onLayout } = props;

  const menuButtonProps = {
    iconName: IconName.MoreVertical,
    onPress: onMenuPress,
    accessibilityLabel: 'Menu',
    testID: MoneyHeaderTestIds.MENU_BUTTON,
  };

  // "Get Pro" is a text button, so it can only go in the end accessory, which
  // takes the menu with it — the header slots the two ButtonIcon paths and the
  // accessory as alternatives rather than siblings.
  const endAccessory = proButton ? (
    <Box twClassName="flex-row items-center gap-1">
      <Button
        size={ButtonSize.Md}
        onPress={proButton.onPress}
        testID={MoneyHeaderTestIds.GET_PRO_BUTTON}
        accessibilityLabel={proButton.label}
      >
        {proButton.label}
      </Button>
      <ButtonIconGlass {...menuButtonProps} isCapsule={isGlass} />
    </Box>
  ) : undefined;

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
        endAccessory={endAccessory}
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
      endAccessory={endAccessory}
      endButtonIconProps={[menuButtonProps]}
    />
  );
};

export default MoneyHeader;
