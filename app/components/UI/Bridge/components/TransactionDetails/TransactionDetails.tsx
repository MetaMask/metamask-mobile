import React, { useCallback, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  HeaderStandard,
  Button,
  ButtonVariant,
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { TextVariant as TextVariantLegacy } from '../../../../../component-library/components/Texts/Text';
import ScreenView from '../../../../Base/ScreenView';
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
import { BatchSell7702TransactionAssets } from './BatchSell7702TransactionAssets';
import { calcTokenAmount } from '../../../../../util/transactions';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { calcHexGasTotal } from '../../utils/transactionGas';
import { strings } from '../../../../../../locales/i18n';
import BridgeStepList from './BridgeStepList';
import Routes from '../../../../../constants/navigation/Routes';
import { BridgeToken } from '../../types';
import {
  formatChainIdToCaip,
  formatChainIdToHex,
  isNonEvmChainId,
  StatusTypes,
  AllowedBridgeChainIds,
} from '@metamask/bridge-controller';
import { Transaction } from '@metamask/keyring-api';
import { getMultichainTxFees } from '../../../../hooks/useMultichainTransactionDisplay/useMultichainTransactionDisplay';
import { useMultichainBlockExplorerTxUrl } from '../../hooks/useMultichainBlockExplorerTxUrl';
import { StatusResponse } from '@metamask/bridge-status-controller';
import { toDateFormat } from '../../../../../util/date';
import TagColored, {
  TagColor,
} from '../../../../../component-library/components-temp/TagColored';
// import { renderShortAddress } from '../../../../../util/address';
import { isHardwareAccount } from '../../../../../util/address';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { trackBlockExplorerLinkClicked } from '../../../../../util/analytics/externalLinkTracking';
import { isTransactionMarkedAsGasFeeSponsored } from '../../../../Views/confirmations/utils/transaction';
import { NETWORK_TO_SHORT_NETWORK_NAME_MAP } from '../../../../../constants/bridge';
import { getNetworkImageSource } from '../../../../../util/networks';
import AvatarNetwork from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarNetwork';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import { useNativeCurrencySymbol } from '../../../../Views/confirmations/hooks/useNativeCurrencySymbol';

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
  paidByMetaMask: {
    height: undefined,
    paddingVertical: 2,
  },
});

interface BridgeTransactionDetailsProps {
  route: {
    params: {
      evmTxMeta?: TransactionMeta;
      multiChainTx?: Transaction;
    };
  };
}

const PaidByMetaMask = () => (
  <TagColored
    color={TagColor.Success}
    style={styles.paidByMetaMask}
    labelProps={{
      variant: TextVariantLegacy.BodySM,
      style: {
        textTransform: 'none',
        textAlign: 'center',
        fontWeight: 'normal',
      },
      testID: 'paid-by-metamask',
    }}
  >
    {strings('transactions.paid_by_metamask')}
  </TagColored>
);

const BridgeStatusToColorMap: Record<StatusTypes, TextColor> = {
  [StatusTypes.PENDING]: TextColor.WarningDefault,
  [StatusTypes.COMPLETE]: TextColor.SuccessDefault,
  [StatusTypes.FAILED]: TextColor.ErrorDefault,
  [StatusTypes.UNKNOWN]: TextColor.ErrorDefault,
  [StatusTypes.SUBMITTED]: TextColor.WarningDefault,
};

const SwapStatusToColorMap: Record<TransactionStatus, TextColor> = {
  [TransactionStatus.submitted]: TextColor.WarningDefault,
  [TransactionStatus.confirmed]: TextColor.SuccessDefault,
  [TransactionStatus.failed]: TextColor.ErrorDefault,
  [TransactionStatus.unapproved]: TextColor.WarningDefault,
  [TransactionStatus.approved]: TextColor.WarningDefault,
  [TransactionStatus.signed]: TextColor.WarningDefault,
  [TransactionStatus.dropped]: TextColor.ErrorDefault,
  [TransactionStatus.rejected]: TextColor.ErrorDefault,
  [TransactionStatus.cancelled]: TextColor.ErrorDefault,
};

const MultichainTxStatusToColorMap: Record<Transaction['status'], TextColor> = {
  submitted: TextColor.WarningDefault,
  confirmed: TextColor.SuccessDefault,
  unconfirmed: TextColor.WarningDefault,
  failed: TextColor.ErrorDefault,
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

  return TextColor.ErrorDefault;
};

export const BridgeTransactionDetails = (
  props: BridgeTransactionDetailsProps,
) => {
  const navigation = useNavigation<AppNavigationProp>();
  const { trackEvent, createEventBuilder } = useAnalytics();

  const evmTxMeta = props.route.params.evmTxMeta;
  const multiChainTx = props.route.params.multiChainTx;

  const fromAddress = evmTxMeta?.txParams?.from;
  // isGasFeeSponsored is set on tx submission and only cleared in the confirm
  // callback, which never runs when a HW wallet user rejects signing.
  // Guard against showing "Paid by MetaMask" on stale sponsored state.
  const isHardwareWallet = Boolean(
    fromAddress && isHardwareAccount(fromAddress),
  );

  const { bridgeTxHistoryItem, batchSellHistoryItems, is7702Batch } =
    useBridgeTxHistoryData({
      evmTxMeta,
      multiChainTx,
    });

  const sourceChainId = useMemo(() => {
    if (bridgeTxHistoryItem?.quote.srcChainId) {
      const { srcChainId } = bridgeTxHistoryItem.quote;
      return isNonEvmChainId(srcChainId)
        ? formatChainIdToCaip(srcChainId)
        : formatChainIdToHex(srcChainId);
    }
  }, [bridgeTxHistoryItem?.quote]);

  const { nativeCurrencySymbol } = useNativeCurrencySymbol(sourceChainId);
  // Get source chain explorer data for swaps
  const swapSrcExplorerData = useMultichainBlockExplorerTxUrl({
    chainId: bridgeTxHistoryItem?.quote.srcChainId,
    // On multi-chain tx, the txHash is the source chain tx hash.
    // This ensures that swaps on non EVM networks are displayed correctly.
    // For EVM tx, the txHash is the source chain tx hash.
    txHash: bridgeTxHistoryItem?.status.srcChain?.txHash || evmTxMeta?.hash,
  });

  const [isStepListExpanded, setIsStepListExpanded] = useState(false);

  const headerTitle = strings('bridge_transaction_details.transaction_details');

  const handleHeaderBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const bridgeTransactionDetailsHeader = (
    <HeaderStandard
      title={headerTitle}
      onBack={handleHeaderBack}
      backButtonProps={{ testID: 'bridge-transaction-details-back-button' }}
      includesTopInset
    />
  );

  if (!bridgeTxHistoryItem || !sourceChainId) {
    return <ScreenView>{bridgeTransactionDetailsHeader}</ScreenView>;
  }

  const { quote, status: bridgeStatus, startTime } = bridgeTxHistoryItem;

  const isSwap = quote.srcChainId === quote.destChainId;
  const isBridge = !isSwap;
  const isIntentNotCompletedItem =
    quote.intent && !(bridgeStatus.status === StatusTypes.COMPLETE);

  const sourceToken: BridgeToken = {
    address: quote.srcAsset.address,
    symbol: quote.srcAsset.symbol,
    decimals: quote.srcAsset.decimals,
    name: quote.srcAsset.name,
    image: quote.srcAsset.iconUrl || '',
    chainId: sourceChainId,
  };

  const sourceTokenAmount =
    quote.gasSponsored && bridgeTxHistoryItem.pricingData?.amountSent
      ? parseFloat(bridgeTxHistoryItem.pricingData.amountSent).toFixed(5)
      : calcTokenAmount(quote.srcTokenAmount, quote.srcAsset.decimals).toFixed(
          5,
        );

  const destinationChainId = isNonEvmChainId(quote.destChainId)
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

  const networkName =
    NETWORK_TO_SHORT_NETWORK_NAME_MAP[sourceChainId as AllowedBridgeChainIds];
  const networkImageSource = getNetworkImageSource({ chainId: sourceChainId });

  const submissionDate = startTime ? new Date(startTime) : null;
  const submissionDateString = startTime ? toDateFormat(startTime) : 'N/A';

  const estimatedCompletionDate = submissionDate
    ? new Date(
        submissionDate.getTime() +
          bridgeTxHistoryItem.estimatedProcessingTimeInSeconds * 1000,
      )
    : null;
  const estimatedCompletionString = estimatedCompletionDate
    ? toDateFormat(estimatedCompletionDate)
    : null;

  const evmTotalGasFee = evmTxMeta
    ? calcTokenAmount(calcHexGasTotal(evmTxMeta), 18).toFixed(5)
    : null;

  let multiChainTotalGasFee;
  if (multiChainTx) {
    const multichainTxFees = getMultichainTxFees(multiChainTx);
    const baseFeeIsFungible = multichainTxFees?.baseFee?.asset.fungible;
    const priorityFeeIsFungible = multichainTxFees?.priorityFee?.asset.fungible;

    // Only calculate total fee if at least one fee is fungible
    if (baseFeeIsFungible || priorityFeeIsFungible) {
      const baseFee = baseFeeIsFungible
        ? multichainTxFees?.baseFee?.asset.amount
        : 0;
      const priorityFee = priorityFeeIsFungible
        ? Number(multichainTxFees?.priorityFee?.asset.amount)
        : 0;
      multiChainTotalGasFee = (Number(baseFee) + Number(priorityFee)).toFixed(
        5,
      );
    }
  }

  let status;
  if (isBridge) {
    status = bridgeStatus.status;
  } else {
    status = evmTxMeta?.status || multiChainTx?.status;
  }

  return (
    <ScreenView>
      {bridgeTransactionDetailsHeader}
      <Box style={styles.transactionContainer}>
        <Box style={styles.transactionAssetsContainer}>
          {is7702Batch && batchSellHistoryItems?.length ? (
            <BatchSell7702TransactionAssets
              batchSellHistoryItems={batchSellHistoryItems}
            />
          ) : (
            <>
              <TransactionAsset
                token={sourceToken}
                tokenAmount={sourceTokenAmount}
                chainId={sourceChainId}
                txType={
                  isBridge ? TransactionType.bridge : TransactionType.swap
                }
              />
              <Box style={styles.arrowContainer}>
                <Icon name={IconName.Arrow2Down} size={IconSize.Sm} />
              </Box>
              <TransactionAsset
                token={destinationToken}
                tokenAmount={destinationTokenAmount}
                chainId={destinationChainId}
                txType={
                  isBridge ? TransactionType.bridge : TransactionType.swap
                }
              />
            </>
          )}
        </Box>
        <Box style={styles.detailRow}>
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {strings('bridge_transaction_details.status')}
          </Text>
          <Box
            flexDirection={BoxFlexDirection.Row}
            gap={1}
            alignItems={BoxAlignItems.Center}
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
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
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
                {strings(
                  'bridge_transaction_details.estimated_completion',
                )}{' '}
              </Text>
              <Box
                flexDirection={BoxFlexDirection.Row}
                gap={1}
                alignItems={BoxAlignItems.Center}
              >
                <Text variant={TextVariant.BodyMd}>
                  {estimatedCompletionString}
                </Text>
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
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {strings('bridge_transaction_details.date')}
          </Text>
          <Text variant={TextVariant.BodyMd}>{submissionDateString}</Text>
        </Box>
        {is7702Batch && batchSellHistoryItems?.length && networkName ? (
          <Box style={styles.detailRow}>
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {strings('bridge_transaction_details.network')}
            </Text>
            <Box
              flexDirection={BoxFlexDirection.Row}
              gap={2}
              alignItems={BoxAlignItems.Center}
            >
              <AvatarNetwork
                name={networkName}
                imageSource={networkImageSource}
                size={AvatarSize.Xs}
              />
              <Text variant={TextVariant.BodyMd}>{networkName}</Text>
            </Box>
          </Box>
        ) : null}
        {/* TODO uncomment when recipient is available */}
        {/* <Box style={styles.detailRow}>
          <Text variant={TextVariant.BodyMDMedium}>
            {strings('bridge_transaction_details.recipient')}
          </Text>
          <Text>{renderShortAddress(bridgeTxHistoryItem.account)}</Text>
        </Box> */}
        <Box style={styles.detailRow}>
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {strings('bridge_transaction_details.total_gas_fee')}
          </Text>
          {isTransactionMarkedAsGasFeeSponsored(evmTxMeta) &&
          !isHardwareWallet ? (
            <PaidByMetaMask />
          ) : (
            <>
              {/* TODO get solana gas fee from multiChainTx */}
              {evmTotalGasFee && (
                <Text variant={TextVariant.BodyMd}>
                  {evmTotalGasFee} {nativeCurrencySymbol}
                </Text>
              )}
              {multiChainTotalGasFee && (
                <Text variant={TextVariant.BodyMd}>
                  {multiChainTotalGasFee} {nativeCurrencySymbol}
                </Text>
              )}
            </>
          )}
        </Box>
      </Box>
      <Box>
        {isIntentNotCompletedItem || (
          <Button
            style={styles.blockExplorerButton}
            variant={ButtonVariant.Secondary}
            onPress={() => {
              // For swaps, go directly to block explorer web view
              if (isSwap && swapSrcExplorerData?.explorerTxUrl) {
                trackBlockExplorerLinkClicked(trackEvent, createEventBuilder, {
                  location: 'bridge_transaction_details',
                  text: strings(
                    'bridge_transaction_details.view_on_block_explorer',
                  ),
                  url: swapSrcExplorerData.explorerTxUrl,
                });
                navigation.navigate(Routes.WEBVIEW.MAIN, {
                  screen: Routes.WEBVIEW.SIMPLE,
                  params: {
                    url: swapSrcExplorerData.explorerTxUrl,
                  },
                });
              } else if (isBridge) {
                // For bridges, show the modal with both explorers
                navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
                  screen:
                    Routes.BRIDGE.MODALS.TRANSACTION_DETAILS_BLOCK_EXPLORER,
                  params: {
                    evmTxMeta: props.route.params.evmTxMeta,
                    multiChainTx: props.route.params.multiChainTx,
                  },
                });
              }
            }}
          >
            {strings('bridge_transaction_details.view_on_block_explorer')}
          </Button>
        )}
      </Box>
    </ScreenView>
  );
};
