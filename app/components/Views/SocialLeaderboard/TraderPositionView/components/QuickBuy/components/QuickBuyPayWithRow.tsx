import {
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useMemo } from 'react';
import { TouchableOpacity } from 'react-native';
import type { BridgeToken } from '../../../../../../UI/Bridge/types';
import { getTokenKey } from '../tokenKey';
import QuickBuyTokenIcon from './QuickBuyTokenIcon';

interface QuickBuyPayWithRowProps {
  token: BridgeToken;
  isSelected: boolean;
  onPress: (token: BridgeToken) => void;
}

const formatTokenBalance = (balance: string | undefined, symbol: string) => {
  if (!balance) {
    return undefined;
  }

  const balanceNum = parseFloat(balance);
  if (Number.isNaN(balanceNum)) {
    return undefined;
  }

  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 6,
    useGrouping: true,
  }).format(balanceNum);

  return `${formatted} ${symbol}`;
};

const QuickBuyPayWithRow: React.FC<QuickBuyPayWithRowProps> = ({
  token,
  isSelected,
  onPress,
}) => {
  const tokenKey = getTokenKey(token);
  const cryptoBalanceLabel = useMemo(
    () => formatTokenBalance(token.balance, token.symbol),
    [token.balance, token.symbol],
  );

  return (
    <TouchableOpacity
      onPress={() => onPress(token)}
      activeOpacity={0.7}
      accessibilityRole="button"
      testID={`quick-buy-pay-with-row-${tokenKey}`}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={4}
        twClassName={`px-4 py-2 ${isSelected ? 'bg-muted' : ''}`}
      >
        <QuickBuyTokenIcon token={token} size={AvatarTokenSize.Md} />

        <Box twClassName="flex-1" gap={0}>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={1}
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextDefault}
              numberOfLines={1}
            >
              {token.name}
            </Text>
            {token.isVerified ? (
              <Icon
                name={IconName.VerifiedFilled}
                size={IconSize.Sm}
                color={IconColor.InfoDefault}
                testID={`quick-buy-pay-with-verified-${tokenKey}`}
              />
            ) : null}
          </Box>
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            {token.symbol}
          </Text>
        </Box>

        <Box alignItems={BoxAlignItems.End} gap={0}>
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
          >
            {token.balanceFiat ?? '—'}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            {cryptoBalanceLabel ?? '—'}
          </Text>
        </Box>
      </Box>
    </TouchableOpacity>
  );
};

export default QuickBuyPayWithRow;
