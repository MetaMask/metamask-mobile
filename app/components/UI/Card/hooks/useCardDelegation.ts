import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  TransactionType,
  WalletDevice,
} from '@metamask/transaction-controller';
import { SolScope } from '@metamask/keyring-api';
import Engine from '../../../../core/Engine';
import TransactionTypes from '../../../../core/TransactionTypes';
import Logger from '../../../../util/Logger';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { useCardSDK } from '../sdk';
import { CardNetwork, CardTokenAllowance } from '../types';
import { safeFormatChainIdToHex } from '../util/safeFormatChainIdToHex';
import { Hex } from '@metamask/utils';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import { ARBITRARY_ALLOWANCE } from '../constants';
import { toTokenMinimalUnit } from '../../../../util/number';

interface DelegationState {
  isLoading: boolean;
  error: string | null;
}

interface DelegationParams {
  amount: string;
  currency: string;
  network: CardNetwork;
}

/**
 * Hook to handle the complete delegation flow for spending limit increases
 * Flow: Token -> Signature -> Approval Transaction -> Completion
 *
 * Note: Currently only supports EVM chains (Linea)
 */
export const useCardDelegation = (token?: CardTokenAllowance | null) => {
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
      const chainId = token?.caipChainId?.split(':')[1] ?? '59144';

      return `MetaMask Mobile wants you to sign in with your Ethereum account:\n${address}\n\nProve address ownership\n\nURI: metamask://\nVersion: 1\nChain ID: ${chainId}\nNonce: ${nonce}\nIssued At: ${now.toISOString()}\nExpiration Time: ${expirationTime.toISOString()}`;
    },
    [token],
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
      delegationJWTToken: string,
    ) => {
      if (!sdk || !token?.delegationContract) {
        throw new Error('Missing token configuration');
      }

      // Check if we have a token address (either staging or regular)
      if (!token?.stagingTokenAddress && !token?.address) {
        throw new Error('Missing token address');
      }

      const networkClientId = NetworkController.findNetworkClientIdByChainId(
        safeFormatChainIdToHex(token.caipChainId ?? '') as Hex,
      );

      // Convert amount to minimal units based on token decimals
      // params.amount is the human-readable token amount (e.g., "2199023255551")
      // We need to convert it to minimal units (e.g., for 18 decimals: amount * 10^18)
      const amountInMinimalUnits = toTokenMinimalUnit(
        params.amount,
        token.decimals ?? 18,
      ).toString();

      const transactionData = sdk.encodeApproveTransaction(
        token.delegationContract,
        amountInMinimalUnits,
      );

      // Use stagingTokenAddress if present (for staging environment),
      // otherwise use the regular address
      const tokenAddress = token.stagingTokenAddress || token.address;

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
        token: delegationJWTToken,
      });
    },
    [sdk, token, TransactionController, NetworkController],
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

      const metricsProps = {
        token_symbol: params.currency,
        token_chain_id: params.network,
        delegation_type:
          parseFloat(params.amount) >= ARBITRARY_ALLOWANCE ? 'full' : 'limited',
        delegation_amount: isNaN(Number(params.amount))
          ? 0
          : Number(params.amount),
      };

      try {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.CARD_DELEGATION_PROCESS_STARTED)
            .addProperties(metricsProps)
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
        const { token: delegationJWTToken, nonce } =
          await sdk.generateDelegationToken(params.network, address);

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
          delegationJWTToken,
        );

        trackEvent(
          createEventBuilder(
            MetaMetricsEvents.CARD_DELEGATION_PROCESS_COMPLETED,
          )
            .addProperties(metricsProps)
            .build(),
        );
        setState({ isLoading: false, error: null });
      } catch (error) {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.CARD_DELEGATION_PROCESS_FAILED)
            .addProperties(metricsProps)
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
