import { useCallback, useState } from 'react';
import { useCardSDK } from '../sdk';
import Logger from '../../../../util/Logger';
import { ethers } from 'ethers';
import Engine from '../../../../core/Engine';
import {
  TransactionType,
  WalletDevice,
} from '@metamask/transaction-controller';
import TransactionTypes from '../../../../core/TransactionTypes';

interface DelegationState {
  isLoading: boolean;
  error: string | null;
  step:
    | 'idle'
    | 'token'
    | 'signature'
    | 'transaction'
    | 'completion'
    | 'success'
    | 'error';
  delegationToken: string | null;
  delegationNonce: string | null;
  transactionHash: string | null;
  signature: string | null;
  signatureMessage: string | null;
}

interface DelegationParams {
  amount: string;
  currency: 'usdc' | 'usdt';
  network: 'linea' | 'solana';
}

interface PriorityToken {
  address?: string | null;
  symbol?: string | null;
  decimals?: number | null;
  chainId?: string | null;
  allowance?: string | null;
  allowanceState?: string | null;
  walletAddress?: string | null;
  name?: string | null;
}

/**
 * Hook to handle the complete delegation flow for spending limit increases
 * Follows the delegation flow diagram: Token -> Signature -> Transaction -> Completion
 */
export const useCardDelegation = (priorityToken?: PriorityToken | null) => {
  const { sdk } = useCardSDK();

  const [state, setState] = useState<DelegationState>({
    isLoading: false,
    error: null,
    step: 'idle',
    delegationToken: null,
    delegationNonce: null,
    transactionHash: null,
    signature: null,
    signatureMessage: null,
  });

  /**
   * Step 1: Generate delegation token
   */
  const generateDelegationToken = useCallback(
    async (network: 'linea' | 'solana', address: string) => {
      if (!sdk) {
        throw new Error('Card SDK not available');
      }

      if (!address) {
        throw new Error('No address provided');
      }

      setState((prev) => ({
        ...prev,
        step: 'token',
        isLoading: true,
        error: null,
      }));

      try {
        const tokenData = await sdk.generateDelegationToken(network, address);

        setState((prev) => ({
          ...prev,
          step: 'signature',
          isLoading: false,
          delegationToken: tokenData.token,
          delegationNonce: tokenData.nonce,
        }));

        return tokenData;
      } catch (error) {
        Logger.error(
          error as Error,
          'useCardDelegation::Failed to generate delegation token',
        );
        setState((prev) => ({
          ...prev,
          step: 'error',
          isLoading: false,
          error: 'Failed to generate delegation token',
        }));
        throw error;
      }
    },
    [sdk],
  );

  /**
   * Step 2: Generate SIWE message and prompt user to sign
   */
  const generateSignatureMessage = useCallback(
    async (address: string): Promise<string> => {
      if (!address) {
        throw new Error('Address not provided for signature message');
      }

      const now = new Date();
      const expirationTime = new Date(now.getTime() + 30 * 60000); // 30 minutes
      const issuedAt = now.getTime();
      const nonce = state.delegationNonce;
      const chainId = priorityToken?.chainId
        ? parseInt(priorityToken.chainId)
        : 59144; // Linea mainnet

      const sigMessage = `MetaMask Mobile wants you to sign in with your Ethereum account:\n${address}\n\nProve address ownership\n\nURI: metamask://\nVersion: 1\nChain ID: ${chainId}\nNonce: ${nonce}\nIssued At: ${new Date(
        issuedAt,
      ).toISOString()}\nExpiration Time: ${new Date(
        expirationTime,
      ).toISOString()}`;

      setState((prev) => ({
        ...prev,
        signatureMessage: sigMessage,
      }));

      return sigMessage;
    },
    [priorityToken, state.delegationNonce],
  );

  /**
   * Step 3: Handle user signature
   */
  const handleUserSignature = useCallback(async (signature: string) => {
    setState((prev) => ({
      ...prev,
      step: 'transaction',
      signature,
    }));
  }, []);

  /**
   * Step 4: Execute blockchain approval transaction
   */
  const executeApprovalTransaction = useCallback(
    async (params: DelegationParams, delegationToken: string) => {
      if (!delegationToken) {
        throw new Error('Missing required data for transaction');
      }

      const { AccountsController } = Engine.context;
      const selectedAccount = AccountsController.getSelectedAccount();
      if (!selectedAccount?.address) {
        throw new Error('No selected MetaMask account found');
      }

      setState((prev) => ({ ...prev, step: 'transaction', isLoading: true }));

      try {
        const supportedNetworks = {
          linea: ['0xe708', '0xe704'], // Linea Mainnet, Linea Sepolia
          solana: ['solana:mainnet'], // Solana Mainnet
        };

        const targetNetwork = params.network;
        const supportedChainIds = supportedNetworks[targetNetwork];

        if (!supportedChainIds) {
          throw new Error(`Unsupported network: ${targetNetwork}`);
        }

        // Get current network client ID for transaction execution
        const { NetworkController } = Engine.context;
        const networkClientId = NetworkController.state.selectedNetworkClientId;

        if (!sdk) {
          throw new Error('Card SDK not available');
        }

        // Get token address from chain config API
        const tokenAddress = await sdk.getTokenAddress(
          targetNetwork,
          params.currency,
        );

        // Get spender address from chain config API
        const spenderAddress = await sdk.getPlatformSpenderAddress(
          targetNetwork,
        );

        // Create the approval transaction
        const tokenDecimals = priorityToken?.decimals || 6;
        const amountInWei = ethers.utils.parseUnits(
          params.amount,
          tokenDecimals,
        );

        const transactionData = sdk.encodeApproveTransaction(
          spenderAddress,
          amountInWei.toString(),
        );

        // Create transaction object
        const transaction = {
          to: tokenAddress,
          data: transactionData,
        };

        // Add debug logging for transaction data
        Logger.log('Transaction data breakdown:', {
          tokenAddress,
          spenderAddress,
          amountInWei: amountInWei.toString(),
          amountHuman: params.amount,
          decimals: tokenDecimals,
          transactionData: transaction.data,
        });

        // Execute the transaction using MetaMask's transaction system
        const { TransactionController: TxController } = Engine.context;

        Logger.log('Executing approval transaction with params:', {
          from: selectedAccount.address,
          to: transaction.to,
          data: transaction.data,
        });

        const approveTx = {
          from: selectedAccount.address,
          to: transaction.to,
          data: transaction.data,
        };

        const { result } = await TxController.addTransaction(approveTx, {
          networkClientId,
          origin: TransactionTypes.MMM,
          type: TransactionType.tokenMethodApprove,
          deviceConfirmedOn: WalletDevice.MM_MOBILE,
          requireApproval: true,
        });

        Logger.log('Transaction created and submitted');

        // Wait for the transaction to be completed
        try {
          await result;
          Logger.log('Transaction completed successfully');
        } catch (error) {
          Logger.log('Transaction failed or cancelled:', error);
          // If transaction was cancelled, throw a user-friendly error
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          if (
            errorMessage.includes('User denied') ||
            errorMessage.includes('rejected')
          ) {
            throw new Error('Transaction was cancelled by user');
          }
          throw error;
        }

        Logger.log('Transaction completed successfully');

        setState((prev) => ({
          ...prev,
          step: 'completion',
          isLoading: false,
        }));

        return 'completed';
      } catch (error) {
        Logger.error(
          error as Error,
          'useCardDelegation::Failed to execute approval transaction',
        );
        setState((prev) => ({
          ...prev,
          step: 'error',
          isLoading: false,
          error: 'Failed to execute approval transaction',
        }));
        throw error;
      }
    },
    [sdk, priorityToken?.decimals],
  );

  /**
   * Step 5: Complete delegation with Baanx API
   */
  const completeDelegation = useCallback(
    async (
      params: DelegationParams,
      delegationToken: string,
      transactionHash: string,
      signature: string,
      signatureMessage: string,
    ) => {
      if (!sdk || !delegationToken || !transactionHash || !signature) {
        throw new Error('Missing required data for delegation completion');
      }

      // Get the user's MetaMask account address
      const { AccountsController } = Engine.context;
      const selectedAccount = AccountsController.getSelectedAccount();
      if (!selectedAccount?.address) {
        throw new Error('No selected MetaMask account found');
      }

      setState((prev) => ({ ...prev, step: 'completion', isLoading: true }));

      try {
        const result = await sdk.completeEVMDelegation({
          address: selectedAccount.address,
          network: params.network,
          currency: params.currency,
          amount: params.amount,
          txHash: transactionHash,
          sigHash: signature,
          sigMessage: signatureMessage,
          token: delegationToken,
        });

        setState((prev) => ({
          ...prev,
          step: 'success',
          isLoading: false,
        }));

        return result;
      } catch (error) {
        Logger.error(
          error as Error,
          'useCardDelegation::Failed to complete delegation',
        );
        setState((prev) => ({
          ...prev,
          step: 'error',
          isLoading: false,
          error: 'Failed to complete delegation',
        }));
        throw error;
      }
    },
    [sdk],
  );

  /**
   * Get delegation token (Step 1)
   */
  const getDelegationToken = useCallback(
    async (network: 'linea' | 'solana', address: string) =>
      await generateDelegationToken(network, address),
    [generateDelegationToken],
  );

  /**
   * Submit delegation (Steps 2-5: Signature + Transaction + Completion)
   */
  const submitDelegation = useCallback(
    async (params: DelegationParams, _address: string) => {
      try {
        const { AccountsController } = Engine.context;
        const selectedAccount = AccountsController.getSelectedAccount();
        if (!selectedAccount?.address) {
          throw new Error('No selected MetaMask account found');
        }
        const userAddress = selectedAccount.address;

        Logger.log(
          'Starting delegation flow with params:',
          params,
          'address:',
          userAddress,
        );

        // Step 1: Get delegation token
        Logger.log('Step 1: Getting delegation token...');
        const tokenData = await getDelegationToken(params.network, userAddress);
        Logger.log('Delegation token obtained:', tokenData);

        // Step 2: Generate signature message
        Logger.log('Step 2: Generating signature message...');
        const signatureMessage = await generateSignatureMessage(userAddress);
        Logger.log('Signature message generated');

        // Step 3: Sign message (SIWE - no popup needed for internal Card feature)
        Logger.log('Step 3: Signing message...');
        const siweHex =
          '0x' + Buffer.from(signatureMessage, 'utf8').toString('hex');

        const { KeyringController } = Engine.context;
        const signature = await KeyringController.signPersonalMessage({
          data: siweHex,
          from: userAddress,
        });
        Logger.log('Message signed successfully');

        // Step 4: Execute approval transaction (with popup)
        Logger.log('Step 4: Executing approval transaction...');
        const transactionHash = await executeApprovalTransaction(
          params,
          tokenData.token,
        );
        Logger.log('Approval transaction completed, hash:', transactionHash);

        // Step 5: Complete delegation with Baanx API
        Logger.log('Step 5: Completing delegation with Baanx API...');
        const result = await completeDelegation(
          params,
          tokenData.token,
          transactionHash,
          signature,
          signatureMessage,
        );
        Logger.log('Delegation completed successfully:', result);

        return result;
      } catch (error) {
        Logger.error(
          error as Error,
          'useCardDelegation::Failed to submit delegation',
        );
        throw error;
      }
    },
    [
      getDelegationToken,
      generateSignatureMessage,
      executeApprovalTransaction,
      completeDelegation,
    ],
  );

  /**
   * Complete delegation flow for spending limit increase
   * @deprecated Use getDelegationToken + submitDelegation instead
   */
  const startDelegationFlow = useCallback(
    async (params: DelegationParams, _address: string) => {
      try {
        const { AccountsController } = Engine.context;
        const selectedAccount = AccountsController.getSelectedAccount();
        if (!selectedAccount?.address) {
          throw new Error('No selected MetaMask account found');
        }
        const userAddress = selectedAccount.address;

        // Step 1: Generate delegation token
        const tokenData = await generateDelegationToken(
          params.network,
          userAddress,
        );

        // Step 2: Generate signature message with the provided address
        const signatureMessage = await generateSignatureMessage(userAddress);

        // Return the signature message and delegation token for the UI to handle user signing
        return { signatureMessage, delegationToken: tokenData.token };
      } catch (error) {
        Logger.error(
          error as Error,
          'useCardDelegation::Failed to start delegation flow',
        );
        throw error;
      }
    },
    [generateDelegationToken, generateSignatureMessage],
  );

  /**
   * Continue delegation flow after user signs
   */
  const continueDelegationFlow = useCallback(
    async (
      signature: string,
      params: DelegationParams,
      delegationToken: string,
      signatureMessage: string,
    ) => {
      try {
        // Step 3: Handle user signature
        await handleUserSignature(signature);

        // Step 4: Execute blockchain transaction
        const transactionHash = await executeApprovalTransaction(
          params,
          delegationToken,
        );

        // Step 5: Complete delegation
        const result = await completeDelegation(
          params,
          delegationToken,
          transactionHash,
          signature,
          signatureMessage,
        );

        return result;
      } catch (error) {
        Logger.error(
          error as Error,
          'useCardDelegation::Failed to continue delegation flow',
        );
        throw error;
      }
    },
    [handleUserSignature, executeApprovalTransaction, completeDelegation],
  );

  /**
   * Reset delegation state
   */
  const resetDelegation = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      step: 'idle',
      delegationToken: null,
      delegationNonce: null,
      transactionHash: null,
      signature: null,
      signatureMessage: null,
    });
  }, []);

  return {
    ...state,
    // New simplified API
    getDelegationToken,
    submitDelegation,
    // Legacy API (deprecated)
    startDelegationFlow,
    continueDelegationFlow,
    resetDelegation,
  };
};
