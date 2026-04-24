import { Interface } from '@ethersproject/abi';
import { abiERC20 } from '@metamask/metamask-eth-abis';
import {
  GasFeeToken,
  IsAtomicBatchSupportedRequest,
  IsAtomicBatchSupportedResult,
  PublishHook,
  PublishHookResult,
  TransactionMeta,
} from '@metamask/transaction-controller';
import { Hex, createProjectLogger } from '@metamask/utils';
import { ExecutionStruct } from '../../../core/Delegation';
import { TransactionControllerInitMessenger } from '../../../core/Engine/messengers/transaction-controller-messenger';
import {
  RelayStatus,
  RelaySubmitRequest,
  submitRelayTransaction,
  waitForRelayResult,
} from '../transaction-relay';
import { NetworkClientId } from '@metamask/network-controller';
import { toHex } from '@metamask/controller-utils';
import { isE2ETest } from '../util';
import {
  getClientForTransactionMetadata,
  sanitizeOrigin,
} from '../../../constants/smartTransactions';
import {
  convertTransactionToRedeemDelegations,
  SignMessenger,
} from '../delegation';

const SEPOLIA_CHAIN_ID = '0xaa36a7';
const POLLING_INTERVAL_MS = 1000;

const EMPTY_RESULT = {
  transactionHash: undefined,
};

const log = createProjectLogger('delegation-7702-publish-hook');

export class Delegation7702PublishHook {
  #isAtomicBatchSupported: (
    request: IsAtomicBatchSupportedRequest,
  ) => Promise<IsAtomicBatchSupportedResult>;

  #messenger: TransactionControllerInitMessenger;

  #getNextNonce: (
    address: string,
    networkClientId: NetworkClientId,
  ) => Promise<Hex>;

  constructor({
    isAtomicBatchSupported,
    messenger,
    getNextNonce,
  }: {
    isAtomicBatchSupported: (
      request: IsAtomicBatchSupportedRequest,
    ) => Promise<IsAtomicBatchSupportedResult>;
    messenger: TransactionControllerInitMessenger;
    getNextNonce: (
      address: string,
      networkClientId: NetworkClientId,
    ) => Promise<Hex>;
  }) {
    this.#isAtomicBatchSupported = isAtomicBatchSupported;
    this.#messenger = messenger;
    this.#getNextNonce = getNextNonce;
  }

  getHook(): PublishHook {
    return this.#hookWrapper.bind(this);
  }

  async #hookWrapper(
    transactionMeta: TransactionMeta,
    _signedTx: string,
  ): Promise<PublishHookResult> {
    try {
      return await this.#hook(transactionMeta, _signedTx);
    } catch (error) {
      log('Error', error);
      throw error;
    }
  }

  async #hook(
    transactionMeta: TransactionMeta,
    _signedTx: string,
  ): Promise<PublishHookResult> {
    const { chainId, gasFeeTokens, selectedGasFeeToken, txParams } =
      transactionMeta;

    const { from } = txParams;

    const atomicBatchSupport = await this.#isAtomicBatchSupported({
      address: from as Hex,
      chainIds: [chainId],
    });

    const atomicBatchChainSupport = atomicBatchSupport.find(
      (result) => result.chainId.toLowerCase() === chainId.toLowerCase(),
    );

    const isChainSupported =
      atomicBatchChainSupport &&
      (!atomicBatchChainSupport.delegationAddress ||
        atomicBatchChainSupport.isSupported);

    if (!isChainSupported) {
      log('Skipping as EIP-7702 is not supported', { from, chainId });
      return EMPTY_RESULT;
    }

    const { delegationAddress, upgradeContractAddress } =
      atomicBatchChainSupport;

    const isGaslessBridge = transactionMeta.isGasFeeIncluded;

    const isSponsored = Boolean(transactionMeta.isGasFeeSponsored);

    if (
      (!selectedGasFeeToken || !gasFeeTokens?.length) &&
      !isGaslessBridge &&
      !isSponsored
    ) {
      log('Skipping as no selected gas fee token');
      return EMPTY_RESULT;
    }

    const gasFeeToken =
      isGaslessBridge || isSponsored
        ? undefined
        : gasFeeTokens?.find(
            (token) =>
              token.tokenAddress.toLowerCase() ===
              selectedGasFeeToken?.toLowerCase(),
          );

    if (!gasFeeToken && !isGaslessBridge && !isSponsored) {
      throw new Error('Selected gas fee token not found');
    }

    const includeTransfer =
      !isGaslessBridge && !transactionMeta.isGasFeeSponsored;

    if (includeTransfer && (!gasFeeToken || gasFeeToken === undefined)) {
      throw new Error('Gas fee token not found');
    }

    // Remove nonce BEFORE delegation conversion
    const { nonce: _nonce, ...txParamsWithoutNonce } = transactionMeta.txParams;
    const finalTransactionMeta: TransactionMeta = {
      ...transactionMeta,
      txParams: txParamsWithoutNonce,
    };

    if (transactionMeta.txParams.nonce !== undefined) {
      const currentTxMeta = this.#messenger
        .call('TransactionController:getState')
        .transactions.find((tx) => tx.id === transactionMeta.id);

      if (currentTxMeta) {
        this.#messenger.call(
          'TransactionController:updateTransaction',
          {
            ...currentTxMeta,
            txParams: {
              ...currentTxMeta.txParams,
              nonce: undefined,
            },
          },
          'Delegation7702PublishHook - Remove nonce from transaction before relay',
        );
      }
    }

    const additionalExecutions =
      includeTransfer && gasFeeToken
        ? [this.#buildTransferExecution(gasFeeToken)]
        : [];

    const effectiveChainId = isE2ETest(chainId) ? SEPOLIA_CHAIN_ID : chainId;
    const transactionForDelegation: TransactionMeta = {
      ...finalTransactionMeta,
      chainId: effectiveChainId,
    };

    const getNextNonce = async (
      address: string,
      networkClientId: string,
    ): Promise<{ nextNonce: number; releaseLock: () => void }> => {
      const nonceHex = await this.#getNextNonce(
        address,
        networkClientId as NetworkClientId,
      );
      return {
        nextNonce: parseInt(nonceHex, 16),
        releaseLock: () => undefined,
      };
    };

    let authorizationConfig;
    if (!delegationAddress) {
      if (!upgradeContractAddress) {
        throw new Error('Upgrade contract address not found');
      }
      authorizationConfig = {
        upgradeContractAddress: upgradeContractAddress as Hex,
        getNextNonce,
        isAtomicBatchSupported: this.#isAtomicBatchSupported,
      };
    }

    const { data, to, authorizationList } =
      await convertTransactionToRedeemDelegations({
        transaction: transactionForDelegation,
        messenger: this.#messenger as unknown as SignMessenger,
        additionalExecutions,
        authorization: authorizationConfig,
      });

    const relayRequest: RelaySubmitRequest = {
      chainId,
      data,
      to,
      metadata: {
        txType: transactionMeta.type,
        client: getClientForTransactionMetadata(),
        origin: sanitizeOrigin(transactionMeta.origin),
      },
    };

    if (authorizationList) {
      relayRequest.authorizationList = authorizationList;
    }

    log('Relay request', relayRequest);

    const { uuid } = await submitRelayTransaction(relayRequest);

    const { transactionHash, status } = await waitForRelayResult({
      chainId,
      uuid,
      interval: POLLING_INTERVAL_MS,
    });

    if (status !== RelayStatus.Success) {
      throw new Error(`Transaction relay error - ${status}`);
    }

    // Mark 7702 relay transaction as intent complete so PendingTransactionTracker
    // skips dropped checks
    log('Setting isIntentComplete after relay success', transactionMeta.id);
    const finalTxMeta = this.#messenger
      .call('TransactionController:getState')
      .transactions.find((tx) => tx.id === transactionMeta.id);

    if (finalTxMeta) {
      this.#messenger.call(
        'TransactionController:updateTransaction',
        {
          ...finalTxMeta,
          isIntentComplete: true,
        },
        'Delegation7702PublishHook - Set isIntentComplete after relay confirmed',
      );
    }

    return {
      transactionHash,
    };
  }

  #buildTransferExecution(gasFeeToken: GasFeeToken): ExecutionStruct {
    return {
      target: gasFeeToken.tokenAddress,
      value: BigInt('0x0'),
      callData: new Interface(abiERC20).encodeFunctionData('transfer', [
        gasFeeToken.recipient,
        gasFeeToken.amount,
      ]) as Hex,
    };
  }
}
