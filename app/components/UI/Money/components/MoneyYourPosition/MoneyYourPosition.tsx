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

const MoneyYourPosition = () => (
  <Box twClassName="px-4 py-3" testID={MoneyYourPositionTestIds.CONTAINER}>
    <MoneySectionHeader title={strings('money.your_position.title')} />

    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.FlexStart}
      twClassName="mt-3"
    >
      <Box twClassName="flex-1" testID={MoneyYourPositionTestIds.EARNING_RATE}>
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
        >
          {strings('money.your_position.earning_rate')}
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
            iconName={IconName.Info}
            size={ButtonIconSize.Sm}
            iconProps={{ color: IconColor.IconAlternative }}
            accessibilityLabel="APY info"
          />
        </Box>
      </Box>

      <Box
        twClassName="flex-1"
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
  </Box>
);

export default MoneyYourPosition;
