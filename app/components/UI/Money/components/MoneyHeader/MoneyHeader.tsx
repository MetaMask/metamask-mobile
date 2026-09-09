import React from 'react';
import {
  Box,
  Button,
  ButtonIcon,
  ButtonSize,
  HeaderRoot,
  IconName,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { MoneyHeaderTestIds } from './MoneyHeader.testIds';
import {
  MoneyAccountPlusAccess,
  useMoneyAccountPlusAccess,
} from '../../../../../hooks/useMoneyAccountPlusAccess';

interface MoneyHeaderProps {
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

const MoneyHeader = ({
  onMenuPress,
  onGetProPress,
  onProHubPress,
}: MoneyHeaderProps) => {
  const proAccess = useMoneyAccountPlusAccess();

  return (
    <HeaderRoot
      testID={MoneyHeaderTestIds.CONTAINER}
      twClassName="pl-4 pr-3"
      title={strings('money.title')}
      titleProps={{
        testID: MoneyHeaderTestIds.TITLE,
      }}
      endAccessory={
        <Box twClassName="flex-row items-center gap-1">
          {proAccess === MoneyAccountPlusAccess.Eligible && (
            <Button
              size={ButtonSize.Md}
              onPress={onGetProPress}
              testID={MoneyHeaderTestIds.GET_PRO_BUTTON}
              accessibilityLabel={strings('pro_subscription.join_pro')}
            >
              {strings('pro_subscription.join_pro')}
            </Button>
          )}
          {proAccess === MoneyAccountPlusAccess.Subscriber && (
            <Button
              size={ButtonSize.Md}
              onPress={onProHubPress}
              testID={MoneyHeaderTestIds.PRO_HUB_BUTTON}
              accessibilityLabel={strings('pro_subscription.view_pro')}
            >
              {strings('pro_subscription.view_pro')}
            </Button>
          )}
          <ButtonIcon
            iconName={IconName.MoreVertical}
            onPress={onMenuPress}
            accessibilityLabel="Menu"
            testID={MoneyHeaderTestIds.MENU_BUTTON}
          />
        </Box>
      }
    />
  );
};

export default MoneyHeader;
