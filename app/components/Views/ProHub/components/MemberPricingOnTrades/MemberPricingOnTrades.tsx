import React from 'react';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  MoneyAccountPlusBenefitsStatus,
  useMoneyAccountPlusBenefits,
} from '../../../../../hooks/useMoneyAccountPlusBenefits';
import { MemberPricingOnTradesTestIds } from './MemberPricingOnTrades.testIds';
import TradeAllowanceRow from './TradeAllowanceRow';

const MemberPricingOnTrades = () => {
  const { status, items, resetsOn } = useMoneyAccountPlusBenefits();

  const showRows =
    status === MoneyAccountPlusBenefitsStatus.Ready ||
    status === MoneyAccountPlusBenefitsStatus.Incomplete;

  return (
    <Box twClassName="gap-y-6" testID={MemberPricingOnTradesTestIds.SECTION}>
      <Text
        variant={TextVariant.HeadingMd}
        fontWeight={FontWeight.Bold}
        color={TextColor.TextDefault}
        testID={MemberPricingOnTradesTestIds.TITLE}
      >
        {strings('pro_hub.member_pricing.title')}
      </Text>

      {showRows ? (
        <Box twClassName="gap-y-6">
          {items.map((item) => (
            <TradeAllowanceRow key={item.id} item={item} />
          ))}
        </Box>
      ) : null}

      {showRows && resetsOn ? (
        <Text
          variant={TextVariant.BodyXs}
          color={TextColor.TextAlternative}
          testID={MemberPricingOnTradesTestIds.RESETS_ON}
        >
          {strings('pro_hub.member_pricing.resets_on', { date: resetsOn })}
        </Text>
      ) : null}
    </Box>
  );
};

export default MemberPricingOnTrades;
