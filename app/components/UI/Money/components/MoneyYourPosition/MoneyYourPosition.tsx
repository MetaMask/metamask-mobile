import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconColor,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import MoneySectionHeader from '../MoneySectionHeader';
import { MoneyYourPositionTestIds } from './MoneyYourPosition.testIds';
import { MUSD_CONVERSION_APY } from '../../../Earn/constants/musd';

const HARDCODED_LIFETIME_EARNINGS = '$0.00';
const HARDCODED_AVAILABLE_BALANCE = '$0.00';

const handleCurrentRateTooltipPress = () => {
  // eslint-disable-next-line no-alert
  alert('Under construction 🚧');
};

const handleAvailableBalanceTooltipPress = () => {
  // eslint-disable-next-line no-alert
  alert('Under construction 🚧');
};

const MoneyYourPosition = () => (
  <Box twClassName="px-4 py-3" testID={MoneyYourPositionTestIds.CONTAINER}>
    <MoneySectionHeader title={strings('money.your_position.title')} />

    {/* Top Row */}
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Start}
      twClassName="mt-3"
    >
      <Box
        twClassName="flex-1 gap-0.5"
        testID={MoneyYourPositionTestIds.CURRENT_RATE}
      >
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
        >
          {strings('money.your_position.current_rate')}
        </Text>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-1"
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.SuccessDefault}
          >
            {strings('money.apy_label', {
              percentage: String(MUSD_CONVERSION_APY),
            })}
          </Text>
          <ButtonIcon
            onPress={handleCurrentRateTooltipPress}
            iconName={IconName.Info}
            size={ButtonIconSize.Sm}
            iconProps={{ color: IconColor.IconAlternative }}
            accessibilityLabel="APY info"
          />
        </Box>
      </Box>

      <Box
        twClassName="flex-1 gap-0.5"
        testID={MoneyYourPositionTestIds.LIFETIME_EARNINGS}
      >
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
        >
          {strings('money.your_position.lifetime_earnings')}
        </Text>
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {HARDCODED_LIFETIME_EARNINGS}
        </Text>
      </Box>
    </Box>

    {/* Bottom Row */}
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Start}
      twClassName="mt-3"
    >
      <Box
        twClassName="flex-1 gap-0.5"
        testID={MoneyYourPositionTestIds.AVAILABLE_BALANCE}
      >
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
        >
          {strings('money.your_position.available_balance')}
        </Text>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-1"
        >
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {HARDCODED_AVAILABLE_BALANCE}
          </Text>
          <ButtonIcon
            onPress={handleAvailableBalanceTooltipPress}
            iconName={IconName.Info}
            size={ButtonIconSize.Sm}
            iconProps={{ color: IconColor.IconAlternative }}
            accessibilityLabel="Available balance info"
          />
        </Box>
      </Box>
    </Box>
  </Box>
);

export default MoneyYourPosition;
