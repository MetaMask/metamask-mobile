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
  /**
   * Handler for the back button. Omit it — as the Money tab does — to render
   * the plain title with no back affordance.
   */
  onBack?: () => void;
}

const MoneyHeader = ({
  onMenuPress,
  onGetProPress,
  onProHubPress,
  onBack,
}: MoneyHeaderProps) => {
  const proAccess = useMoneyAccountPlusAccess();

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
