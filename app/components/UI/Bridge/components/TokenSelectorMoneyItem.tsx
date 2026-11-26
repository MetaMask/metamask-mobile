import React, { useCallback } from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../locales/i18n';
import { getAssetTestId } from '../../../../../tests/selectors/Wallet/WalletView.selectors';
import { type BridgeToken } from '../types';
import MoneyIcon from '../../../../images/money-icon.svg';

const MONEY_ICON_SIZE = 40;

const TokenSelectorMoneyItemInner = ({
  token,
  onPress,
  isSelected = false,
  children,
}: {
  token: BridgeToken;
  onPress: (token: BridgeToken) => void;
  isSelected?: boolean;
  children?: React.ReactNode;
}) => {
  const tw = useTailwind();
  const moneyBalance = token.balanceFiat;
  const handlePress = useCallback(() => {
    onPress(token);
  }, [onPress, token]);

  return (
    <Box className="mx-4 mb-2 border-b border-muted pb-2">
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        className={[
          'relative min-h-18 -mx-4 py-1 pl-4 pr-3',
          isSelected ? 'bg-primary-muted' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {isSelected ? (
          <Box
            testID="money-token-selected-indicator"
            className="absolute bottom-1 left-1 top-1 w-1 rounded-lg bg-primary-default"
          />
        ) : null}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ selected: isSelected }}
          onPress={handlePress}
          style={tw.style('flex-1 py-3')}
          testID={getAssetTestId(`${token.chainId}-${token.symbol}`)}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={4}
          >
            <MoneyIcon
              width={MONEY_ICON_SIZE}
              height={MONEY_ICON_SIZE}
              testID="money-token-icon"
              name="MoneyIcon"
            />
            <Box
              testID="money-token-text"
              flexDirection={BoxFlexDirection.Row}
              className={`min-w-0 flex-1 shrink ${
                moneyBalance ? 'items-start' : 'items-center'
              }`}
            >
              <Box className="mr-2 min-w-0 flex-1">
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  numberOfLines={1}
                >
                  {token.name}
                </Text>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                  numberOfLines={1}
                >
                  {strings('bridge.stablecoin_account')}
                </Text>
              </Box>
              <Box alignItems={BoxAlignItems.End}>
                {moneyBalance ? (
                  <Text
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Medium}
                    numberOfLines={1}
                    testID="money-token-balance"
                  >
                    {moneyBalance}
                  </Text>
                ) : null}
                {token.apy !== undefined ? (
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.SuccessDefault}
                    numberOfLines={1}
                    testID="money-token-apy"
                  >
                    {strings('money.apy_label', { percentage: token.apy })}
                  </Text>
                ) : null}
              </Box>
            </Box>
          </Box>
        </TouchableOpacity>
        {children ? <Box className="ml-3">{children}</Box> : null}
      </Box>
    </Box>
  );
};

export const TokenSelectorMoneyItem = React.memo(TokenSelectorMoneyItemInner);
