import { Hex } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import {
  MUSD_ADDRESS_ETHEREUM,
  USDC_ADDRESS_ETHEREUM,
  ETHEREUM_MAINNET_CHAIN_ID,
} from '../../Earn/constants/musd';
import { store } from '../../../../store';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import { generateTransferData } from '../../../../util/transactions';

/**
 * Initiates mUSD conversion flow using MetaMask Pay (TransactionPayController) with Relay integration.
 *
 * This function:
 * 1. Creates a placeholder mUSD transfer transaction with amount = 0
 * 2. Navigates to full-screen confirmation where user inputs amount
 * 3. User selects payment stablecoin (USDC, USDT, DAI) on confirmation screen
 * 4. TransactionPayController automatically fetches quotes and handles the flow
 *
 * @returns The transaction ID for tracking
 * @throws Error if account address is not available or transaction creation fails
 */
// TODO: If keeping this function, refactor to be a hook and access state with useSelector instead of statically using store.getState().
// TODO: Consider renaming function to be more descriptive of what it's actually doing.
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

    // Create minimal transfer data with amount = 0
    // The actual amount will be set by the user on the confirmation screen
    const transferData = generateTransferData('transfer', {
      toAddress: selectedAddress as Hex, // Transfer to self
      amount: '0x0', // Placeholder amount
    });

    Logger.log('[mUSD Conversion] Generated transfer data:', transferData);

    // Create the transaction via TransactionController
    // This will show the confirmation screen where user inputs amount and selects payment token
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
        networkClientId,
        origin: 'metamask',
        // TODO: Add type for musdConversion to TransactionType.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: 'musdConversion' as any, // String literal for now, will be added to TransactionType enum later
      },
    );

    const transactionId = transactionMeta.id;
    Logger.log('[mUSD Conversion] Transaction created:', transactionId);

    // TODO: Verify if we can get around this by calling useAddToken in the musd-conversion-info component instead.
    // Step 2: Set payment token to USDC on Ethereum
    // This overrides the automatic selection which would default to mUSD (target token)
    const { TransactionPayController } = Engine.context;

    // Small delay to ensure TransactionPayController has detected the transaction
    await new Promise((resolve) => setTimeout(resolve, 100));

    Logger.log('[mUSD Conversion] Setting default payment token to USDC...');

    TransactionPayController.updatePaymentToken({
      transactionId,
      tokenAddress: USDC_ADDRESS_ETHEREUM as Hex,
      chainId: ETHEREUM_MAINNET_CHAIN_ID as Hex,
    });

    Logger.log('[mUSD Conversion] Payment token set to USDC');
    Logger.log('[mUSD Conversion] Navigating to confirmation screen...');

    return transactionId;
  } catch (error) {
    Logger.error(
      error as Error,
      '[mUSD Conversion] Failed to create conversion transaction',
    );
    throw error;
  }
}
