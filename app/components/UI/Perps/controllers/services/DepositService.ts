import { toHex } from '@metamask/controller-utils';
import { parseCaipAssetId, type Hex } from '@metamask/utils';
import type { TransactionParams } from '@metamask/transaction-controller';
import { getEvmAccountFromSelectedAccountGroup } from '../../utils/accountUtils';
import { generateTransferData } from '../../../../../util/transactions';
import { generateDepositId } from '../../utils/idUtils';
import type { IPerpsProvider } from '../types';

// Temporary to avoid estimation failures due to insufficient balance
const DEPOSIT_GAS_LIMIT = toHex(100000);

/**
 * DepositService
 *
 * Handles deposit transaction preparation and validation.
 * Stateless service that prepares transaction data for TransactionController.
 * Controller handles TransactionController integration and promise lifecycle.
 */
export class DepositService {
  /**
   * Prepare deposit transaction for confirmation
   * Extracts transaction construction logic from controller
   *
   * @param options - Configuration object
   * @param options.provider - Active provider instance
   * @returns Transaction data ready for TransactionController.addTransaction
   */
  static async prepareTransaction(options: {
    provider: IPerpsProvider;
  }): Promise<{
    transaction: TransactionParams;
    assetChainId: Hex;
    currentDepositId: string;
  }> {
    const { provider } = options;

    // Generate deposit request ID for tracking
    const currentDepositId = generateDepositId();

    // Get deposit routes from provider
    const depositRoutes = provider.getDepositRoutes({ isTestnet: false });
    const route = depositRoutes[0];
    const bridgeContractAddress = route.contractAddress;

    // Generate transfer data for ERC-20 token transfer
    const transferData = generateTransferData('transfer', {
      toAddress: bridgeContractAddress,
      amount: '0x0',
    });

    // Get EVM account from selected account group
    const evmAccount = getEvmAccountFromSelectedAccountGroup();
    if (!evmAccount) {
      throw new Error(
        'No EVM-compatible account found in selected account group',
      );
    }
    const accountAddress = evmAccount.address as Hex;

    // Parse CAIP asset ID to extract chain ID and token address
    const parsedAsset = parseCaipAssetId(route.assetId);
    const assetChainId = toHex(parsedAsset.chainId.split(':')[1]) as Hex;
    const tokenAddress = parsedAsset.assetReference as Hex;

    // Build transaction parameters for TransactionController
    const transaction: TransactionParams = {
      from: accountAddress,
      to: tokenAddress,
      value: '0x0',
      data: transferData,
      gas: DEPOSIT_GAS_LIMIT,
    };

    return {
      transaction,
      assetChainId,
      currentDepositId,
    };
  }
}
