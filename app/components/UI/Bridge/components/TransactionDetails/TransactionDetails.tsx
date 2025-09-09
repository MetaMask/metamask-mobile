import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import ScreenView from '../../../../Base/ScreenView';
import { Box } from '../../../Box/Box';
import { FlexDirection, AlignItems } from '../../../Box/box.types';
import { getBridgeTransactionDetailsNavbar } from '../../../Navbar';
import { useBridgeTxHistoryData } from '../../../../../util/bridge/hooks/useBridgeTxHistoryData';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import TransactionAsset from './TransactionAsset';
import { calcTokenAmount } from '../../../../../util/transactions';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { calcHexGasTotal } from '../../utils/transactionGas';
import { strings } from '../../../../../../locales/i18n';
import BridgeStepList from './BridgeStepList';
import Button, {
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import Routes from '../../../../../constants/navigation/Routes';
import { BridgeToken } from '../../types';
import {
  formatChainIdToCaip,
  formatChainIdToHex,
  getNativeAssetForChainId,
  isSolanaChainId,
  StatusTypes,
} from '@metamask/bridge-controller';
import { Transaction } from '@metamask/keyring-api';
import { getMultichainTxFees } from '../../../../hooks/useMultichainTransactionDisplay/useMultichainTransactionDisplay';
import { useMultichainBlockExplorerTxUrl } from '../../hooks/useMultichainBlockExplorerTxUrl';
import { StatusResponse } from '@metamask/bridge-status-controller';
import type { RootParamList } from '../../../../../util/navigation/types';
import type { StackScreenProps } from '@react-navigation/stack';

const styles = StyleSheet.create({
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  arrowContainer: {
    paddingLeft: 11,
    paddingTop: 1,
    paddingBottom: 10,
  },
  transactionContainer: {
    paddingLeft: 8,
  },
  transactionAssetsContainer: {
    paddingVertical: 16,
  },
  blockExplorerButton: {
    width: '90%',
    alignSelf: 'center',
    marginTop: 12,
  },
  textTransform: {
    textTransform: 'capitalize',
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
  },
  tokenIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tokenInfo: {
    flexDirection: 'column',
    gap: 2,
  },
});

type BridgeTransactionDetailsProps = StackScreenProps<
  RootParamList,
  'BridgeTransactionDetails'
>;

const BridgeStatusToColorMap: Record<StatusTypes, TextColor> = {
  [StatusTypes.PENDING]: TextColor.Warning,
  [StatusTypes.COMPLETE]: TextColor.Success,
  [StatusTypes.FAILED]: TextColor.Error,
  [StatusTypes.UNKNOWN]: TextColor.Error,
};

const SwapStatusToColorMap: Record<TransactionStatus, TextColor> = {
  [TransactionStatus.submitted]: TextColor.Warning,
  [TransactionStatus.confirmed]: TextColor.Success,
  [TransactionStatus.failed]: TextColor.Error,
  [TransactionStatus.unapproved]: TextColor.Warning,
  [TransactionStatus.approved]: TextColor.Warning,
  [TransactionStatus.signed]: TextColor.Warning,
  [TransactionStatus.dropped]: TextColor.Error,
  [TransactionStatus.rejected]: TextColor.Error,
  [TransactionStatus.cancelled]: TextColor.Error,
};

const MultichainTxStatusToColorMap: Record<Transaction['status'], TextColor> = {
  submitted: TextColor.Warning,
  confirmed: TextColor.Success,
  unconfirmed: TextColor.Warning,
  failed: TextColor.Error,
};

const getStatusColor = ({
  isBridge,
  isSwap,
  multiChainTx,
  bridgeStatus,
  evmTxMeta,
}: {
  isBridge: boolean;
  isSwap: boolean;
  multiChainTx?: Transaction;
  bridgeStatus?: StatusResponse;
  evmTxMeta?: TransactionMeta;
}) => {
  if (isBridge && bridgeStatus) {
    return BridgeStatusToColorMap[bridgeStatus.status];
  }
  if (isSwap && evmTxMeta) {
    return SwapStatusToColorMap[evmTxMeta.status as TransactionStatus];
  }
  if (multiChainTx) {
    return MultichainTxStatusToColorMap[multiChainTx.status];
  }

  return TextColor.Error;
};

export const BridgeTransactionDetails = ({
  route,
}: BridgeTransactionDetailsProps) => {
  const navigation = useNavigation();

  const evmTxMeta = route.params.evmTxMeta;
  const multiChainTx = route.params.multiChainTx;

  const { bridgeTxHistoryItem } = useBridgeTxHistoryData({
    evmTxMeta,
    multiChainTx,
  });

  // Get source chain explorer data for swaps
  const swapSrcExplorerData = useMultichainBlockExplorerTxUrl({
    chainId: bridgeTxHistoryItem?.quote.srcChainId,
    txHash: evmTxMeta?.hash,
  });

  const [isStepListExpanded, setIsStepListExpanded] = useState(false);

  useEffect(() => {
    navigation.setOptions(getBridgeTransactionDetailsNavbar(navigation));
  }, [navigation]);

  if (!bridgeTxHistoryItem) {
    // TODO: display error page
    return null;
  }

  const { quote, status: bridgeStatus, startTime } = bridgeTxHistoryItem;

  const isSwap = quote.srcChainId === quote.destChainId;
  const isBridge = !isSwap;

  // Create token objects directly from the quote data
  const sourceChainId = isSolanaChainId(quote.srcChainId)
    ? formatChainIdToCaip(quote.srcChainId)
    : formatChainIdToHex(quote.srcChainId);

  const sourceToken: BridgeToken = {
    address: quote.srcAsset.address,
    symbol: quote.srcAsset.symbol,
    decimals: quote.srcAsset.decimals,
    name: quote.srcAsset.name,
    image: quote.srcAsset.iconUrl || '',
    chainId: sourceChainId,
  };

  const sourceTokenAmount = calcTokenAmount(
    quote.srcTokenAmount,
    quote.srcAsset.decimals,
  ).toFixed(5);

  const destinationChainId = isSolanaChainId(quote.destChainId)
    ? formatChainIdToCaip(quote.destChainId)
    : formatChainIdToHex(quote.destChainId);

  const destinationToken: BridgeToken = {
    address: quote.destAsset.address,
    symbol: quote.destAsset.symbol,
    decimals: quote.destAsset.decimals,
    name: quote.destAsset.name,
    image: quote.destAsset.iconUrl || '',
    chainId: destinationChainId,
  };

  const destinationTokenAmount = calcTokenAmount(
    quote.destTokenAmount,
    quote.destAsset.decimals,
  ).toFixed(5);

  const submissionDate = startTime ? new Date(startTime) : null;
  const submissionDateString = submissionDate
    ? submissionDate.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'N/A';

  const estimatedCompletionDate = submissionDate
    ? new Date(
        submissionDate.getTime() +
          bridgeTxHistoryItem.estimatedProcessingTimeInSeconds * 1000,
      )
    : null;
  const estimatedCompletionString = estimatedCompletionDate
    ? estimatedCompletionDate.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  const evmTotalGasFee = evmTxMeta
    ? calcTokenAmount(calcHexGasTotal(evmTxMeta), 18).toFixed(5)
    : null;

  let multiChainTotalGasFee;
  if (multiChainTx) {
    const { baseFee, priorityFee } = getMultichainTxFees(multiChainTx);
    multiChainTotalGasFee =
      baseFee?.asset.fungible && priorityFee?.asset.fungible
        ? (
            Number(baseFee?.asset.amount) + Number(priorityFee?.asset.amount)
          ).toFixed(5)
        : null;
  }

  let status;
  if (isBridge) {
    status = bridgeStatus.status;
  } else if (isSwap) {
    status = evmTxMeta?.status;
  } else if (multiChainTx) {
    status = multiChainTx.status;
  }

  return (
    <ScreenView>
      <Box style={styles.transactionContainer}>
        <Box style={styles.transactionAssetsContainer}>
          <TransactionAsset
            token={sourceToken}
            tokenAmount={sourceTokenAmount}
            chainId={sourceChainId}
            txType={isBridge ? TransactionType.bridge : TransactionType.swap}
          />
          <Box style={styles.arrowContainer}>
            <Icon name={IconName.Arrow2Down} size={IconSize.Sm} />
          </Box>
          <TransactionAsset
            token={destinationToken}
            tokenAmount={destinationTokenAmount}
            chainId={destinationChainId}
            txType={isBridge ? TransactionType.bridge : TransactionType.swap}
          />
        </Box>
        <Box style={styles.detailRow}>
          <Text variant={TextVariant.BodyMDMedium}>
            {strings('bridge_transaction_details.status')}
          </Text>
          <Box
            flexDirection={FlexDirection.Row}
            gap={4}
            alignItems={AlignItems.center}
          >
            <Text
              variant={TextVariant.BodyMDMedium}
              color={getStatusColor({
                isBridge,
                isSwap,
                multiChainTx,
                bridgeStatus,
                evmTxMeta,
              })}
              style={styles.textTransform}
            >
              {status}
            </Text>
          </Box>
        </Box>
        {isBridge &&
          bridgeStatus.status === StatusTypes.PENDING &&
          estimatedCompletionString && (
            <Box style={styles.detailRow}>
              <Text variant={TextVariant.BodyMDMedium}>
                {strings('bridge_transaction_details.estimated_completion')}{' '}
              </Text>
              <Box
                flexDirection={FlexDirection.Row}
                gap={4}
                alignItems={AlignItems.center}
              >
                <Text>{estimatedCompletionString}</Text>
                <TouchableOpacity
                  onPress={() => setIsStepListExpanded(!isStepListExpanded)}
                >
                  <Icon
                    name={
                      isStepListExpanded ? IconName.ArrowUp : IconName.ArrowDown
                    }
                    color={IconColor.Muted}
                    size={IconSize.Sm}
                  />
                </TouchableOpacity>
              </Box>
            </Box>
          )}
        {bridgeStatus.status !== StatusTypes.COMPLETE && isStepListExpanded && (
          <Box style={styles.detailRow}>
            <BridgeStepList
              bridgeHistoryItem={bridgeTxHistoryItem}
              srcChainTxMeta={evmTxMeta}
            />
          </Box>
        )}
        <Box style={styles.detailRow}>
          <Text variant={TextVariant.BodyMDMedium}>
            {strings('bridge_transaction_details.date')}
          </Text>
          <Text>{submissionDateString}</Text>
        </Box>
        {/* TODO uncomment when recipient is available */}
        {/* <Box style={styles.detailRow}>
          <Text variant={TextVariant.BodyMDMedium}>
            {strings('bridge_transaction_details.recipient')}
          </Text>
          <Text>{renderShortAddress(bridgeTxHistoryItem.account)}</Text>
        </Box> */}
        <Box style={styles.detailRow}>
          <Text variant={TextVariant.BodyMDMedium}>
            {strings('bridge_transaction_details.total_gas_fee')}
          </Text>
          {/* TODO get solana gas fee from multiChainTx */}
          {evmTotalGasFee && (
            <Text>
              {evmTotalGasFee}{' '}
              {getNativeAssetForChainId(quote.srcChainId).symbol}
            </Text>
          )}
          {multiChainTotalGasFee && (
            <Text>
              {multiChainTotalGasFee}{' '}
              {getNativeAssetForChainId(quote.srcChainId).symbol}
            </Text>
          )}
        </Box>
      </Box>
      <Box>
        <Button
          style={styles.blockExplorerButton}
          variant={ButtonVariants.Secondary}
          label={strings('bridge_transaction_details.view_on_block_explorer')}
          onPress={() => {
            // For swaps, go directly to block explorer web view
            if (isSwap && swapSrcExplorerData?.explorerTxUrl) {
              navigation.navigate(Routes.BROWSER.HOME, {
                screen: Routes.BROWSER.VIEW,
                params: {
                  newTabUrl: swapSrcExplorerData.explorerTxUrl,
                  timestamp: Date.now(),
                },
              });
            } else {
              // For bridges, show the modal with both explorers
              navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
                screen: Routes.BRIDGE.MODALS.TRANSACTION_DETAILS_BLOCK_EXPLORER,
                params: {
                  evmTxMeta: route.params.evmTxMeta,
                  multiChainTx: route.params.multiChainTx,
                },
              });
            }
          }}
        />
      </Box>
    </ScreenView>
  );
};
