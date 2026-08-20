import React, { useCallback } from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonBase,
  FontWeight,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import MoneyBalanceIcon from '../../../../../../images/money-balance.svg';
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

  return (
    <ButtonBase
      accessibilityRole="button"
      onPress={handlePress}
      testID="earn-search-money-row"
      twClassName="w-full px-4 py-3"
      contentWrapperProps={{ twClassName: 'w-full' }}
    >
      <Box
        alignItems={BoxAlignItems.Center}
        flexDirection={BoxFlexDirection.Row}
        twClassName="w-full gap-3"
        accessible={false}
      >
        <MoneyBalanceIcon width={40} height={40} name="money-balance" />
        <Box twClassName="min-w-0 flex-1 gap-1">
          <Box
            alignItems={BoxAlignItems.Center}
            flexDirection={BoxFlexDirection.Row}
            twClassName="gap-2"
          >
            {item.balanceRaw === '0' && <EarnNewTag />}
            <Text
              color={TextColor.TextDefault}
              fontWeight={FontWeight.Medium}
              variant={TextVariant.BodyMd}
              numberOfLines={1}
            >
              {strings('earn_module.money_account')}
            </Text>
          </Box>
          {item.isBalanceLoading ? (
            <Skeleton
              height={20}
              width={85}
              testID="earn-search-money-balance-skeleton"
            />
          ) : (
            <Text
              color={TextColor.TextDefault}
              variant={TextVariant.BodySm}
              numberOfLines={1}
            >
              {balanceText}
            </Text>
          )}
        </Box>
        <Box alignItems={BoxAlignItems.End} twClassName="gap-1">
          {item.rateStatus === 'loading' ? (
            <Skeleton
              height={20}
              width={70}
              testID="earn-search-money-apy-skeleton"
            />
          ) : (
            <Text
              color={TextColor.TextAlternative}
              variant={TextVariant.BodySm}
              numberOfLines={1}
            >
              {rateText}
            </Text>
          )}
        </Box>
      </Box>
    </ButtonBase>
  );
};

export default EarnMoneyAccountRow;
