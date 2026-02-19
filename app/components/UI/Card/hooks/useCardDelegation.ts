import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  TransactionStatus,
  TransactionType,
  WalletDevice,
} from '@metamask/transaction-controller';
import {
  SolScope,
  TransactionStatus as KeyringTransactionStatus,
  type Transaction,
} from '@metamask/keyring-api';
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
import { handleSnapRequest } from '../../../../core/Snaps/utils';
import { SOLANA_WALLET_SNAP_ID } from '../../../../core/SnapKeyring/SolanaWalletSnap';
import { HandlerType } from '@metamask/snaps-utils';
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
  faucet?: boolean;
}

interface SignCardMessageResult {
  signature: string;
}

/**
 * Hook to handle the complete delegation flow for spending limit increases
 * Flow: Token -> Signature -> Approval Transaction -> Completion
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
    (
      address: string,
      nonce: string,
      network: CardNetwork,
      caipChainId?: string | null,
    ): string => {
      const now = new Date();
      const expirationTime = new Date(now.getTime() + 2 * 60 * 1000);
      const chainId =
        network === 'solana' ? '1' : (caipChainId?.split(':')[1] ?? '59144');
      const domain = AppConstants.MM_UNIVERSAL_LINK_HOST;
      const uri = `https://${domain}`;
      const capitalizedNetwork =
        network.charAt(0).toUpperCase() + network.slice(1);

      if (network === 'solana') {
        return `${domain} wants you to sign in with your ${capitalizedNetwork} account: ${address} Prove address ownership URI: ${uri} Version: 1 Chain ID: ${chainId} Nonce: ${nonce} Issued At: ${now.toISOString()} Expiration Time: ${expirationTime.toISOString()}`;
      }

      return `${domain} wants you to sign in with your Ethereum account:\n${address}\n\nProve address ownership\n\nURI: ${uri}\nVersion: 1\nChain ID: ${chainId}\nNonce: ${nonce}\nIssued At: ${now.toISOString()}\nExpiration Time: ${expirationTime.toISOString()}`;
    },
    [],
  );

  /**
   * Execute approval transaction
   */
  const executeEVMApprovalTransaction = useCallback(
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
   * Execute Solana SPL Token approval transaction
   * Uses the Solana Wallet Snap to sign and send the transaction
   *
   * Flow:
   * 1. Build SPL Token Approve instruction data
   * 2. Submit transaction through Solana Snap (signAndSendTransaction)
   * 3. Wait for transaction confirmation
   * 4. Complete delegation with backend API
   */
  const executeSolanaApprovalTransaction = useCallback(
    async (
      params: DelegationParams,
      address: string,
      accountId: string,
      signature: string,
      signatureMessage: string,
      delegationJWTToken: string,
    ) => {
      if (!sdk || !token?.delegationContract) {
        throw new Error('Missing token configuration');
      }
      if (!token?.stagingTokenAddress && !token?.address) {
        throw new Error('Missing token address');
      }
      const tokenMintAddress = token.stagingTokenAddress || token.address;

      if (!tokenMintAddress) {
        throw new Error('Token mint address not found');
      }

      try {
        const snapResponse = (await handleSnapRequest(
          Engine.controllerMessenger,
          {
            origin: 'metamask',
            snapId: SOLANA_WALLET_SNAP_ID,
            handler: HandlerType.OnClientRequest,
            request: {
              id: crypto.randomUUID(),
              jsonrpc: '2.0' as const,
              method: 'approveCardAmount',
              params: {
                accountId,
                amount: params.amount,
                mint: tokenMintAddress,
                delegate: token.delegationContract,
                scope: SolScope.Mainnet,
              },
            },
          },
        )) as SignCardMessageResult;

        if (!snapResponse || !('signature' in snapResponse)) {
          throw new Error('No transaction signature returned from Solana Snap');
        }
        const txHash = snapResponse.signature;

        // Wait for transaction confirmation via MultichainTransactionsController:stateChange
        // We use stateChange instead of transactionConfirmed because transactionConfirmed
        // only fires for confirmed transactions, not for failed ones
        await new Promise<void>((resolve, reject) => {
          const CONFIRMATION_TIMEOUT_MS = 10000; // 10 second timeout
          let isResolved = false;

          // Use ref object to avoid 'used before defined' lint error
          const refs: { timeoutId?: ReturnType<typeof setTimeout> } = {};

          // Define handler function first to avoid hoisting issues
          function handleStateChange(controllerState: {
            nonEvmTransactions: Record<
              string,
              Record<string, { transactions?: Transaction[] }>
            >;
          }) {
            if (isResolved) return;

            // Look for the transaction in all accounts and chains
            for (const accountTransactions of Object.values(
              controllerState.nonEvmTransactions,
            )) {
              for (const chainEntry of Object.values(accountTransactions)) {
                const transaction = chainEntry.transactions?.find(
                  (tx: Transaction) => tx.id === txHash,
                );
                if (transaction) {
                  if (
                    transaction.status === KeyringTransactionStatus.Confirmed
                  ) {
                    if (!isResolved) {
                      isResolved = true;
                      cleanup();
                      resolve();
                    }
                    return;
                  } else if (
                    transaction.status === KeyringTransactionStatus.Failed
                  ) {
                    if (!isResolved) {
                      Logger.log('Solana transaction failed', transaction);
                      isResolved = true;
                      cleanup();
                      reject(new Error('Solana transaction failed on-chain'));
                    }
                    return;
                  }
                }
              }
            }
          }

          function cleanup() {
            clearTimeout(refs.timeoutId);
            Engine.controllerMessenger.unsubscribe(
              'MultichainTransactionsController:stateChange',
              handleStateChange,
            );
          }

          Engine.controllerMessenger.subscribe(
            'MultichainTransactionsController:stateChange',
            handleStateChange,
          );

          refs.timeoutId = setTimeout(() => {
            if (!isResolved) {
              isResolved = true;
              cleanup();
              reject(new Error('Solana transaction confirmation timeout'));
            }
          }, CONFIRMATION_TIMEOUT_MS);
        });

        // Complete the delegation with the backend API after confirmation
        await sdk.completeSolanaDelegation({
          address,
          network: params.network,
          currency: params.currency.toLowerCase(),
          amount: params.amount,
          txHash,
          sigHash: signature,
          sigMessage: signatureMessage,
          token: delegationJWTToken,
        });

        return txHash;
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

        Logger.error(
          error as Error,
          'Failed to execute Solana approval transaction',
        );
        throw error;
      }
    },
    [sdk, token],
  );

  const signSolanaMessage = useCallback(
    async (accountId: string | undefined, message: string): Promise<string> => {
      try {
        if (!accountId) {
          throw new Error('Account ID is required');
        }

        const base64Message = Buffer.from(message, 'utf8').toString('base64');

        const result = await handleSnapRequest(Engine.controllerMessenger, {
          origin: 'metamask',
          snapId: SOLANA_WALLET_SNAP_ID,
          handler: HandlerType.OnClientRequest,
          request: {
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'signCardMessage',
            params: {
              accountId,
              message: base64Message,
            },
          },
        });

        const signCardMessageResult = result as SignCardMessageResult;

        if (!signCardMessageResult.signature) {
          throw new Error('No signature found');
        }

        return signCardMessageResult.signature;
      } catch (error) {
        Logger.error(error as Error, 'Error signing Solana message');
        throw error;
      }
    },
    [],
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
        faucet: params.faucet ?? false,
      };

      try {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.CARD_DELEGATION_PROCESS_STARTED)
            .addProperties(metricsProps)
            .build(),
        );
        const isSolana = params.network === 'solana';
        const userAccount = selectAccountByScope(
          isSolana ? SolScope.Mainnet : 'eip155:0',
        );
        const address = isSolana
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
        const signatureMessage = generateSignatureMessage(
          address,
          nonce,
          params.network,
          token?.caipChainId,
        );
        const signature = isSolana
          ? await signSolanaMessage(userAccount?.id, signatureMessage)
          : await KeyringController.signPersonalMessage({
              data:
                '0x' + Buffer.from(signatureMessage, 'utf8').toString('hex'),
              from: address,
            });

        // Step 3: Execute approval transaction
        if (isSolana) {
          await executeSolanaApprovalTransaction(
            params,
            address,
            userAccount?.id ?? '',
            signature,
            signatureMessage,
            delegationJWTToken,
          );
        } else {
          await executeEVMApprovalTransaction(
            params,
            address,
            signature,
            signatureMessage,
            delegationJWTToken,
          );
        }

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
      executeEVMApprovalTransaction,
      executeSolanaApprovalTransaction,
      signSolanaMessage,
      token?.caipChainId,
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
