import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useRef } from 'react';
import { Pressable } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import BigNumber from 'bignumber.js';
import { formatAddressToAssetId } from '@metamask/bridge-controller';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  AvatarToken,
  AvatarTokenSize,
  BottomSheet,
  BottomSheetHeader,
  BottomSheetRef,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIconSize,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../../locales/i18n';
import {
  type BalanceData,
  useBalancesByAssetId,
} from '../../hooks/useBalancesByAssetId';
import {
  selectBatchSellDestStablecoins,
  selectBatchSellDestToken,
  selectBatchSellSourceTokens,
  setBatchSellDestToken,
} from '../../../../../core/redux/slices/bridge';
import { RootState } from '../../../../../reducers';
import { BridgeToken } from '../../types';
import { formatTokenBalance } from '../../utils';
import { BatchSellDestinationTokenSelectorModalSelectorsIDs } from './BatchSellDestinationTokenSelectorModal.testIds';

const getTokenKey = (token: BridgeToken) => `${token.chainId}:${token.address}`;

const isSameToken = (tokenA?: BridgeToken, tokenB?: BridgeToken) =>
  Boolean(
    tokenA &&
      tokenB &&
      tokenA.chainId === tokenB.chainId &&
      tokenA.address.toLowerCase() === tokenB.address.toLowerCase(),
  );

function getStablecoinBalanceDisplayValue(
  balanceData: BalanceData | undefined,
  symbol: string,
) {
  const balance = balanceData?.balance;

  if (!balance) return undefined;

  const hasNonZeroTokenBalance = new BigNumber(balance).gt(0);
  const hasMissingFiatValue =
    !balanceData.balanceFiat ||
    (balanceData.tokenFiatAmount === 0 && hasNonZeroTokenBalance);

  if (hasMissingFiatValue) {
    return `${formatTokenBalance(balance)} ${symbol}`;
  }

  return balanceData.balanceFiat;
}

export function BatchSellDestinationTokenSelectorModal() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const tw = useTailwind();
  const sheetRef = useRef<BottomSheetRef>(null);
  const selectedTokens = useSelector(selectBatchSellSourceTokens);
  const sourceChainId = selectedTokens[0]?.chainId;
  const destinationTokens = useSelector((state: RootState) =>
    selectBatchSellDestStablecoins(state, sourceChainId),
  );
  const selectedDestinationToken = useSelector(selectBatchSellDestToken);
  const destinationChainIds = useMemo(() => {
    const chainIds = destinationTokens.map((token) => token.chainId);
    return chainIds.length > 0 ? Array.from(new Set(chainIds)) : undefined;
  }, [destinationTokens]);
  const { balancesByAssetId } = useBalancesByAssetId({
    chainIds:
      destinationChainIds ?? (sourceChainId ? [sourceChainId] : undefined),
  });

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleSelectToken = useCallback(
    (token: BridgeToken) => {
      dispatch(setBatchSellDestToken(token));
      sheetRef.current?.onCloseBottomSheet();
    },
    [dispatch],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={navigation.goBack}
      testID={BatchSellDestinationTokenSelectorModalSelectorsIDs.SHEET}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          size: ButtonIconSize.Md,
          testID:
            BatchSellDestinationTokenSelectorModalSelectorsIDs.CLOSE_BUTTON,
        }}
      >
        {strings('bridge.batch_sell_select_stablecoin')}
      </BottomSheetHeader>
      <Box paddingTop={2} paddingBottom={4}>
        {destinationTokens.map((token) => {
          const tokenKey = getTokenKey(token);
          const isSelected = isSameToken(token, selectedDestinationToken);
          const assetId = formatAddressToAssetId(token.address, token.chainId);
          const tokenBalanceValue = getStablecoinBalanceDisplayValue(
            assetId ? balancesByAssetId[assetId] : undefined,
            token.symbol,
          );

          return (
            <Pressable
              key={tokenKey}
              testID={`${BatchSellDestinationTokenSelectorModalSelectorsIDs.TOKEN_ROW}-${tokenKey}`}
              onPress={() => handleSelectToken(token)}
              style={({ pressed }) =>
                tw.style(
                  'w-full flex-row items-center gap-4 px-4 py-3',
                  isSelected && 'bg-muted',
                  pressed && 'bg-pressed',
                )
              }
            >
              <AvatarToken
                name={token.symbol}
                src={token.image ? { uri: token.image } : undefined}
                size={AvatarTokenSize.Md}
              />
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="min-w-0 flex-1"
              >
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextDefault}
                  numberOfLines={1}
                >
                  {token.symbol}
                </Text>
              </Box>
              {tokenBalanceValue ? (
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextDefault}
                  numberOfLines={1}
                >
                  {tokenBalanceValue}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </Box>
    </BottomSheet>
  );
}
