import { Interface } from '@ethersproject/abi';
import { abiERC20 } from '@metamask/metamask-eth-abis';
import {
  Authorization,
  AuthorizationList,
  GasFeeToken,
  IsAtomicBatchSupportedRequest,
  IsAtomicBatchSupportedResult,
  PublishHook,
  PublishHookResult,
  TransactionMeta,
  TransactionType,
  decodeAuthorizationSignature,
} from '@metamask/transaction-controller';
import { Hex, createProjectLogger } from '@metamask/utils';
import { recoverAuthorizationAddress } from 'viem/utils';
import {
  ANY_BENEFICIARY,
  BATCH_DEFAULT_MODE,
  DeleGatorEnvironment,
  ExecutionMode,
  ExecutionStruct,
  SINGLE_DEFAULT_MODE,
  UnsignedDelegation,
  createDelegation,
  getDeleGatorEnvironment,
} from '../../../core/Delegation';
import { getDelegationCaveats, normalizeCallData } from '../caveats';
import {
  Delegation,
  encodeRedeemDelegations,
} from '../../../core/Delegation/delegation';
import { TransactionControllerInitMessenger } from '../../../core/Engine/wallet-init/messengers/transaction-controller-messenger';
import {
  RelaySubmitRequest,
  submitRelayTransaction,
  waitForRelaySuccess,
} from '../transaction-relay';
import { getSentinelSigners } from '../sentinel-api';
import { NetworkClientId } from '@metamask/network-controller';
import { isE2ETest } from '../util';
import {
  getClientForTransactionMetadata,
  getClientVersionForTransactionMetadata,
  sanitizeOrigin,
} from '../../../constants/smartTransactions';
import { prefixError } from '../error-prefix';

// Test chain ID (Sepolia) used in E2E tests to match the delegation package's test contract configuration
const SEPOLIA_CHAIN_ID = '0xaa36a7';
const POLLING_INTERVAL_MS = 1000; // 1 Second
const ERROR_PREFIX = 'Gas Station 7702: ';
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
      throw prefixError(error, ERROR_PREFIX);
    }
  }

  async #hook(
    transactionMeta: TransactionMeta,
    _signedTx: string,
  ): Promise<PublishHookResult> {
    if (transactionMeta.type === TransactionType.revokeDelegation) {
      log('Skipping: revokeDelegation must publish as top-level setCode');
      return EMPTY_RESULT;
    }

    const { chainId, gasFeeTokens, selectedGasFeeToken, txParams } =
      transactionMeta;

    const { from } = txParams;
    const isGaslessBridge = Boolean(transactionMeta.isGasFeeIncluded);
    const isSponsored = Boolean(transactionMeta.isGasFeeSponsored);

    const atomicBatchSupport = await this.#isAtomicBatchSupported({
      address: from as Hex,
      chainIds: [chainId],
    });

    const atomicBatchChainSupport = atomicBatchSupport.find(
      (result) => result.chainId.toLowerCase() === chainId.toLowerCase(),
    );

    if (!atomicBatchChainSupport) {
      log('Skipping as EIP-7702 is not supported', { from, chainId });

      if (isGaslessBridge || isSponsored) {
        throw new Error(
          'Chain must support EIP-7702 for sponsored or gas included transaction',
        );
      }

      return EMPTY_RESULT;
    }

    const { delegationAddress, upgradeContractAddress } =
      atomicBatchChainSupport;
    const requiresUpgrade = !atomicBatchChainSupport.isSupported;

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

    const redeemers = await getSentinelSigners(chainId);

    if (!redeemers.length) {
      // Fail closed rather than sign a delegation any address could redeem.
      throw new Error(`No relay signers found for chain ${chainId}`);
    }

    const delegationEnvironment = getDeleGatorEnvironment(
      parseInt(isE2ETest(chainId) ? SEPOLIA_CHAIN_ID : chainId, 16),
    );
    const delegationManagerAddress = delegationEnvironment.DelegationManager;
    const includeTransfer = !isGaslessBridge && !isSponsored;

    if (includeTransfer && (!gasFeeToken || gasFeeToken === undefined)) {
      throw new Error('Gas fee token not found');
    }

    const executions = this.#buildExecutions(
      transactionMeta,
      gasFeeToken,
      includeTransfer,
    );

    const delegations = await this.#buildDelegation(
      delegationEnvironment,
      transactionMeta,
      executions[0],
      redeemers,
    );

    const modes: ExecutionMode[] = [
      includeTransfer ? BATCH_DEFAULT_MODE : SINGLE_DEFAULT_MODE,
    ];

    const transactionData = encodeRedeemDelegations({
      delegations,
      modes,
      executions,
    });

    const relayRequest: RelaySubmitRequest = {
      chainId,
      data: transactionData,
      to: delegationManagerAddress,
      metadata: {
        txType: transactionMeta.type,
        client: getClientForTransactionMetadata(),
        clientVersion: getClientVersionForTransactionMetadata(),
        origin: sanitizeOrigin(transactionMeta.origin),
      },
    };

    const authorizationList = await this.#resolveAuthorizationList(
      transactionMeta,
      upgradeContractAddress,
      delegationAddress,
      requiresUpgrade,
    );

    if (authorizationList?.length) {
      relayRequest.authorizationList = authorizationList;
    }

    log('Relay request', relayRequest);

    const initialTxMeta = this.#messenger
      .call('TransactionController:getState')
      .transactions.find((tx) => tx.id === transactionMeta.id);

    if (initialTxMeta) {
      this.#messenger.call(
        'TransactionController:updateTransaction',
        {
          ...initialTxMeta,
          txParams: {
            ...initialTxMeta.txParams,
            nonce: undefined,
          },
        },
        'Delegation7702PublishHook - Remove nonce from transaction before relay',
      );
    }

    const { uuid } = await submitRelayTransaction(relayRequest);

    const { transactionHash } = await waitForRelaySuccess({
      chainId,
      uuid,
      interval: POLLING_INTERVAL_MS,
    });

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

  async #buildDelegation(
    delegationEnvironment: DeleGatorEnvironment,
    transactionMeta: TransactionMeta,
    executions: ExecutionStruct[],
    redeemers: Hex[],
  ): Promise<Delegation[][]> {
    const { chainId } = transactionMeta;
    const unsignedDelegation = this.#buildUnsignedDelegation(
      delegationEnvironment,
      transactionMeta,
      executions,
      redeemers,
    );

    log('Signing delegation');

    const delegationSignature = (await this.#messenger.call(
      'DelegationController:signDelegation',
      {
        chainId: isE2ETest(chainId) ? SEPOLIA_CHAIN_ID : chainId,
        delegation: unsignedDelegation,
      },
    )) as Hex;

    log('Delegation signature', delegationSignature);

    const delegations: Delegation[][] = [
      [
        {
          ...unsignedDelegation,

          signature: delegationSignature,
        },
      ],
    ];

    return delegations;
  }

  #buildExecutions(
    transactionMeta: TransactionMeta,
    gasFeeToken: GasFeeToken | undefined,
    includeTransfer: boolean,
  ): ExecutionStruct[][] {
    const { txParams } = transactionMeta;
    const { data, to, value } = txParams;
    const normalizedData = normalizeCallData(data);
    const userExecution: ExecutionStruct = {
      target: to as Hex,
      value: BigInt((value as Hex) ?? '0x0'),
      callData: normalizedData,
    };

    if (!includeTransfer) {
      return [[userExecution]];
    }

    if (!gasFeeToken) {
      throw new Error('Selected gas fee token not found');
    }

    const transferExecution: ExecutionStruct = {
      target: gasFeeToken.tokenAddress,
      value: BigInt('0x0'),
      callData: this.#buildTokenTransferData(
        gasFeeToken.recipient,
        gasFeeToken.amount,
      ),
    };
    return [[userExecution, transferExecution]];
  }

  #buildUnsignedDelegation(
    environment: DeleGatorEnvironment,
    transactionMeta: TransactionMeta,
    executions: ExecutionStruct[],
    redeemers: Hex[],
  ): UnsignedDelegation {
    const caveats = getDelegationCaveats({
      environment,
      executions,
      messenger: this.#messenger,
      redeemers,
      transactionMeta,
    });

    log('Caveats', caveats);

    const delegation = createDelegation({
      from: transactionMeta.txParams.from as Hex,
      to: ANY_BENEFICIARY,
      caveats,
    });

    log('Delegation', delegation);

    return delegation;
  }

  /**
   * Build the authorization list for the Sentinel / Gas Station request.
   *
   * Always retain pre-signed authorizations whose recovered signer is not the
   * transaction `from` (e.g. Money Account upgrades bundled with an EOA-paid
   * batch). When `from` itself is not upgraded, or is upgraded to a
   * non-MetaMask contract (`requiresUpgrade`), also include a freshly signed
   * EOA authorization — without replacing the foreign entries.
   */
  async #resolveAuthorizationList(
    transactionMeta: TransactionMeta,
    upgradeContractAddress: Hex | undefined,
    delegationAddress: Hex | undefined,
    requiresUpgrade: boolean,
  ): Promise<AuthorizationList | undefined> {
    const { from, authorizationList: existingAuthorizationList } =
      transactionMeta.txParams;

    const foreignAuthorizations = await this.#getForeignAuthorizations(
      existingAuthorizationList,
      from as Hex,
    );

    if (!delegationAddress || requiresUpgrade) {
      log('Including authorization as not upgraded or overwriting delegation', {
        from,
        delegationAddress,
        requiresUpgrade,
      });

      const fromAuthorization = await this.#buildAuthorizationList(
        transactionMeta,
        upgradeContractAddress,
      );

      return [...foreignAuthorizations, ...fromAuthorization];
    }

    return foreignAuthorizations.length ? foreignAuthorizations : undefined;
  }

  /**
   * Filter `txParams.authorizationList` to fully signed entries whose recovered
   * EIP-7702 signer is not the batch payer (`from`).
   */
  async #getForeignAuthorizations(
    authorizationList: AuthorizationList | undefined,
    from: Hex,
  ): Promise<AuthorizationList> {
    if (!authorizationList?.length) {
      return [];
    }

    const foreignAuthorizations: AuthorizationList = [];

    for (const authorization of authorizationList) {
      if (!this.#isAuthorizationSigned(authorization)) {
        continue;
      }

      try {
        const signer = await recoverAuthorizationAddress({
          authorization: {
            address: authorization.address,
            chainId: Number(authorization.chainId),
            nonce: Number(authorization.nonce),
            r: authorization.r,
            s: authorization.s,
            yParity: Number(authorization.yParity),
          },
        });

        if (signer.toLowerCase() !== from.toLowerCase()) {
          foreignAuthorizations.push(authorization);
        }
      } catch (error) {
        log('Failed to recover authorization signer', { authorization, error });
      }
    }

    log('Foreign authorizations', foreignAuthorizations);

    return foreignAuthorizations;
  }

  #isAuthorizationSigned(
    authorization: Authorization,
  ): authorization is Required<Authorization> {
    return Boolean(
      authorization.chainId &&
        authorization.nonce !== undefined &&
        authorization.r &&
        authorization.s &&
        authorization.yParity !== undefined,
    );
  }

  async #buildAuthorizationList(
    transactionMeta: TransactionMeta,
    upgradeContractAddress?: Hex,
  ): Promise<AuthorizationList> {
    const { chainId, txParams, networkClientId } = transactionMeta;
    const { from, nonce: txNonce } = txParams;
    const nextNonce = await this.#getNextNonce(from, networkClientId);

    const nonce = txNonce ?? nextNonce;

    log('Including authorization as not upgraded');

    if (!upgradeContractAddress) {
      throw new Error('Upgrade contract address not found');
    }

    const authorizationSignature = (await this.#messenger.call(
      'KeyringController:signEip7702Authorization',
      {
        chainId: parseInt(chainId, 16),
        contractAddress: upgradeContractAddress,
        from,
        nonce: parseInt(nonce as string, 16),
      },
    )) as Hex;

    const { r, s, yParity } = decodeAuthorizationSignature(
      authorizationSignature,
    );

    log('Authorization signature', { authorizationSignature, r, s, yParity });

    return [
      {
        address: upgradeContractAddress,
        chainId,
        nonce: nonce as Hex,
        r,
        s,
        yParity,
      },
    ];
  }

  #buildTokenTransferData(recipient: Hex, amount: Hex): Hex {
    return new Interface(abiERC20).encodeFunctionData('transfer', [
      recipient,
      amount,
    ]) as Hex;
  }
}
