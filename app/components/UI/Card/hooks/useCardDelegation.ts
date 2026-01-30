import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  TransactionStatus,
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
import AppConstants from '../../../../core/AppConstants';
import { safeToChecksumAddress } from '../../../../util/address';
import { useNeedsGasFaucet } from './useNeedsGasFaucet';

/**
 * Custom error class for user-initiated cancellations
 */
export class UserCancelledError extends Error {
  constructor(message = 'User cancelled the transaction') {
    super(message);
    this.name = 'UserCancelledError';
  }
}

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
 * Note: Currently only supports EVM chains
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

  const {
    needsFaucet,
    isLoading: isFaucetCheckLoading,
    refetch: refetchFaucetCheck,
  } = useNeedsGasFaucet(token);

  /**
   * Generate SIWE signature message
   */
  const generateSignatureMessage = useCallback(
    (address: string, nonce: string): string => {
      const now = new Date();
      // Expiration time needs to be 2 minutes
      const expirationTime = new Date(now.getTime() + 2 * 60 * 1000);
      const chainId = token?.caipChainId?.split(':')[1] ?? '59144';
      const domain = AppConstants.MM_UNIVERSAL_LINK_HOST;
      const uri = `https://${domain}`;

      return `${domain} wants you to sign in with your Ethereum account:\n${address}\n\nProve address ownership\n\nURI: ${uri}\nVersion: 1\nChain ID: ${chainId}\nNonce: ${nonce}\nIssued At: ${now.toISOString()}\nExpiration Time: ${expirationTime.toISOString()}`;
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

      try {
        const { result, transactionMeta: trxMeta } =
          await TransactionController.addTransaction(
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
        const { id: transactionId } = trxMeta;

        // Wait for transaction confirmation and completion
        await new Promise<void>((resolve, reject) => {
          Engine.controllerMessenger.subscribeOnceIf(
            'TransactionController:transactionConfirmed',
            async (transactionMeta) => {
              if (transactionMeta.status === TransactionStatus.confirmed) {
                try {
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
                  resolve();
                } catch (error) {
                  Logger.error(
                    error as Error,
                    'Failed to complete EVM delegation',
                  );
                  reject(error);
                }
              } else if (transactionMeta.status === TransactionStatus.failed) {
                Logger.error(
                  new Error(
                    transactionMeta.error?.message ?? 'Transaction failed',
                  ),
                  'Transaction failed',
                );
                reject(
                  new Error(
                    transactionMeta.error?.message ?? 'Transaction failed',
                  ),
                );
              }
            },
            (transactionMeta) => transactionMeta.id === transactionId,
          );
        });

        return actualTxHash;
      } catch (error) {
        // Check if user denied/cancelled the transaction
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const userCancelled =
          errorMessage.includes('User denied') ||
          errorMessage.includes('User rejected') ||
          errorMessage.includes('User cancelled') ||
          errorMessage.includes('User canceled');

        if (userCancelled) {
          throw new UserCancelledError(errorMessage);
        }
        throw error;
      }
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
        const address =
          params.network === 'solana'
            ? userAccount?.address
            : safeToChecksumAddress(userAccount?.address);

        if (!address) {
          throw new Error('No account found');
        }

        // Step 1: Generate delegation token (pass faucet flag if user needs gas)
        const { token: delegationJWTToken, nonce } =
          await sdk.generateDelegationToken(
            params.network,
            address,
            needsFaucet,
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
        if (error instanceof UserCancelledError) {
          trackEvent(
            createEventBuilder(
              MetaMetricsEvents.CARD_DELEGATION_PROCESS_USER_CANCELED,
            )
              .addProperties(metricsProps)
              .build(),
          );
        } else {
          trackEvent(
            createEventBuilder(MetaMetricsEvents.CARD_DELEGATION_PROCESS_FAILED)
              .addProperties(metricsProps)
              .build(),
          );
          Logger.error(error as Error, 'useCardDelegation: Delegation failed');
        }
        const errorMessage =
          error instanceof Error ? error.message : 'Delegation failed';
        setState({ isLoading: false, error: errorMessage });
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
      needsFaucet,
    ],
  );

  return {
    ...state,
    submitDelegation,
    // Faucet check state
    needsFaucet,
    isFaucetCheckLoading,
    refetchFaucetCheck,
  };
};
