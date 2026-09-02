import React from 'react';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { MOCK_TRADE_ALLOWANCES } from '../../ProHub.constants';
import { MemberPricingOnTradesTestIds } from './MemberPricingOnTrades.testIds';
import TradeAllowanceRow from './TradeAllowanceRow';

const MemberPricingOnTrades = () => (
  <Box twClassName="gap-y-6" testID={MemberPricingOnTradesTestIds.SECTION}>
    <Text
      variant={TextVariant.HeadingMd}
      fontWeight={FontWeight.Bold}
      color={TextColor.TextDefault}
      testID={MemberPricingOnTradesTestIds.TITLE}
    >
      {strings('pro_hub.member_pricing.title')}
    </Text>

    <Box twClassName="gap-y-6">
      {MOCK_TRADE_ALLOWANCES.map((item) => (
        <TradeAllowanceRow key={item.id} item={item} />
      ))}
    </Box>
  </Box>
);

export default MemberPricingOnTrades;
