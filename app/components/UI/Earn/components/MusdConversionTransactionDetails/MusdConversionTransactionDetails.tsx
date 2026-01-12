import React, { useEffect, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { getNativeAssetForChainId } from '@metamask/bridge-controller';
import { BigNumber } from 'bignumber.js';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import ScreenView from '../../../../Base/ScreenView';
import { Box } from '../../../Box/Box';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import TransactionAsset from '../../../Bridge/components/TransactionDetails/TransactionAsset';
import { calcTokenAmount } from '../../../../../util/transactions';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import Routes from '../../../../../constants/navigation/Routes';
import { BridgeToken } from '../../../Bridge/types';
import { toDateFormat } from '../../../../../util/date';
import { MUSD_TOKEN, MUSD_TOKEN_ADDRESS_BY_CHAIN } from '../../constants/musd';
import { getAssetImageUrl } from '../../../Bridge/hooks/useAssetMetadata/utils';
import { getMusdConversionTransactionDetailsNavbar } from '../../../Navbar';
import { useMultichainBlockExplorerTxUrl } from '../../../Bridge/hooks/useMultichainBlockExplorerTxUrl';
import { useTokenWithBalance } from '../../../../Views/confirmations/hooks/tokens/useTokenWithBalance';
import { calcHexGasTotal } from '../../../Bridge/utils/transactionGas';
import { parseStandardTokenTransactionData } from '../../../../Views/confirmations/utils/transaction';
import {
  selectTransactionsByBatchId,
  selectTransactionsByIds,
} from '../../../../../selectors/transactionController';
import { RootState } from '../../../../../reducers';
import { styles } from './MusdConversionTransactionDetails.styles';
import {
  MusdConversionTransactionDetailsProps,
  MusdConversionTransactionDetailsSelectorsIDs,
} from './MusdConversionTransactionDetails.types';

const TxStatusToColorMap: Record<TransactionStatus, TextColor> = {
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

export const MusdConversionTransactionDetails = ({
  route,
}: MusdConversionTransactionDetailsProps) => {
  const navigation = useNavigation();

  const transactionMeta = route.params.transactionMeta;
  const {
    chainId,
    status,
    time,
    hash,
    metamaskPay,
    txParams,
    batchId,
    requiredTransactionIds,
  } = transactionMeta;

  useEffect(() => {
    navigation.setOptions(
      getMusdConversionTransactionDetailsNavbar(navigation),
    );
  }, [navigation]);

  // Get all related transactions (requiredTransactionIds + batchTransactionIds + main transaction)
  const batchTransactions = useSelector((state: RootState) =>
    selectTransactionsByBatchId(state, batchId ?? ''),
  );

  const batchTransactionIds = useMemo(
    () =>
      batchTransactions
        .filter((t) => t.id !== transactionMeta.id)
        .map((t) => t.id),
    [batchTransactions, transactionMeta.id],
  );

  const allTransactionIds = useMemo(
    () => [
      ...(requiredTransactionIds ?? []),
      ...(batchTransactionIds ?? []),
      transactionMeta.id,
    ],
    [requiredTransactionIds, batchTransactionIds, transactionMeta.id],
  );

  const relatedTransactions = useSelector((state: RootState) =>
    selectTransactionsByIds(state, allTransactionIds),
  );

  // Find the last transaction with a valid hash (not '0x0' placeholder)
  // Child transactions are ordered by nonce, so the last one is the main conversion
  const realTxHash = useMemo(() => {
    // If the main transaction has a valid hash, use it
    if (hash && hash !== '0x0') {
      return hash;
    }

    // Find the last child transaction with a valid hash
    const transactionsWithHashes = relatedTransactions.filter(
      (tx) => tx.hash && tx.hash !== '0x0',
    );

    if (transactionsWithHashes.length > 0) {
      return transactionsWithHashes[transactionsWithHashes.length - 1].hash;
    }

    return undefined;
  }, [hash, relatedTransactions]);

  // Get block explorer URL using the same hook as Bridge/Swap
  const chainIdNumber = chainId ? parseInt(chainId, 16) : undefined;
  const explorerData = useMultichainBlockExplorerTxUrl({
    chainId: chainIdNumber,
    txHash: realTxHash,
  });

  // Get source token data using useTokenWithBalance (same as swap flow)
  const payChainId = (metamaskPay?.chainId ?? chainId) as Hex;
  const payTokenAddress = (metamaskPay?.tokenAddress ?? '0x0') as Hex;
  const sourceTokenInfo = useTokenWithBalance(payTokenAddress, payChainId);

  // Parse transaction data to get the actual amount transferred
  // Using the local parseStandardTokenTransactionData which is more robust
  const parsedAmountRaw = useMemo(() => {
    const data = txParams?.data;
    if (!data) return null;

    try {
      const transactionData = parseStandardTokenTransactionData(data);
      if (transactionData?.args?._value) {
        // Convert BigNumber to string (base 10)
        return new BigNumber(transactionData.args._value.toString()).toString(
          10,
        );
      }
    } catch {
      // Ignore parsing errors
    }

    return null;
  }, [txParams?.data]);

  // Get the actual amount formatted with proper decimals
  const sourceTokenAmount = useMemo(() => {
    const decimals = sourceTokenInfo?.decimals ?? 6; // Default to 6 for stablecoins

    // Use parsed amount from transaction data
    if (parsedAmountRaw) {
      return calcTokenAmount(parsedAmountRaw, decimals).toFixed(5);
    }

    // Fallback to metamaskPay tokenAmount if available
    if (metamaskPay?.tokenAmount) {
      return calcTokenAmount(metamaskPay.tokenAmount, decimals).toFixed(5);
    }

    return '0';
  }, [parsedAmountRaw, metamaskPay?.tokenAmount, sourceTokenInfo?.decimals]);

  // Create source token object (same structure as swap flow)
  const sourceToken: BridgeToken | null = sourceTokenInfo
    ? {
        address: payTokenAddress,
        symbol: sourceTokenInfo.symbol ?? 'Token',
        decimals: sourceTokenInfo.decimals ?? 6,
        name: sourceTokenInfo.symbol ?? 'Token',
        image: getAssetImageUrl(payTokenAddress.toLowerCase(), payChainId),
        chainId: payChainId,
      }
    : null;

  // Get destination token data (MUSD) - same amount as source (1:1 conversion)
  const musdAddress = MUSD_TOKEN_ADDRESS_BY_CHAIN[chainId as Hex];
  const destinationToken: BridgeToken = {
    address: musdAddress || '0x0',
    symbol: MUSD_TOKEN.symbol,
    decimals: MUSD_TOKEN.decimals,
    name: MUSD_TOKEN.name,
    image: getAssetImageUrl(musdAddress?.toLowerCase() ?? '', chainId as Hex),
    chainId: chainId as Hex,
  };

  // MUSD amount is same as source amount (1:1 conversion)
  const destinationTokenAmount = sourceTokenAmount;

  const dateString = time ? toDateFormat(time) : 'N/A';

  // Calculate gas fee using the same method as swap flow
  const gasFee = useMemo(() => {
    const hexGasTotal = calcHexGasTotal(transactionMeta);
    return calcTokenAmount(hexGasTotal, 18).toFixed(5);
  }, [transactionMeta]);

  // Get native token symbol using the same method as swap flow
  const nativeTokenSymbol = useMemo(() => {
    try {
      const chainIdNum = parseInt(chainId, 16);
      return getNativeAssetForChainId(chainIdNum).symbol;
    } catch {
      return 'ETH';
    }
  }, [chainId]);

  const handleViewOnBlockExplorer = () => {
    if (explorerData?.explorerTxUrl) {
      navigation.navigate(Routes.BROWSER.HOME, {
        screen: Routes.BROWSER.VIEW,
        params: {
          newTabUrl: explorerData.explorerTxUrl,
          timestamp: Date.now(),
        },
      });
    }
  };

  return (
    <ScreenView testID={MusdConversionTransactionDetailsSelectorsIDs.CONTAINER}>
      <Box style={styles.transactionContainer}>
        <Box style={styles.transactionAssetsContainer}>
          {sourceToken && (
            <TransactionAsset
              token={sourceToken}
              tokenAmount={sourceTokenAmount}
              chainId={payChainId}
              txType={TransactionType.swap}
            />
          )}
          <Box style={styles.arrowContainer}>
            <Icon name={IconName.Arrow2Down} size={IconSize.Sm} />
          </Box>
          <TransactionAsset
            token={destinationToken}
            tokenAmount={destinationTokenAmount}
            chainId={chainId as Hex}
            txType={TransactionType.swap}
          />
        </Box>
        <Box
          style={styles.detailRow}
          testID={MusdConversionTransactionDetailsSelectorsIDs.STATUS_ROW}
        >
          <Text variant={TextVariant.BodyMDMedium}>
            {strings('bridge_transaction_details.status')}
          </Text>
          <Text
            variant={TextVariant.BodyMDMedium}
            color={TxStatusToColorMap[status as TransactionStatus]}
            style={styles.textTransform}
          >
            {status}
          </Text>
        </Box>
        <Box
          style={styles.detailRow}
          testID={MusdConversionTransactionDetailsSelectorsIDs.DATE_ROW}
        >
          <Text variant={TextVariant.BodyMDMedium}>
            {strings('bridge_transaction_details.date')}
          </Text>
          <Text>{dateString}</Text>
        </Box>
        <Box
          style={styles.detailRow}
          testID={MusdConversionTransactionDetailsSelectorsIDs.GAS_FEE_ROW}
        >
          <Text variant={TextVariant.BodyMDMedium}>
            {strings('bridge_transaction_details.total_gas_fee')}
          </Text>
          <Text>
            {gasFee} {nativeTokenSymbol}
          </Text>
        </Box>
      </Box>
      {explorerData?.explorerTxUrl && (
        <Box>
          <Button
            style={styles.blockExplorerButton}
            variant={ButtonVariants.Secondary}
            label={strings('bridge_transaction_details.view_on_block_explorer')}
            onPress={handleViewOnBlockExplorer}
            testID={
              MusdConversionTransactionDetailsSelectorsIDs.BLOCK_EXPLORER_BUTTON
            }
          />
        </Box>
      )}
    </ScreenView>
  );
};

export default MusdConversionTransactionDetails;
