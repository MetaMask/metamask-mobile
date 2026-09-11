import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonIcon,
  ButtonSize,
  HeaderRoot,
  IconName,
  Text,
  TextVariant,
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
  /**
   * Handler for the back button. Omit it — as the Money tab does — to render
   * the plain title with no back affordance.
   */
  onBack?: () => void;
}

const MoneyHeader = ({
  onMenuPress,
  onGetProPress,
  onBack,
}: MoneyHeaderProps) => {
  const { isProSubscriptionEnabled } = useProSubscriptionEnabled();
  const isProSubscriber = useIsProSubscriber();

  const proLabel = isProSubscriber
    ? strings('pro_subscription.pro')
    : strings('pro_subscription.join_pro');

  return (
    <HeaderRoot
      testID={MoneyHeaderTestIds.CONTAINER}
      twClassName={onBack ? 'pl-1 pr-3' : 'pl-4 pr-3'}
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
    >
      {/* `HeaderRoot` renders children in place of the title row, so this is
          undefined without a back handler to leave the title path untouched. */}
      {onBack ? (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="flex-1 gap-1"
        >
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            onPress={onBack}
            accessibilityLabel={strings('navigation.back')}
            testID={MoneyHeaderTestIds.BACK_BUTTON}
          />
          <Text
            variant={TextVariant.HeadingLg}
            testID={MoneyHeaderTestIds.TITLE}
          >
            {strings('money.title')}
          </Text>
        </Box>
      ) : undefined}
    </HeaderRoot>
  );
};

export default MoneyHeader;
