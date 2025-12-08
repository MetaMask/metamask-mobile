import { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  TransactionStatus,
  TransactionType,
  WalletDevice,
} from '@metamask/transaction-controller';
import { SolMethod, SolScope } from '@metamask/keyring-api';
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
import {
  SolanaWalletSnapSender,
  SOLANA_WALLET_SNAP_ID,
} from '../../../../core/SnapKeyring/SolanaWalletSnap';
import { KeyringClient } from '@metamask/keyring-snap-client';
import { handleSnapRequest } from '../../../../core/Snaps/utils';
import { HandlerType } from '@metamask/snaps-utils';

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
 * Supports both EVM chains (Linea, Base) and Solana:
 * - EVM: Uses TransactionController.addTransaction with ERC20 approve
 * - Solana: Uses Solana Wallet Snap with SPL Token approve instruction
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

  const solanaKeyringClient = useMemo(
    () => new KeyringClient(new SolanaWalletSnapSender()),
    [],
  );

  /**
   * Generate SIWE signature message
   */
  const generateEVMSignatureMessage = useCallback(
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
   * Generate SIWE signature message
   */
  const generateSolanaSignatureMessage = useCallback(
    (address: string, nonce: string): string => {
      const now = new Date();
      // Expiration time needs to be 2 minutes
      const expirationTime = new Date(now.getTime() + 2 * 60 * 1000);
      const chainId = 1;
      const domain = AppConstants.MM_UNIVERSAL_LINK_HOST;
      const uri = `https://${domain}`;

      return `${domain} wants you to sign in with your Solana account:\n${address}\n\nProve address ownership\n\nURI: ${uri}\nVersion: 1\nChain ID: ${chainId}\nNonce: ${nonce}\nIssued At: ${now.toISOString()}\nExpiration Time: ${expirationTime.toISOString()}`;
    },
    [],
  );

  /**
   * Execute EVM approval transaction
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

      // Check if we have a token address (either staging or regular)
      if (!token?.stagingTokenAddress && !token?.address) {
        throw new Error('Missing token address');
      }

      // Use stagingTokenAddress if present (for staging environment),
      // otherwise use the regular address (this is the SPL Token mint address)
      const tokenMintAddress = token.stagingTokenAddress || token.address;

      if (!tokenMintAddress) {
        throw new Error('Token mint address not found');
      }

      // Convert amount to minimal units based on token decimals
      // Solana USDC/USDT typically uses 6 decimals
      const amountInMinimalUnits = toTokenMinimalUnit(
        params.amount,
        token.decimals ?? 6,
      ).toString();

      try {
        // Build the SPL Token Approve transaction via backend API
        // The backend constructs a properly serialized Solana transaction
        // Returns a base64-encoded serialized Solana transaction
        const transactionData = await sdk.buildSolanaApproveTransaction({
          tokenMintAddress,
          delegateAddress: '3UsCVSxLJmWXBKFyVSsCJTG133dd1sMuxo1Uee5wqqUn',
          ownerAddress: address,
          amount: amountInMinimalUnits,
        });

        // Submit the transaction through the Solana Snap using onClientRequest handler
        // This matches the approach used by the Bridge controller for non-EVM transactions
        const snapResponse = await handleSnapRequest(
          Engine.controllerMessenger,
          {
            origin: 'metamask',
            snapId: SOLANA_WALLET_SNAP_ID,
            handler: HandlerType.OnClientRequest,
            request: {
              id: crypto.randomUUID(),
              jsonrpc: '2.0' as const,
              method: SolMethod.SignAndSendTransaction,
              params: {
                transaction: transactionData,
                scope: SolScope.Mainnet,
                accountId,
              },
            },
          },
        );

        // Extract transaction signature (hash) from response
        // The snap can return the signature in different formats:
        // - { transactionId: "..." } - from signAndSendTransaction via onClientRequest
        // - { signature: "..." } - alternative format
        // - { result: { signature: "..." } } - from keyring request
        // - string directly
        let txHash: string | undefined;
        if (typeof snapResponse === 'string') {
          txHash = snapResponse;
        } else if (snapResponse && typeof snapResponse === 'object') {
          // Check for transactionId (returned by signAndSendTransaction)
          if ('transactionId' in snapResponse) {
            txHash = (snapResponse as { transactionId: string }).transactionId;
          }
          // Check for signature
          else if ('signature' in snapResponse) {
            txHash = (snapResponse as { signature: string }).signature;
          }
          // Check for result.signature (keyring response format)
          else if ('result' in snapResponse) {
            const result = (snapResponse as { result: Record<string, string> })
              .result;
            txHash = result?.signature || result?.transactionId;
          }
        }

        if (!txHash) {
          throw new Error('No transaction signature returned from Solana Snap');
        }

        // Complete the delegation with the backend API
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
    async (
      accountId: string | undefined,
      accountAddress: string,
      message: string,
    ): Promise<string> => {
      try {
        if (!accountId) {
          throw new Error('Account ID is required');
        }

        const base64Message = Buffer.from(message, 'utf8').toString('base64');

        const keyringResponse = await solanaKeyringClient.submitRequest({
          id: crypto.randomUUID(),
          scope: SolScope.Mainnet, // solana mainnet
          account: accountId, // account UUID, not address
          origin: 'metamask',
          request: {
            method: 'signMessage',
            params: {
              scope: SolScope.Mainnet,
              account: {
                address: accountAddress,
              },
              message: base64Message,
            },
          },
        });

        // Perform a type check to ensure the result is the expected type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!(keyringResponse as any).result?.signature) {
          throw new Error('No signature found');
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (keyringResponse as any).result?.signature as string;
      } catch (error) {
        Logger.log('Error signing Solana message:', error);
        throw error;
      }
    },
    [solanaKeyringClient],
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

        // Step 1: Generate delegation token
        const { token: delegationJWTToken, nonce } =
          await sdk.generateDelegationToken(params.network, address);
        // Step 2: Generate and sign SIWE message
        const signatureMessage = isSolana
          ? generateSolanaSignatureMessage(address, nonce)
          : generateEVMSignatureMessage(address, nonce);
        const signature = isSolana
          ? await signSolanaMessage(userAccount?.id, address, signatureMessage)
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
            signature as string,
            signatureMessage,
            delegationJWTToken,
          );
        } else {
          await executeEVMApprovalTransaction(
            params,
            address,
            signature as string,
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
      generateEVMSignatureMessage,
      generateSolanaSignatureMessage,
      KeyringController,
      executeEVMApprovalTransaction,
      executeSolanaApprovalTransaction,
      signSolanaMessage,
      trackEvent,
      createEventBuilder,
    ],
  );

  return {
    ...state,
    submitDelegation,
  };
};
