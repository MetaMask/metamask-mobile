import React from 'react';
import { useSelector } from 'react-redux';
import Text, {
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import { Box } from '../../../../../UI/Box/Box';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from '../transaction-details-summary/transaction-details-summary.styles';
import { strings } from '../../../../../../../locales/i18n';
import { selectTransactionsByIds } from '../../../../../../selectors/transactionController';
import { RootState } from '../../../../../../reducers';
import { TransactionMeta } from '@metamask/transaction-controller';
import { useNetworkName } from '../../../hooks/useNetworkName';
import { useTokenWithBalance } from '../../../hooks/tokens/useTokenWithBalance';
import { SummaryLine } from '../transaction-details-summary/transaction-details-summary';
import { findMusdSendTransaction } from './musd-conversion-details-summary.utils';

/**
 * Component for rendering mUSD conversion summary with exactly 2 lines:
 * 1. Sent {stablecoin} from {chain} - with block explorer link
 * 2. Receive mUSD on {chain} - with block explorer link
 */
export function MusdConversionSummary({
  transactionMeta,
}: Readonly<{
  transactionMeta: TransactionMeta;
}>) {
  const { styles } = useStyles(styleSheet, {});
  const { chainId, requiredTransactionIds } = transactionMeta;
  const { tokenAddress, chainId: payChainId } =
    transactionMeta.metamaskPay ?? {};

  const time = transactionMeta.submittedTime ?? transactionMeta.time;
  const networkName = useNetworkName(chainId);
  const sourceToken = useTokenWithBalance(
    tokenAddress ?? '0x0',
    payChainId ?? '0x0',
  );

  // Get required transactions to find the send and receive transaction hashes
  const requiredTransactions = useSelector((state: RootState) =>
    selectTransactionsByIds(state, requiredTransactionIds ?? []),
  );

  // Find the send transaction (swap/transfer of source stablecoin)
  const musdSendTx = findMusdSendTransaction(requiredTransactions, chainId);
  const sendHash = musdSendTx?.hash;
  const sendTitle = sourceToken?.symbol
    ? strings('transaction_details.summary_title.musd_convert_send', {
        sourceSymbol: sourceToken.symbol,
        sourceChain: networkName,
      })
    : strings('transaction_details.summary_title.bridge_send_loading');

  const receiveTitle = strings(
    'transaction_details.summary_title.bridge_receive',
    {
      targetSymbol: 'mUSD',
      targetChain: networkName,
    },
  );

  return (
    <Box gap={12}>
      <Text color={TextColor.Alternative}>Summary</Text>
      <Box gap={1} style={styles.lineContainer}>
        {/* Sent line */}
        <SummaryLine
          chainId={chainId}
          isLast={false}
          time={time}
          title={sendTitle}
          transaction={transactionMeta}
          transactionHash={sendHash}
        />
        {/* Receive line */}
        <SummaryLine
          chainId={chainId}
          isBridgeReceive
          isLast
          time={time}
          title={receiveTitle}
          transaction={transactionMeta}
          transactionHash={undefined}
        />
      </Box>
    </Box>
  );
}
