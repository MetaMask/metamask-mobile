import React from 'react';
import {
  Box,
  Button,
  ButtonIcon,
  ButtonSize,
  HeaderRoot,
  HeaderStandardAnimated,
  IconName,
} from '@metamask/design-system-react-native';
import type { SharedValue } from 'react-native-reanimated';
import { strings } from '../../../../../../locales/i18n';
import GlassCapsule from '../../../../../component-library/components-temp/GlassCapsule';
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
  /** Wraps the icon buttons in glass-style capsules, as on the brand refresh. */
  isCapsule?: boolean;
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
  scrollY?: never;
  titleSectionHeight?: never;
}

export type MoneyHeaderProps = MoneyHeaderCommonProps &
  (MoneyHeaderPushedProps | MoneyHeaderTabProps);

const MoneyHeader = (props: MoneyHeaderProps) => {
  const { onMenuPress, proButton, isCapsule = false } = props;

  const menuButtonProps = {
    iconName: IconName.MoreVertical,
    onPress: onMenuPress,
    accessibilityLabel: 'Menu',
    testID: MoneyHeaderTestIds.MENU_BUTTON,
  };

  const wrapInCapsule = (button: React.ReactNode, testID: string) =>
    isCapsule ? (
      <GlassCapsule twClassName="w-10 justify-center" testID={testID}>
        {button}
      </GlassCapsule>
    ) : (
      button
    );

  const menuButton = wrapInCapsule(
    <ButtonIcon {...menuButtonProps} />,
    MoneyHeaderTestIds.MENU_CAPSULE,
  );

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
      {menuButton}
    </Box>
  ) : isCapsule ? (
    menuButton
  ) : undefined;

  if (props.onBack) {
    return (
      <HeaderStandardAnimated
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
        startAccessory={
          isCapsule
            ? wrapInCapsule(
                <ButtonIcon
                  iconName={IconName.ArrowLeft}
                  onPress={props.onBack}
                  accessibilityLabel={strings('navigation.back')}
                  testID={MoneyHeaderTestIds.BACK_BUTTON}
                />,
                MoneyHeaderTestIds.BACK_CAPSULE,
              )
            : undefined
        }
        endAccessory={endAccessory}
        endButtonIconProps={[menuButtonProps]}
      />
    );
  }

  return (
    <HeaderRoot
      testID={MoneyHeaderTestIds.CONTAINER}
      twClassName="pl-4 pr-3"
      title={strings('money.title')}
      titleProps={{
        testID: MoneyHeaderTestIds.TITLE,
      }}
      endAccessory={
        endAccessory ?? (
          <Box twClassName="flex-row items-center gap-1">{menuButton}</Box>
        )
      }
    />
  );
};

export default MoneyHeader;
