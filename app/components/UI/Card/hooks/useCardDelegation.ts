import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { ethers } from 'ethers';
import {
  TransactionType,
  WalletDevice,
} from '@metamask/transaction-controller';
import { CaipChainId, SolScope } from '@metamask/keyring-api';
import Engine from '../../../../core/Engine';
import TransactionTypes from '../../../../core/TransactionTypes';
import Logger from '../../../../util/Logger';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { useCardSDK } from '../sdk';
import { CardNetwork } from '../types';
import { safeFormatChainIdToHex } from '../util/safeFormatChainIdToHex';
import { Hex } from '@metamask/utils';

interface DelegationState {
  isLoading: boolean;
  error: string | null;
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
  caipChainId?: CaipChainId | null;
  allowance?: string | null;
  allowanceState?: string | null;
  walletAddress?: string | null;
  name?: string | null;
  delegationContract?: string | null;
}

/**
 * Hook to handle the complete delegation flow for spending limit increases
 * Flow: Token -> Signature -> Approval Transaction -> Completion
 *
 * Note: Currently only supports EVM chains (Linea)
 */
export const useCardDelegation = (priorityToken?: PriorityToken | null) => {
  const { sdk } = useCardSDK();
  const { KeyringController, TransactionController, NetworkController } =
    Engine.context;
  const selectAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );

  const [state, setState] = useState<DelegationState>({
    isLoading: false,
    error: null,
  });

  /**
   * Generate SIWE signature message
   */
  const generateSignatureMessage = useCallback(
    (address: string, nonce: string): string => {
      const now = new Date();
      const expirationTime = new Date(now.getTime() + 30 * 60000); // 30 minutes
      const chainId = priorityToken?.caipChainId?.split(':')[1] ?? '59144';

      return `MetaMask Mobile wants you to sign in with your Ethereum account:\n${address}\n\nProve address ownership\n\nURI: metamask://\nVersion: 1\nChain ID: ${chainId}\nNonce: ${nonce}\nIssued At: ${now.toISOString()}\nExpiration Time: ${expirationTime.toISOString()}`;
    },
    [priorityToken?.caipChainId],
  );

  /**
   * Execute approval transaction
   */
  const executeApprovalTransaction = useCallback(
    async (params: DelegationParams, address: string) => {
      if (
        !sdk ||
        !priorityToken?.address ||
        !priorityToken?.delegationContract
      ) {
        throw new Error('Missing token configuration');
      }

      const networkClientId = NetworkController.findNetworkClientIdByChainId(
        safeFormatChainIdToHex(priorityToken.caipChainId ?? '') as Hex,
      );

      const tokenDecimals = priorityToken.decimals || 6;
      const amountInWei = ethers.utils.parseUnits(params.amount, tokenDecimals);

      const transactionData = sdk.encodeApproveTransaction(
        priorityToken.delegationContract,
        amountInWei.toString(),
      );

      const { result } = await TransactionController.addTransaction(
        {
          from: address,
          to: priorityToken.address,
          data: transactionData,
        },
        {
          networkClientId,
          origin: TransactionTypes.MMM,
          type: TransactionType.tokenMethodApprove,
          deviceConfirmedOn: WalletDevice.MM_MOBILE,
          requireApproval: true,
        },
      );

      try {
        const resultHash = await result;

        return resultHash;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        if (errorMessage.includes('User denied')) {
          return null;
        }

        if (errorMessage.includes('rejected')) {
          throw new Error('Transaction was rejected by user');
        }

        throw error;
      }
    },
    [sdk, priorityToken, TransactionController, NetworkController],
  );

  /**
   * Submit complete delegation flow
   */
  const submitDelegation = useCallback(
    async (params: DelegationParams) => {
      if (!sdk) {
        throw new Error('Card SDK not available');
      }

      setState({ isLoading: true, error: null });

      try {
        const userAccount = selectAccountByScope(
          params.network === 'solana' ? SolScope.Mainnet : 'eip155:0',
        );
        const address = userAccount?.address;

        if (!address) {
          throw new Error('No account found');
        }

        // Step 1: Generate delegation token
        const { token, nonce } = await sdk.generateDelegationToken(
          params.network,
          address,
        );

        // Step 2: Generate and sign SIWE message
        const signatureMessage = generateSignatureMessage(address, nonce);
        const siweHex =
          '0x' + Buffer.from(signatureMessage, 'utf8').toString('hex');
        const signature = await KeyringController.signPersonalMessage({
          data: siweHex,
          from: address,
        });

        // Step 3: Execute approval transaction
        const transactionHash = await executeApprovalTransaction(
          params,
          address,
        );

        if (!transactionHash) {
          throw new Error('Transaction was cancelled');
        }

        // Step 4: Complete delegation with API
        const result = await sdk.completeEVMDelegation({
          address,
          network: params.network,
          currency: params.currency.toLowerCase(),
          amount: params.amount,
          txHash: transactionHash,
          sigHash: signature,
          sigMessage: signatureMessage,
          token,
        });

        setState({ isLoading: false, error: null });
        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Delegation failed';
        setState({ isLoading: false, error: errorMessage });
        Logger.error(error as Error, 'useCardDelegation: Delegation failed');
        throw error;
      }
    },
    [
      sdk,
      selectAccountByScope,
      generateSignatureMessage,
      KeyringController,
      executeApprovalTransaction,
    ],
  );

  return {
    ...state,
    submitDelegation,
  };
};
