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
import { MoneyHeaderTestIds } from './MoneyHeader.testIds';
import {
  MoneyAccountPlusAccess,
  useMoneyAccountPlusAccess,
} from '../../../../../hooks/useMoneyAccountPlusAccess';

interface MoneyHeaderCommonProps {
  /**
   * Handler for the options menu button
   */
  onMenuPress: () => void;
  /**
   * Handler for the "Join Pro" button.
   * Only fired for users eligible to subscribe.
   */
  onGetProPress: () => void;
  /**
   * Handler for the "Pro" button.
   * Only fired for users entitled to Money Account Plus.
   */
  onProHubPress: () => void;
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
  const { onMenuPress, onGetProPress, onProHubPress } = props;
  const proAccess = useMoneyAccountPlusAccess();

  const menuButtonProps = {
    iconName: IconName.MoreVertical,
    onPress: onMenuPress,
    accessibilityLabel: 'Menu',
    testID: MoneyHeaderTestIds.MENU_BUTTON,
  };

  let proButton: React.ReactNode;
  if (proAccess === MoneyAccountPlusAccess.Eligible) {
    proButton = (
      <Button
        size={ButtonSize.Md}
        onPress={onGetProPress}
        testID={MoneyHeaderTestIds.GET_PRO_BUTTON}
        accessibilityLabel={strings('pro_subscription.join_pro')}
      >
        {strings('pro_subscription.join_pro')}
      </Button>
    );
  } else if (proAccess === MoneyAccountPlusAccess.Subscriber) {
    proButton = (
      <Button
        size={ButtonSize.Md}
        onPress={onProHubPress}
        testID={MoneyHeaderTestIds.PRO_HUB_BUTTON}
        accessibilityLabel={strings('pro_subscription.view_pro')}
      >
        {strings('pro_subscription.view_pro')}
      </Button>
    );
  }

  // The Pro button is a text button, so it can only go in the end accessory,
  // which takes the menu with it — the header slots the two ButtonIcon paths
  // and the accessory as alternatives rather than siblings.
  const endAccessory = proButton ? (
    <Box twClassName="flex-row items-center gap-1">
      {proButton}
      <ButtonIcon {...menuButtonProps} />
    </Box>
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
          <Box twClassName="flex-row items-center gap-1">
            <ButtonIcon {...menuButtonProps} />
          </Box>
        )
      }
    />
  );
};

export default MoneyHeader;
