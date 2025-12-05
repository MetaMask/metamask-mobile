import { TransactionMeta } from '@metamask/transaction-controller';
import { Hex, createProjectLogger } from '@metamask/utils';

import Engine from '../../../../core/Engine';
import { generateTransferData } from '../../../../util/transactions';
import { updateTransaction } from '../../../../util/transaction-controller';
import { MUSD_TOKEN_ADDRESS_BY_CHAIN } from '../../../UI/Earn/constants/musd';
import { parseStandardTokenTransactionData } from './transaction';

const log = createProjectLogger('musd-conversion');

/**
 * Extracts the transfer amount from ERC-20 transfer transaction data.
 * Returns '0x0' if extraction fails.
 */
export function extractTransferAmount(data: string | undefined): Hex {
  const DEFAULT_AMOUNT: Hex = '0x0';

  if (!data) {
    return DEFAULT_AMOUNT;
  }

  const decodedData = parseStandardTokenTransactionData(data);

  // For ERC20 transfer: args[0] = recipient, args[1] = amount
  if (decodedData?.name === 'transfer' && decodedData?.args?.[1]) {
    try {
      const amountBigNumber = decodedData.args[1];
      return amountBigNumber.toHexString() as Hex;
    } catch (parseError) {
      log('Failed to parse amount from transaction data', parseError);
    }
  }

  return DEFAULT_AMOUNT;
}

/**
 * Updates a mUSD conversion transaction to target a new chain.
 *
 * This function is called when the user changes their payment token to a different chain
 * during a mUSD conversion flow. It updates the transaction to target the mUSD token
 * on the new chain while preserving the entered amount.
 *
 * @param transactionMeta - The current transaction metadata
 * @param newChainId - The chain ID of the new payment token
 * @throws Error if the new chain doesn't support mUSD or if the network client is not found
 */
export function updateMusdConversionChain({
  transactionMeta,
  newChainId,
}: {
  transactionMeta: TransactionMeta;
  newChainId: Hex;
}): void {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔧 updateMusdConversionChain - START');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Transaction ID:', transactionMeta.id);
  console.log('Current Chain ID:', transactionMeta.chainId);
  console.log('New Chain ID:', newChainId);
  console.log('Current To Address:', transactionMeta.txParams?.to);

  // Validate the new chain has mUSD support
  const newOutputTokenAddress = MUSD_TOKEN_ADDRESS_BY_CHAIN[newChainId];

  if (!newOutputTokenAddress) {
    throw new Error(
      `[mUSD Conversion] Chain ${newChainId} not supported for mUSD output`,
    );
  }

  console.log('New mUSD Address:', newOutputTokenAddress);

  // Extract current amount from transaction data
  const amount = extractTransferAmount(transactionMeta.txParams?.data);
  console.log('Preserved Amount:', amount);

  // Regenerate transfer data with preserved amount (self-transfer)
  const transferData = generateTransferData('transfer', {
    toAddress: transactionMeta.txParams.from as Hex,
    amount,
  });

  // Get the current transaction from TransactionController
  const { TransactionController, NetworkController } = Engine.context;
  const transactions = TransactionController.getTransactions({
    searchCriteria: { id: transactionMeta.id },
  });

  // Since we're searching by unique ID, array will have 0 or 1 element
  const currentTx = transactions[0];

  if (!currentTx) {
    throw new Error(
      `[mUSD Conversion] Transaction not found for ID: ${transactionMeta.id}`,
    );
  }

  // Resolve networkClientId for the new chain
  const newNetworkClientId =
    NetworkController.findNetworkClientIdByChainId(newChainId);

  if (!newNetworkClientId) {
    throw new Error(
      `[mUSD Conversion] Network client not found for chain ID: ${newChainId}`,
    );
  }

  console.log('Current Network Client ID:', currentTx.networkClientId);
  console.log('New Network Client ID:', newNetworkClientId);

  // Update transaction: chainId, networkClientId, to (mUSD address), data
  updateTransaction(
    {
      ...currentTx,
      chainId: newChainId,
      networkClientId: newNetworkClientId,
      txParams: {
        ...currentTx.txParams,
        to: newOutputTokenAddress,
        data: transferData,
      },
    },
    'Updated mUSD conversion transaction for chain change',
  );

  // Verify the update by fetching the transaction again
  const verifyTx = TransactionController.getTransactions({
    searchCriteria: { id: transactionMeta.id },
  })[0];

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ TRANSACTION UPDATED - VERIFICATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Updated Chain ID:', verifyTx?.chainId);
  console.log('Updated Network Client ID:', verifyTx?.networkClientId);
  console.log('Updated To Address:', verifyTx?.txParams.to);
  console.log('Updated Data:', verifyTx?.txParams.data);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  log(
    `Updated transaction to target mUSD on chain ${newChainId}`,
    newOutputTokenAddress,
  );
}
