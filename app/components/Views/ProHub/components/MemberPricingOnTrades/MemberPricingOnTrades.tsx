import React from 'react';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  MoneyAccountPlusBenefitsStatus,
  useMoneyAccountPlusBenefits,
} from '../../../../../hooks/useMoneyAccountPlusBenefits';
import type { TradeAllowanceItem } from '../../ProHub.constants';
import { MemberPricingOnTradesTestIds } from './MemberPricingOnTrades.testIds';
import TradeAllowanceRow from './TradeAllowanceRow';

interface MemberPricingOnTradesProps {
  onItemPress: (id: TradeAllowanceItem['id']) => void;
}

const LoadingSkeletons = () => (
  <Box
    twClassName="gap-y-6"
    testID={MemberPricingOnTradesTestIds.LOADING_SKELETON}
  >
    <Skeleton height={72} twClassName="w-full rounded-xl" />
    <Skeleton height={72} twClassName="w-full rounded-xl" />
    <Skeleton height={72} twClassName="w-full rounded-xl" />
  </Box>
);

const MemberPricingOnTrades = ({ onItemPress }: MemberPricingOnTradesProps) => {
  const { status, items, resetsOn, retry } = useMoneyAccountPlusBenefits();

  const showError = status === MoneyAccountPlusBenefitsStatus.Failed;
  const showLoading = status === MoneyAccountPlusBenefitsStatus.Loading;
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

      {showLoading ? <LoadingSkeletons /> : null}

      {showError ? (
        <Box twClassName="gap-y-4" testID={MemberPricingOnTradesTestIds.ERROR}>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('pro_hub.member_pricing.load_error')}
          </Text>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Md}
            onPress={retry}
            testID={MemberPricingOnTradesTestIds.RETRY_BUTTON}
          >
            {strings('pro_hub.member_pricing.retry')}
          </Button>
        </Box>
      ) : null}

      {showRows ? (
        <Box twClassName="gap-y-6">
          {items.map((item) => (
            <TradeAllowanceRow
              key={item.id}
              item={item}
              onPress={onItemPress}
            />
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
