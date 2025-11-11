import { Interface } from '@ethersproject/abi';
import { abiERC20 } from '@metamask/metamask-eth-abis';
import { Hex } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import {
  MUSD_ADDRESS_ETHEREUM,
  USDC_ADDRESS_ETHEREUM,
  MUSD_CONVERSION_AMOUNT,
  ETHEREUM_MAINNET_CHAIN_ID,
} from '../constants';
import { store } from '../../../../store';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';

/**
 * Converts user's USDC on Ethereum mainnet to mUSD on Ethereum mainnet
 * using MetaMask Pay (TransactionPayController) with Relay integration.
 *
 * This function:
 * 1. Creates a self-transfer transaction for 2 mUSD
 * 2. TransactionPayController automatically detects the required token
 * 3. Sets USDC on Ethereum as the payment source
 * 4. User approves and the publish hook handles the entire flow
 *
 * @returns The transaction ID for tracking
 * @throws Error if account address is not available or transaction creation fails
 */
export async function convertStablecoinToMUSD(): Promise<string> {
  try {
    // Get the selected account address
    const state = store.getState();
    const selectedAddress =
      selectSelectedInternalAccountFormattedAddress(state);

    if (!selectedAddress) {
      throw new Error(
        'No account selected. Please select an account to continue.',
      );
    }

    Logger.log('[mUSD Conversion] Selected address:', selectedAddress);

    // Get network client ID for Ethereum mainnet
    const { NetworkController } = Engine.context;
    const networkClientId = NetworkController.findNetworkClientIdByChainId(
      ETHEREUM_MAINNET_CHAIN_ID as Hex,
    );

    if (!networkClientId) {
      throw new Error('Unable to find network client for Ethereum mainnet');
    }

    Logger.log('[mUSD Conversion] Network client ID:', networkClientId);

    // Encode ERC-20 transfer function data
    // transfer(address to, uint256 amount)
    const erc20Interface = new Interface(abiERC20);
    const transferData = erc20Interface.encodeFunctionData('transfer', [
      selectedAddress, // Transfer to self
      MUSD_CONVERSION_AMOUNT, // 2 mUSD (2000000 with 6 decimals)
    ]) as Hex;

    Logger.log('[mUSD Conversion] Encoded transfer data:', transferData);

    // Step 1: Create the transaction via TransactionController
    // This will create a transaction that requires 2 mUSD on Ethereum mainnet
    const { TransactionController } = Engine.context;

    const { transactionMeta } = await TransactionController.addTransaction(
      {
        to: MUSD_ADDRESS_ETHEREUM as Hex,
        from: selectedAddress as Hex,
        data: transferData,
        value: '0x0',
        chainId: ETHEREUM_MAINNET_CHAIN_ID as Hex,
      },
      {
        origin: 'metamask-mobile-musd-conversion',
        networkClientId,
        requireApproval: true,
      },
    );

    const transactionId = transactionMeta.id;
    Logger.log('[mUSD Conversion] Transaction created:', transactionId);

    // Step 2: Set payment token to USDC on Ethereum
    // TransactionPayController will automatically:
    // - Calculate required source amount
    // - Fetch quotes from Relay
    // - Calculate fees and totals
    // - Update transaction metadata
    const { TransactionPayController } = Engine.context;

    // Small delay to ensure TransactionPayController has detected the transaction
    await new Promise((resolve) => setTimeout(resolve, 100));

    Logger.log(
      '[mUSD Conversion] Setting payment token to USDC on Ethereum...',
    );

    TransactionPayController.updatePaymentToken({
      transactionId,
      tokenAddress: USDC_ADDRESS_ETHEREUM as Hex,
      chainId: ETHEREUM_MAINNET_CHAIN_ID as Hex,
    });

    Logger.log('[mUSD Conversion] Payment token set successfully');
    Logger.log(
      '[mUSD Conversion] TransactionPayController will now fetch quotes from Relay',
    );
    Logger.log(
      '[mUSD Conversion] User will see approval screen with fee breakdown',
    );

    return transactionId;
  } catch (error) {
    Logger.error(
      error as Error,
      '[mUSD Conversion] Failed to create conversion transaction',
    );
    throw error;
  }
}
