import React from 'react';
import {
  Box,
  ButtonIcon,
  HeaderRoot,
  HeaderStandardAnimated,
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import type { SharedValue } from 'react-native-reanimated';
import { strings } from '../../../../../../locales/i18n';
import { MoneyHeaderTestIds } from './MoneyHeader.testIds';
import { MoneyMfaTestIds } from '../MoneyMfa/MoneyMfa.testIds';

interface MoneyHeaderCommonProps {
  /**
   * Handler for the options menu button
   */
  onMenuPress: () => void;
  /** Shows the green shield next to the title when 2-step verification is on. */
  isMfaEnabled?: boolean;
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
  const { onMenuPress, isMfaEnabled } = props;

  const menuButtonProps = {
    iconName: IconName.MoreVertical,
    onPress: onMenuPress,
    accessibilityLabel: 'Menu',
    testID: MoneyHeaderTestIds.MENU_BUTTON,
  };

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
      titleAccessory={
        isMfaEnabled ? (
          <Icon
            name={IconName.SecurityTick}
            size={IconSize.Md}
            color={IconColor.SuccessDefault}
            accessibilityLabel={strings('money.mfa.badge_label')}
            testID={MoneyMfaTestIds.HEADER_BADGE}
          />
        ) : undefined
      }
      endAccessory={
        <Box twClassName="flex-row items-center gap-1">
          <ButtonIcon {...menuButtonProps} />
        </Box>
      }
    />
  );
};

export default MoneyHeader;
