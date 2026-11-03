import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import useTooltipModal from '../../../hooks/useTooltipModal';
import MoneyBalanceIcon from '../../../../images/money-balance.svg';

export const REBATE_BANNER_TEST_ID = 'rebate-banner';

export interface RebateBannerProps {
  rebatePercent: number;
  testID?: string;
  textTwClassName?: string;
  twClassName?: string;
}

/**
 * Shared fee rebate presentation for trading confirmations.
 *
 * Product-specific wrappers own eligibility and data fetching. This component
 * only renders the common copy and educational tooltip.
 */
const RebateBanner: React.FC<RebateBannerProps> = ({
  rebatePercent,
  testID = REBATE_BANNER_TEST_ID,
  textTwClassName,
  twClassName,
}) => {
  const { openTooltipModal } = useTooltipModal();

  if (rebatePercent <= 0) {
    return null;
  }

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={2}
      twClassName={`w-full rounded-lg bg-muted px-3 py-2 ${twClassName ?? ''}`}
      testID={testID}
    >
      <MoneyBalanceIcon width={16} height={16} name="money-balance" />
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextDefault}
        twClassName={`flex-1 ${textTwClassName ?? ''}`}
      >
        {strings('rewards.rebate.banner', { percent: rebatePercent })}
      </Text>
      <ButtonIcon
        iconName={IconName.Info}
        size={ButtonIconSize.Sm}
        accessibilityLabel={strings('rewards.rebate.tooltip_title')}
        onPress={() =>
          openTooltipModal(
            strings('rewards.rebate.tooltip_title'),
            strings('rewards.rebate.tooltip_content', {
              percent: rebatePercent,
            }),
          )
        }
      />
    </Box>
  );
};

export default RebateBanner;
