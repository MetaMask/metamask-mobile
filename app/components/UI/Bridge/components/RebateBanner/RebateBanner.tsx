import React from 'react';
import type { QuoteResponse } from '@metamask/bridge-controller';
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
import { strings } from '../../../../../../locales/i18n';
import useTooltipModal from '../../../../hooks/useTooltipModal';
import MoneyBalanceIcon from '../../../../../images/money-balance.svg';
import { useSwapsRebate } from '../../hooks/useSwapsRebate';

export const REBATE_BANNER_TEST_ID = 'swaps-rebate-banner';

interface RebateBannerProps {
  quote?: QuoteResponse['quote'];
  twClassName?: string;
}

const RebateBanner: React.FC<RebateBannerProps> = ({ quote, twClassName }) => {
  const rebatePercent = useSwapsRebate(quote);
  const { openTooltipModal } = useTooltipModal();

  if (!rebatePercent) {
    return null;
  }

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={2}
      twClassName={`w-full rounded-lg bg-muted px-3 py-2 ${twClassName ?? ''}`}
      testID={REBATE_BANNER_TEST_ID}
    >
      <MoneyBalanceIcon width={16} height={16} name="money-balance" />
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextDefault}
        twClassName="flex-1"
      >
        {strings('bridge.rebate_banner', { percent: rebatePercent })}
      </Text>
      <ButtonIcon
        iconName={IconName.Info}
        size={ButtonIconSize.Sm}
        accessibilityLabel={strings('bridge.rebate_tooltip_title')}
        onPress={() =>
          openTooltipModal(
            strings('bridge.rebate_tooltip_title'),
            strings('bridge.rebate_tooltip_content'),
          )
        }
      />
    </Box>
  );
};

export default RebateBanner;
