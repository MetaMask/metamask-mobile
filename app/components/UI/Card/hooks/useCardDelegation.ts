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
import { CardNetwork } from '../types';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { SolScope } from '@metamask/keyring-api';
import { NetworkClientId } from '@metamask/network-controller';

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
  currency: string;
  network: CardNetwork;
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
  delegationContract?: string | null;
}

/**
 * Hook to handle the complete delegation flow for spending limit increases
 * Follows the delegation flow diagram: Token -> Signature -> Transaction -> Completion
 */
export const useCardDelegation = (priorityToken?: PriorityToken | null) => {
  const { sdk } = useCardSDK();
  const { KeyringController, TransactionController } = Engine.context;
  const selectAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );

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
    async (_network: CardNetwork, address: string) => {
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
        // const tokenData = await sdk.generateDelegationToken(network, address);
        const tokenData = { token: '123', nonce: '456' };

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
   * Step 4: Execute blockchain approval transaction
   */
  const executeApprovalTransaction = useCallback(
    async (
      params: DelegationParams,
      delegationToken: string,
      address: string,
    ) => {
      if (!delegationToken) {
        throw new Error('Missing required data for transaction');
      }

      setState((prev) => ({ ...prev, step: 'transaction', isLoading: true }));

      try {
        const supportedNetworks: Record<CardNetwork, string[]> = {
          linea: ['0xe708', '0xe704'], // Linea Mainnet, Linea Sepolia
          'linea-us': ['0xe708', '0xe704'], // Linea US uses same chain IDs
          solana: ['solana:mainnet'], // Solana Mainnet
        };

        const targetNetwork = params.network;
        const supportedChainIds = supportedNetworks[targetNetwork];

        if (!supportedChainIds) {
          throw new Error(`Unsupported network: ${targetNetwork}`);
        }

        const networkClientId: NetworkClientId =
          targetNetwork === 'linea' ? 'linea-mainnet' : 'solana-mainnet';

        if (!sdk) {
          throw new Error('Card SDK not available');
        }

        // Get token address and delegation contract from the token
        const tokenAddress = priorityToken?.address;
        const spenderAddress = priorityToken?.delegationContract;

        if (!tokenAddress) {
          throw new Error('Token address not available');
        }

        if (!spenderAddress) {
          throw new Error('Delegation contract address not available');
        }

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

        Logger.log('Executing approval transaction with params:', {
          from: address,
          to: transaction.to,
          data: transaction.data,
        });

        const approveTx = {
          from: address,
          to: transaction.to,
          data: transaction.data,
        };

        const { result } = await TransactionController.addTransaction(
          approveTx,
          {
            networkClientId,
            origin: TransactionTypes.MMM,
            type: TransactionType.tokenMethodApprove,
            deviceConfirmedOn: WalletDevice.MM_MOBILE,
            requireApproval: true,
          },
        );

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
          Logger.log('Error message:', errorMessage);

          if (errorMessage.includes('User denied')) {
            return;
          } else if (errorMessage.includes('rejected')) {
            throw new Error('Transaction was rejected by user');
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
    [sdk, priorityToken, TransactionController],
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
      address: string,
    ) => {
      if (!sdk || !delegationToken || !transactionHash || !signature) {
        throw new Error('Missing required data for delegation completion');
      }

      setState((prev) => ({ ...prev, step: 'completion', isLoading: true }));

      try {
        const result = await sdk.completeEVMDelegation({
          address,
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
   * Submit delegation (Steps 2-5: Signature + Transaction + Completion)
   */
  const submitDelegation = useCallback(
    async (params: DelegationParams, _address: string) => {
      try {
        const scope =
          params.network === 'linea' ? 'eip155:0' : SolScope.Mainnet;
        const userAccount = selectAccountByScope(scope);

        Logger.log(
          'Starting delegation flow with params:',
          params,
          'address:',
          userAccount?.address,
        );

        // Step 1: Get delegation token
        Logger.log('Step 1: Getting delegation token...');
        const tokenData = await generateDelegationToken(
          params.network,
          userAccount?.address ?? '',
        );
        Logger.log('Delegation token obtained:', tokenData);

        // Step 2: Generate signature message
        Logger.log('Step 2: Generating signature message...');
        const signatureMessage = await generateSignatureMessage(
          userAccount?.address ?? '',
        );
        Logger.log('Signature message generated');

        // Step 3: Sign message (SIWE - no popup needed for internal Card feature)
        Logger.log('Step 3: Signing message...');
        const siweHex =
          '0x' + Buffer.from(signatureMessage, 'utf8').toString('hex');

        const signature = await KeyringController.signPersonalMessage({
          data: siweHex,
          from: userAccount?.address ?? '',
        });
        Logger.log('Message signed successfully');

        // Step 4: Execute approval transaction (with popup)
        Logger.log('Step 4: Executing approval transaction...');
        const transactionHash = await executeApprovalTransaction(
          params,
          tokenData.token,
          userAccount?.address ?? '',
        );
        Logger.log('Approval transaction completed, hash:', transactionHash);

        if (!transactionHash) {
          Logger.log('Transaction was cancelled by user');
          throw new Error('Transaction was cancelled');
        }

        // Step 5: Complete delegation with Baanx API
        Logger.log('Step 5: Completing delegation with Baanx API...');
        const result = await completeDelegation(
          params,
          tokenData.token,
          transactionHash,
          signature,
          signatureMessage,
          userAccount?.address ?? '',
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
      selectAccountByScope,
      generateDelegationToken,
      generateSignatureMessage,
      KeyringController,
      executeApprovalTransaction,
      completeDelegation,
    ],
  );

  return {
    ...state,
    // New simplified API
    submitDelegation,
  };
};
