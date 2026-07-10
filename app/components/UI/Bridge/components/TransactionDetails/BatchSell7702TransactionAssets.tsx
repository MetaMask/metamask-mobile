import React from 'react';
import { StyleSheet } from 'react-native';
import { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import {
  formatChainIdToCaip,
  formatChainIdToHex,
  isNonEvmChainId,
} from '@metamask/bridge-controller';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { AlignItems, FlexDirection } from '../../../Box/box.types';
import { Box } from '../../../Box/Box';
import { Hex, CaipChainId } from '@metamask/utils';
import { calcTokenAmount } from '../../../../../util/transactions';
import { strings } from '../../../../../../locales/i18n';
import { BridgeToken } from '../../types';
import { TransactionTokenIcon } from './TransactionAsset';

const SOURCE_TOKEN_ICON_OVERLAP = 12;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    gap: 8,
  },
  sectionHeader: {
    paddingVertical: 4,
  },
  sourceIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  swappedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  stackedSourceIcon: {
    marginLeft: -SOURCE_TOKEN_ICON_OVERLAP,
  },
  receivedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
});

function getSourceTokenFromHistoryItem(historyItem: BridgeHistoryItem): {
  token: BridgeToken;
  chainId: Hex | CaipChainId;
} {
  const { quote } = historyItem;
  const chainId = isNonEvmChainId(quote.srcChainId)
    ? formatChainIdToCaip(quote.srcChainId)
    : formatChainIdToHex(quote.srcChainId);

  return {
    chainId: chainId as Hex | CaipChainId,
    token: {
      address: quote.srcAsset.address,
      symbol: quote.srcAsset.symbol,
      decimals: quote.srcAsset.decimals,
      name: quote.srcAsset.name,
      image: quote.srcAsset.iconUrl || '',
      chainId,
    },
  };
}

function getDestinationTokenFromHistoryItem(historyItem: BridgeHistoryItem): {
  token: BridgeToken;
  chainId: Hex | CaipChainId;
} {
  const { quote } = historyItem;
  const chainId = isNonEvmChainId(quote.destChainId)
    ? formatChainIdToCaip(quote.destChainId)
    : formatChainIdToHex(quote.destChainId);

  return {
    chainId: chainId as Hex | CaipChainId,
    token: {
      address: quote.destAsset.address,
      symbol: quote.destAsset.symbol,
      decimals: quote.destAsset.decimals,
      name: quote.destAsset.name,
      image: quote.destAsset.iconUrl || '',
      chainId,
    },
  };
}

interface BatchSell7702TransactionAssetsProps {
  batchSellHistoryItems: BridgeHistoryItem[];
}

export function BatchSell7702TransactionAssets({
  batchSellHistoryItems,
}: BatchSell7702TransactionAssetsProps) {
  if (!batchSellHistoryItems.length) {
    return null;
  }

  const sourceTokens = batchSellHistoryItems.map(getSourceTokenFromHistoryItem);
  const { token: destinationToken, chainId: destinationChainId } =
    getDestinationTokenFromHistoryItem(batchSellHistoryItems[0]);

  const totalDestTokenAmount = calcTokenAmount(
    batchSellHistoryItems.reduce(
      (acc, item) =>
        (BigInt(acc) + BigInt(item.quote.destTokenAmount)).toString(),
      '0',
    ),
    batchSellHistoryItems[0].quote.destAsset.decimals,
  ).toFixed(5);

  return (
    <Box style={styles.container}>
      <Text
        variant={TextVariant.BodyMDMedium}
        color={TextColor.Alternative}
        style={styles.sectionHeader}
      >
        {strings('bridge_transaction_details.you_swapped')}
      </Text>
      <Box
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
        style={styles.swappedRow}
      >
        <Box
          flexDirection={FlexDirection.Row}
          alignItems={AlignItems.center}
          style={styles.sourceIconsRow}
        >
          {sourceTokens.map(({ token, chainId }, index) => (
            <Box
              key={`${token.address}-${index}`}
              style={[
                index === 0 ? undefined : styles.stackedSourceIcon,
                { zIndex: index },
              ]}
            >
              <TransactionTokenIcon
                token={token}
                chainId={chainId}
                showNetworkBadge={false}
              />
            </Box>
          ))}
        </Box>
        <Text variant={TextVariant.BodyLGMedium}>
          {strings('bridge.batch_sell_token_count', {
            tokenCount: sourceTokens.length,
          })}
        </Text>
      </Box>
      <Text
        variant={TextVariant.BodyMDMedium}
        color={TextColor.Alternative}
        style={styles.sectionHeader}
      >
        {strings('bridge_transaction_details.you_received')}
      </Text>
      <Box
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
        style={styles.receivedRow}
      >
        <TransactionTokenIcon
          token={destinationToken}
          chainId={destinationChainId}
          showNetworkBadge={false}
        />
        <Text variant={TextVariant.BodyLGMedium} color={TextColor.Success}>
          +{totalDestTokenAmount} {destinationToken.symbol}
        </Text>
      </Box>
    </Box>
  );
}
