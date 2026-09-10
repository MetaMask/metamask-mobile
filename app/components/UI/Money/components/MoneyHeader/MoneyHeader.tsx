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
import { useProSubscriptionEnabled } from '../../../../../hooks/useProSubscriptionEnabled';
import { useIsProSubscriber } from '../../../../../hooks/useIsProSubscriber';

interface MoneyHeaderProps {
  /**
   * Handler for the options menu button
   */
  onMenuPress: () => void;
  /**
   * Handler for the Pro button. Opens the Pro subscription flow, or the Pro hub
   * when the user is already subscribed.
   * Only fired when the Pro subscription flow flag is enabled.
   */
  onGetProPress: () => void;
}

const MoneyHeader = ({ onMenuPress, onGetProPress }: MoneyHeaderProps) => {
  const { isProSubscriptionEnabled } = useProSubscriptionEnabled();
  const isProSubscriber = useIsProSubscriber();

  const proLabel = isProSubscriber
    ? strings('pro_subscription.pro')
    : strings('pro_subscription.join_pro');

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
          {isProSubscriptionEnabled && (
            <Button
              size={ButtonSize.Md}
              onPress={onGetProPress}
              testID={MoneyHeaderTestIds.GET_PRO_BUTTON}
              accessibilityLabel={proLabel}
            >
              {proLabel}
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
