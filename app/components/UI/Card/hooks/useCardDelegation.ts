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
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';

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
  stagingTokenAddress?: string | null; // Used in staging environment for actual on-chain token address
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
  const { trackEvent, createEventBuilder } = useMetrics();
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
    async (
      params: DelegationParams,
      address: string,
      signature: string,
      signatureMessage: string,
      token: string,
    ) => {
      if (!sdk || !priorityToken?.delegationContract) {
        throw new Error('Missing token configuration');
      }

      // Check if we have a token address (either staging or regular)
      if (!priorityToken?.stagingTokenAddress && !priorityToken?.address) {
        throw new Error('Missing token address');
      }

      const networkClientId = NetworkController.findNetworkClientIdByChainId(
        safeFormatChainIdToHex(priorityToken.caipChainId ?? '') as Hex,
      );

      // Use standard decimals for the currency (e.g., 6 for USDC) for user input
      // This ensures "5 USDC" means 5 actual USDC, not 5 * 10^18 wei
      const userFacingDecimals = priorityToken.decimals || 6;

      // Contract decimals might be different in staging (e.g., 18 for test USDC)
      const contractDecimals = priorityToken.decimals || userFacingDecimals;

      // Parse user input with standard decimals
      const amountInStandardUnits = ethers.utils.parseUnits(
        params.amount,
        userFacingDecimals,
      );

      // Convert to contract decimals if different
      let amountForContract: ethers.BigNumber;
      if (contractDecimals !== userFacingDecimals) {
        // Convert from user-facing decimals to contract decimals
        // e.g., 5 USDC (6 decimals) -> 5 * 10^18 (18 decimals for staging)
        const decimalsDiff = contractDecimals - userFacingDecimals;
        amountForContract = amountInStandardUnits.mul(
          ethers.BigNumber.from(10).pow(decimalsDiff),
        );
      } else {
        amountForContract = amountInStandardUnits;
      }

      const transactionData = sdk.encodeApproveTransaction(
        priorityToken.delegationContract,
        amountForContract.toString(),
      );

      // Use stagingTokenAddress if present (for staging environment),
      // otherwise use the regular address
      const tokenAddress =
        priorityToken.stagingTokenAddress || priorityToken.address;

      if (!tokenAddress) {
        throw new Error('Token address not found');
      }

      const { result } = await TransactionController.addTransaction(
        {
          from: address,
          to: tokenAddress,
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

      const actualTxHash = await result;

      // Wait 10 seconds for the transaction to be confirmed on the blockchain
      // This ensures the backend can verify the transaction when we complete delegation
      await new Promise((resolve) => setTimeout(resolve, 10000));

      await sdk.completeEVMDelegation({
        address,
        network: params.network,
        currency: params.currency.toLowerCase(),
        amount: params.amount,
        txHash: actualTxHash,
        sigHash: signature,
        sigMessage: signatureMessage,
        token,
      });
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
        trackEvent(
          createEventBuilder(MetaMetricsEvents.CARD_DELEGATION_PROCESS_STARTED)
            .addProperties({
              token_symbol: params.currency,
              token_chain_id: params.network,
              delegation_type: params.amount === '0' ? 'full' : 'limited',
              delegation_amount: isNaN(Number(params.amount))
                ? 0
                : Number(params.amount),
            })
            .build(),
        );
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
        await executeApprovalTransaction(
          params,
          address,
          signature,
          signatureMessage,
          token,
        );

        trackEvent(
          createEventBuilder(
            MetaMetricsEvents.CARD_DELEGATION_PROCESS_COMPLETED,
          )
            .addProperties({
              token_symbol: params.currency,
              token_chain_id: params.network,
              delegation_type: params.amount === '0' ? 'full' : 'limited',
              delegation_amount: isNaN(Number(params.amount))
                ? 0
                : Number(params.amount),
            })
            .build(),
        );
        setState({ isLoading: false, error: null });
      } catch (error) {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.CARD_DELEGATION_PROCESS_FAILED)
            .addProperties({
              token_symbol: params.currency,
              token_chain_id: params.network,
              delegation_type: params.amount === '0' ? 'full' : 'limited',
              delegation_amount: isNaN(Number(params.amount))
                ? 0
                : Number(params.amount),
            })
            .build(),
        );
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
      trackEvent,
      createEventBuilder,
    ],
  );

  return {
    ...state,
    submitDelegation,
  };
};
