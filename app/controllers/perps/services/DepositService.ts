import { toHex } from '@metamask/controller-utils';
import { parseCaipAssetId } from '@metamask/utils';
import type { Hex } from '@metamask/utils';

import type {
  PerpsProvider,
  PerpsPlatformDependencies,
  PerpsControllerMessengerBase,
  PerpsTransactionParams,
} from '../types';
import { getSelectedEvmAccount } from '../utils/accountUtils';
import { generateDepositId } from '../utils/idUtils';
import { generateERC20TransferData } from '../utils/transferData';

// Temporary to avoid estimation failures due to insufficient balance
const DEPOSIT_GAS_LIMIT = toHex(100000);

/**
 * DepositService
 *
 * Handles deposit transaction preparation and validation.
 * Stateless service that prepares transaction data for TransactionController.
 * Controller handles TransactionController integration and promise lifecycle.
 *
 * Instance-based service with constructor injection of platform dependencies
 * and messenger for inter-controller communication.
 */
export class DepositService {
  readonly #deps: PerpsPlatformDependencies;

  readonly #messenger: PerpsControllerMessengerBase;

  /**
   * Create a new DepositService instance
   *
   * @param deps - Platform dependencies for logging, metrics, etc.
   * @param messenger - Controller messenger for cross-controller communication.
   */
  constructor(
    deps: PerpsPlatformDependencies,
    messenger: PerpsControllerMessengerBase,
  ) {
    this.#deps = deps;
    this.#messenger = messenger;
  }

  /**
   * Prepare deposit transaction for confirmation
   * Extracts transaction construction logic from controller
   *
   * @param options - Configuration object
   * @param options.provider - Active provider instance
   * @returns Transaction data ready for TransactionController.addTransaction
   */
  async prepareTransaction(options: { provider: PerpsProvider }): Promise<{
    transaction: PerpsTransactionParams;
    assetChainId: Hex;
    currentDepositId: string;
  }> {
    const { provider } = options;

    this.#deps.debugLogger.log('DepositService: Preparing deposit transaction');

    // Generate deposit request ID for tracking
    const currentDepositId = generateDepositId();

    // Get deposit routes from provider
    const depositRoutes = provider.getDepositRoutes({ isTestnet: false });
    const route = depositRoutes[0];
    const bridgeContractAddress = route.contractAddress;

    // Generate transfer data for ERC-20 token transfer (portable, no mobile imports)
    const transferData = generateERC20TransferData(
      bridgeContractAddress,
      '0x0',
    );

    // Get EVM account from selected account group via messenger
    const evmAccount = getSelectedEvmAccount(
      this.#messenger.call(
        'AccountTreeController:getAccountsFromSelectedAccountGroup',
      ),
    );
    if (!evmAccount) {
      throw new Error(
        'No EVM-compatible account found in selected account group',
      );
    }
    const accountAddress = evmAccount.address as Hex;

    // Parse CAIP asset ID to extract chain ID and token address
    const parsedAsset = parseCaipAssetId(route.assetId);
    const assetChainId = toHex(parsedAsset.chainId.split(':')[1]);
    const tokenAddress = parsedAsset.assetReference as Hex;

    // Build transaction parameters for TransactionController
    const transaction: PerpsTransactionParams = {
      from: accountAddress,
      to: tokenAddress,
      value: '0x0',
      data: transferData,
      gas: DEPOSIT_GAS_LIMIT,
    };

    this.#deps.debugLogger.log('DepositService: Deposit transaction prepared', {
      depositId: currentDepositId,
      assetChainId,
      from: accountAddress,
      to: tokenAddress,
    });

    return {
      transaction,
      assetChainId,
      currentDepositId,
    };
  }
}
