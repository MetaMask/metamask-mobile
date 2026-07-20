import React, { useCallback, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import {
  HeaderStandard,
  Button,
  ButtonVariant,
  ButtonSize,
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { toTokenMinimalUnit } from '../../../../../util/number/bigint';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { calcHexGasTotal } from '../../utils/transactionGas';
import { strings } from '../../../../../../locales/i18n';
import BridgeStepList from './BridgeStepList';
import Routes from '../../../../../constants/navigation/Routes';
import { BridgeToken, BridgeViewMode } from '../../types';
import {
  formatChainIdToCaip,
  formatChainIdToHex,
  isNonEvmChainId,
  StatusTypes,
  AllowedBridgeChainIds,
  MetaMetricsSwapsEventSource,
} from '@metamask/bridge-controller';
import { setSourceAmount } from '../../../../../core/redux/slices/bridge';
import { selectIsTransactionsRedesignEnabled } from '../../../../../selectors/featureFlagController/activityRedesign';
/* eslint-disable import-x/no-restricted-paths -- reuse the redesigned Activity-details row components instead of duplicating them; route-isolation backlog */
import {
  ActivityDetailsDualAmountHeader,
  ActivityDetailsBridgeMetadata,
  ActivityDetailsDoItAgainButton,
  ActivityDetailsTemplateFrame,
} from '../../../../Views/ActivityDetails/components';
import {
  ActivityDetailRow,
  ActivityDetailSection,
} from '../../../../Views/ActivityDetails/components/ActivityDetailsLayout';
import { getBridgeDestinationCaipChainId } from '../../../../Views/ActivityDetails/templates/bridgeDetailsUtils';
/* eslint-enable import-x/no-restricted-paths */
import type {
  ActivityListItem,
  Status,
  TokenAmount,
} from '../../../../../util/activity-adapters';
import { Transaction } from '@metamask/keyring-api';
import { getMultichainTxFees } from '../../../../hooks/useMultichainTransactionDisplay/useMultichainTransactionDisplay';
import { useMultichainBlockExplorerTxUrl } from '../../hooks/useMultichainBlockExplorerTxUrl';
import { StatusResponse } from '@metamask/bridge-status-controller';
import { toDateFormat } from '../../../../../util/date';
import TagColored, {
  TagColor,
} from '../../../../../component-library/components-temp/TagColored';
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
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const tw = useTailwind();
  const { trackEvent, createEventBuilder } = useAnalytics();
  // Gate the redesigned layout behind the transactions-details redesign flag;
  // flag off renders the legacy layout untouched.
  const isRedesign = useSelector(selectIsTransactionsRedesignEnabled);

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
  // For non-EVM (e.g. Solana) the fee carries its own asset unit ("SOL"); the
  // source chain's configured nativeCurrency is a raw CAIP asset id there, so
  // using it as the symbol produces a long string that breaks the row layout.
  // Prefer the fee asset's unit and fall back to nativeCurrencySymbol.
  let multiChainGasFeeSymbol = nativeCurrencySymbol;
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
      const feeAsset = baseFeeIsFungible
        ? multichainTxFees?.baseFee?.asset
        : multichainTxFees?.priorityFee?.asset;
      if (feeAsset?.fungible) {
        multiChainGasFeeSymbol = feeAsset.unit;
      }
    }
  }

  let status;
  if (isBridge) {
    status = bridgeStatus.status;
  } else {
    status = evmTxMeta?.status || multiChainTx?.status;
  }

  const handleViewBlockExplorer = () => {
    if (isSwap && swapSrcExplorerData?.explorerTxUrl) {
      trackBlockExplorerLinkClicked(trackEvent, createEventBuilder, {
        location: 'bridge_transaction_details',
        text: strings('bridge_transaction_details.view_on_block_explorer'),
        url: swapSrcExplorerData.explorerTxUrl,
      });
      navigation.navigate(Routes.WEBVIEW.MAIN, {
        screen: Routes.WEBVIEW.SIMPLE,
        params: { url: swapSrcExplorerData.explorerTxUrl },
      });
    } else if (isBridge) {
      navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
        screen: Routes.BRIDGE.MODALS.TRANSACTION_DETAILS_BLOCK_EXPLORER,
        params: {
          evmTxMeta: props.route.params.evmTxMeta,
          multiChainTx: props.route.params.multiChainTx,
        },
      });
    }
  };

  if (isRedesign) {
    const isGasSponsored =
      isTransactionMarkedAsGasFeeSponsored(evmTxMeta) && !isHardwareWallet;
    const gasFeeAmount = evmTotalGasFee ?? multiChainTotalGasFee ?? null;
    const gasFeeSymbol = evmTotalGasFee
      ? nativeCurrencySymbol
      : multiChainGasFeeSymbol;
    const transactionId =
      evmTxMeta?.hash ?? bridgeStatus.srcChain?.txHash ?? multiChainTx?.id;

    const redesignTitle = isSwap
      ? strings('bridge_transaction_details.swapped')
      : destinationToken.symbol
        ? strings('bridge_transaction_details.bridged_token', {
            symbol: destinationToken.symbol,
          })
        : strings('bridge_transaction_details.bridged');

    const pricing = bridgeTxHistoryItem.pricingData;
    // Exclude gas from the total when it's sponsored, the network fee row
    // shows "Paid by MetaMask", so the user never paid that gas.
    const totalAmountUsd =
      pricing?.amountSentInUsd != null
        ? Number(pricing.amountSentInUsd) +
          (isGasSponsored ? 0 : Number(pricing.quotedGasInUsd ?? 0))
        : undefined;
    const totalAmountText =
      totalAmountUsd !== undefined && Number.isFinite(totalAmountUsd)
        ? `$${totalAmountUsd.toFixed(2)}`
        : undefined;

    const activityStatus: Status = isBridge
      ? bridgeStatus.status === StatusTypes.COMPLETE
        ? 'success'
        : bridgeStatus.status === StatusTypes.FAILED ||
            bridgeStatus.status === StatusTypes.UNKNOWN
          ? 'failed'
          : 'pending'
      : status === TransactionStatus.confirmed
        ? 'success'
        : status === TransactionStatus.failed ||
            status === TransactionStatus.dropped ||
            status === TransactionStatus.rejected
          ? 'failed'
          : 'pending';

    const sourceAmountMinimalUnit =
      quote.gasSponsored && pricing?.amountSent
        ? toTokenMinimalUnit(
            pricing.amountSent,
            quote.srcAsset.decimals,
          ).toString()
        : quote.srcTokenAmount;
    const sourceTokenModel: TokenAmount = {
      amount: sourceAmountMinimalUnit,
      decimals: quote.srcAsset.decimals,
      symbol: quote.srcAsset.symbol,
      direction: 'out',
      ...(quote.srcAsset.assetId ? { assetId: quote.srcAsset.assetId } : {}),
    };
    const destinationTokenModel: TokenAmount = {
      amount: quote.destTokenAmount,
      decimals: quote.destAsset.decimals,
      symbol: quote.destAsset.symbol,
      direction: 'in',
      ...(quote.destAsset.assetId ? { assetId: quote.destAsset.assetId } : {}),
    };
    const bridgeItem: Extract<ActivityListItem, { type: 'bridge' }> = {
      type: 'bridge',
      chainId: formatChainIdToCaip(quote.srcChainId),
      status: activityStatus,
      timestamp: startTime ?? 0,
      ...(transactionId ? { hash: transactionId } : {}),
      data: {
        sourceToken: sourceTokenModel,
        destinationToken: destinationTokenModel,
      },
    };

    const activityDestinationChainId =
      getBridgeDestinationCaipChainId(destinationTokenModel) ??
      formatChainIdToCaip(quote.destChainId);

    const handleBridgeAgain = () => {
      dispatch(setSourceAmount(undefined));
      navigation.navigate(Routes.BRIDGE.ROOT, {
        screen: Routes.BRIDGE.BRIDGE_VIEW,
        params: {
          sourcePage: 'BridgeTransactionDetails',
          bridgeViewMode: isBridge
            ? BridgeViewMode.Bridge
            : BridgeViewMode.Swap,
          sourceToken,
          destToken: destinationToken,
          location: MetaMetricsSwapsEventSource.MainView,
          scrollToTopOnNav: true,
        },
      });
    };

    return (
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
      >
        <Box twClassName="flex-1 bg-default">
          <HeaderStandard
            title={redesignTitle}
            onBack={handleHeaderBack}
            backButtonProps={{
              testID: 'bridge-transaction-details-back-button',
            }}
            includesTopInset
          />
          <ScrollView
            style={tw.style('flex-1')}
            contentContainerStyle={tw.style('grow p-4')}
          >
            <ActivityDetailsTemplateFrame
              hero={
                is7702Batch && batchSellHistoryItems?.length ? (
                  <BatchSell7702TransactionAssets
                    batchSellHistoryItems={batchSellHistoryItems}
                  />
                ) : (
                  <ActivityDetailsDualAmountHeader
                    sentToken={sourceTokenModel}
                    receivedToken={destinationTokenModel}
                  />
                )
              }
              metadata={
                <>
                  <ActivityDetailsBridgeMetadata
                    item={bridgeItem}
                    bridgeHistoryItem={bridgeTxHistoryItem}
                    destinationChainId={activityDestinationChainId}
                  />
                  {isBridge &&
                    bridgeStatus.status === StatusTypes.PENDING &&
                    estimatedCompletionString && (
                      <Box style={styles.detailRow}>
                        <Text
                          variant={TextVariant.BodyMd}
                          fontWeight={FontWeight.Medium}
                        >
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
                            onPress={() =>
                              setIsStepListExpanded(!isStepListExpanded)
                            }
                          >
                            <Icon
                              name={
                                isStepListExpanded
                                  ? IconName.ArrowUp
                                  : IconName.ArrowDown
                              }
                              color={IconColor.Muted}
                              size={IconSize.Sm}
                            />
                          </TouchableOpacity>
                        </Box>
                      </Box>
                    )}
                  {bridgeStatus.status !== StatusTypes.COMPLETE &&
                    isStepListExpanded && (
                      <Box style={styles.detailRow}>
                        <BridgeStepList
                          bridgeHistoryItem={bridgeTxHistoryItem}
                          srcChainTxMeta={evmTxMeta}
                        />
                      </Box>
                    )}
                </>
              }
              details={
                <ActivityDetailSection>
                  <ActivityDetailRow
                    label={strings('activity_details.network_fee')}
                    value={
                      isGasSponsored ? (
                        <PaidByMetaMask />
                      ) : gasFeeAmount ? (
                        `${gasFeeAmount} ${gasFeeSymbol}`
                      ) : undefined
                    }
                  />
                  {totalAmountText ? (
                    <ActivityDetailRow
                      label={strings('activity_details.total_amount')}
                      value={totalAmountText}
                    />
                  ) : null}
                </ActivityDetailSection>
              }
              footer={
                isIntentNotCompletedItem ? null : (
                  <>
                    <Button
                      variant={ButtonVariant.Secondary}
                      size={ButtonSize.Lg}
                      twClassName="w-full"
                      onPress={handleViewBlockExplorer}
                      testID="bridge-transaction-details-view-block-explorer"
                    >
                      {strings('activity_details.view_on_block_explorer')}
                    </Button>
                    <ActivityDetailsDoItAgainButton
                      label={
                        isSwap
                          ? strings('activity_details.swap_again')
                          : strings('activity_details.bridge_again')
                      }
                      onPress={handleBridgeAgain}
                    />
                  </>
                )
              }
            />
          </ScrollView>
        </Box>
      </SafeAreaView>
    );
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
                  {multiChainTotalGasFee} {multiChainGasFeeSymbol}
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
            onPress={handleViewBlockExplorer}
          >
            {strings('bridge_transaction_details.view_on_block_explorer')}
          </Button>
        )}
      </Box>
    </ScreenView>
  );
};
