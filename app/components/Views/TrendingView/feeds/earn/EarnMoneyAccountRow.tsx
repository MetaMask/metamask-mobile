import React, { useCallback } from 'react';
import {
  FontWeight,
  ListItem,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import MoneyBalanceIcon from '../../../../../images/money-balance.svg';
import { truncateNumber } from '../../../../UI/Earn/utils';
import EarnNewTag from '../../../../UI/Earn/components/EarnNewTag';
import type { EarnMoneyAccountSearchItem } from './earnSearchTypes';

interface EarnMoneyAccountRowProps {
  item: EarnMoneyAccountSearchItem;
  onPress: (item: EarnMoneyAccountSearchItem) => void;
}

const EarnMoneyAccountRow = ({ item, onPress }: EarnMoneyAccountRowProps) => {
  const handlePress = useCallback(() => onPress(item), [item, onPress]);

  const balanceText =
    item.balanceRaw === '0'
      ? strings('earn_module.get_started')
      : (item.balanceFiat ?? strings('earn_module.balance_unavailable'));

  const rateText =
    item.apyPercent === undefined
      ? strings('earn_module.rate_unavailable')
      : strings('earn_module.rate_apy', {
          percentage: truncateNumber(item.apyPercent),
        });

  const getRateText = () => {
    if (item.rateStatus === 'loading') {
      return (
        <Skeleton
          height={20}
          width={70}
          testID="earn-search-money-apy-skeleton"
        />
      );
    }
    return (
      <Text
        color={TextColor.SuccessDefault}
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Regular}
        numberOfLines={1}
      >
        {rateText}
      </Text>
    );
  };

  return (
    <ListItem
      key={`earn-search-money-account-row`}
      isInteractive
      accessibilityRole="button"
      onPress={handlePress}
      testID="earn-search-money-row"
      avatar={<MoneyBalanceIcon width={40} height={40} name="money-balance" />}
      title={strings('earn_module.money_account')}
      titleEndAccessory={item.balanceRaw === '0' ? <EarnNewTag /> : undefined}
      titleProps={{
        numberOfLines: 1,
      }}
      description={
        item.isBalanceLoading ? (
          <Skeleton
            height={20}
            width={70}
            testID="earn-search-money-balance-skeleton"
          />
        ) : (
          balanceText
        )
      }
      descriptionProps={{
        numberOfLines: 1,
      }}
      value={getRateText()}
      valueProps={{
        numberOfLines: 1,
      }}
      twClassName="py-2 min-h-0"
    />
  );
};

export default EarnMoneyAccountRow;
