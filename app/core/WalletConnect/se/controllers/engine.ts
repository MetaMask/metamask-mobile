/* eslint-disable @typescript-eslint/no-explicit-any */
import { formatJsonRpcError, formatJsonRpcResult } from '@walletconnect/jsonrpc-utils';
import { getSdkError, normalizeNamespaces } from '@walletconnect/utils';
import { IWalletKit, WalletKit } from '@reown/walletkit';
import { EVM_IDENTIFIER, SWITCH_CHAIN_METHODS } from '../constants';
import { ISingleEthereumEngine, SingleEthereumTypes } from '../types';
import {
  validateProposalNamespaces,
  validateProposalChains,
  chainAlreadyInSession,
  formatAccounts,
  prefixChainWithNamespace,
  parseChain,
  parseSessions,
  parseProposals,
  parseProposal,
  accountsAlreadyInSession,
} from '../utils';

export class Engine extends ISingleEthereumEngine {
  public web3wallet: IWalletKit;
  public chainId: number;
  private pendingInternalRequests: {
    id: number;
    resolve: <T>(value?: T | PromiseLike<T>) => void;
    reject: <T>(value?: T | PromiseLike<T>) => void;
  }[] = [];

  private switchChainTimeout: NodeJS.Timeout | undefined;

  constructor(client: ISingleEthereumEngine['client']) {
    super(client);
    this.chainId = 1;
    // initialized in init()
    this.web3wallet = {} as IWalletKit;
  }

  public init = async () => {
    this.chainId = this.client.chainId;
    this.web3wallet = await WalletKit.init({
      core: this.client.core,
      metadata: this.client.metadata,
      signConfig: this.client.signConfig || {
        disableRequestQueue: true,
      },
    });
    this.initializeEventListeners();
  };

  public pair: ISingleEthereumEngine['pair'] = async (params) => {
    await this.web3wallet.pair(params);
  };

  public approveSession: ISingleEthereumEngine['approveSession'] = async (params) => {
    const { id, chainId, accounts } = params;
    const proposal = this.web3wallet.engine.signClient.proposal.get(id);
    const normalizedRequired = normalizeNamespaces(proposal.requiredNamespaces);
    const normalizedOptional = normalizeNamespaces(proposal.optionalNamespaces);
    const requiredChains = (normalizedRequired[EVM_IDENTIFIER]?.chains || []).map((chain) => {
      const parsed = parseChain(chain);
      return parseInt(parsed);
    });

    const approvedChains = [...new Set([chainId, ...requiredChains])];
    const approveParams = {
      id,
      namespaces: {
        [EVM_IDENTIFIER]: {
          ...normalizedRequired[EVM_IDENTIFIER],
          accounts: approvedChains.map((chain) => formatAccounts(accounts, chain)).flat(),
          chains: approvedChains.map((chain) => prefixChainWithNamespace(chain)),
          methods: normalizedRequired[EVM_IDENTIFIER]?.methods?.length
            ? normalizedRequired[EVM_IDENTIFIER].methods
            : ['eth_sendTransaction', 'personal_sign'],
          events: normalizedRequired[EVM_IDENTIFIER]?.events?.length
            ? normalizedRequired[EVM_IDENTIFIER].events
            : ['chainChanged', 'accountsChanged'],
        },
      },
    };

    const optionalMethods = normalizedOptional[EVM_IDENTIFIER]?.methods;
    if (optionalMethods) {
      approveParams.namespaces[EVM_IDENTIFIER].methods = approveParams.namespaces[
        EVM_IDENTIFIER
      ].methods
        .concat(optionalMethods)
        .flat();
    }

    const session = await this.web3wallet.approveSession(approveParams);
    this.chainId = chainId;
    // emit chainChanged if a different chain is approved other than the required
    if (chainId !== requiredChains?.[0]) {
      this.switchChainTimeout = setTimeout(() => this.changeChain(session.topic, chainId), 2_000);
    }

    return session;
  };

  public rejectSession: ISingleEthereumEngine['rejectSession'] = async (params) => await this.web3wallet.rejectSession({
      id: params.id,
      reason: params.error,
    });

  public updateSession: ISingleEthereumEngine['updateSession'] = async (params) => {
    const { topic, chainId, accounts } = params;
    if (chainId < 1) {
      // eslint-disable-next-line no-console
      return console.error('se-sdk, updateSession Invalid chainId', chainId);
    }
    const session = this.web3wallet.engine.signClient.session.get(topic);
    const formattedChain = prefixChainWithNamespace(chainId);
    const formattedAccounts = formatAccounts(accounts, chainId);
    const namespaces = session.namespaces[EVM_IDENTIFIER];
    let shouldUpdateSession = false;
    if (!chainAlreadyInSession(session, chainId)) {
      namespaces?.chains?.push(formattedChain);
      shouldUpdateSession = true;
    }

    if (!accountsAlreadyInSession(session, formattedAccounts)) {
      namespaces.accounts = namespaces.accounts.concat(formattedAccounts);
      shouldUpdateSession = true;
    }

    if (shouldUpdateSession) {
      await Promise.all([
        new Promise<void>((resolve) => {
          // wait for relayer to publish the update before emitting events
          const onPublish = (publishParams: { topic: string }) => {
            if (publishParams.topic === topic) {
              this.web3wallet.core.relayer.off('relayer_publish', onPublish);
              resolve();
            }
          };
          this.web3wallet.core.relayer.on('relayer_publish', onPublish);
        }),
        this.web3wallet.updateSession({
          topic,
          namespaces: {
            [EVM_IDENTIFIER]: namespaces,
          },
        }),
      ]);
    }

    if (this.chainId !== chainId) {
      await this.changeChain(topic, chainId);
      this.chainId = chainId;
    }
    try {
      await this.web3wallet.emitSessionEvent({
        topic,
        event: {
          name: 'accountsChanged',
          data: formattedAccounts,
        },
        chainId: formattedChain,
      });
    } catch (e) {
      this.client.logger.warn(e);
    }
  };

  public approveRequest: ISingleEthereumEngine['approveRequest'] = async (params) => {
    const { topic, id, result } = params;
    if (this.shouldHandlePendingInternalRequest(id, true)) return;
    const response = result?.jsonrpc ? result : formatJsonRpcResult(id, result);
    return await this.web3wallet.respondSessionRequest({
      topic,
      response,
    });
  };

  public rejectRequest: ISingleEthereumEngine['rejectRequest'] = async (params) => {
    const { topic, id, error } = params;
    if (this.shouldHandlePendingInternalRequest(id, false)) return;
    return await this.web3wallet.respondSessionRequest({
      topic,
      response: formatJsonRpcError(id, error),
    });
  };

  public disconnectSession: ISingleEthereumEngine['disconnectSession'] = async (params) => {
    await this.web3wallet.disconnectSession({
      topic: params.topic,
      reason: params.error,
    });
    await this.disconnectPairings();
  };

  public getActiveSessions: ISingleEthereumEngine['getActiveSessions'] = () => {
    const sessions = this.web3wallet.getActiveSessions();
    if (!sessions) return undefined;
    return parseSessions(Object.values(sessions));
  };

  public getPendingSessionProposals: ISingleEthereumEngine['getPendingSessionProposals'] = () => {
    const proposals = this.web3wallet.getPendingSessionProposals();
    if (!proposals) return undefined;
    return parseProposals(Object.values(proposals));
  };

  public getPendingSessionRequests: ISingleEthereumEngine['getPendingSessionRequests'] = () => {
    const requests = this.web3wallet.getPendingSessionRequests();
    if (!requests) return undefined;
    return requests;
  };

  // ---------- Auth ----------------------------------------------- //

  public approveAuthRequest: ISingleEthereumEngine['approveAuthRequest'] = async (_params) =>
    // const { id, signature, address } = params;
     ({} as any)
    // return await this.web3wallet.respondAuthRequest(
    //   {
    //     id,
    //     signature: {
    //       s: signature,
    //       t: "eip191",
    //     },
    //   },
    //   formatAuthAddress(address),
    // );
  ;

  public rejectAuthRequest: ISingleEthereumEngine['rejectAuthRequest'] = async (_params) =>
    // const { id, error } = params;
     ({} as any)
    // return await this.web3wallet.respondAuthRequest(
    //   {
    //     id,
    //     error,
    //   },
    //   "",
    // );
  ;

  // ---------- Private ----------------------------------------------- //

  private onSessionRequest = async (event: SingleEthereumTypes.SessionRequest) => {
    event.params.chainId = parseChain(event.params.chainId);

    if (
      ['wallet_switchEthereumChain', 'wallet_addEthereumChain'].includes(
        event.params.request.method,
      )
    ) {
      event.params.chainId = this.chainId.toString();
    }

    if (parseInt(event.params.chainId) !== this.chainId || this.isSwitchChainRequest(event)) {
      this.client.logger.info(
        `Session request chainId ${event.params.chainId} does not match current chainId ${this.chainId}. Attempting to switch`,
      );
      try {
        await this.switchEthereumChain(event);
      } catch (e) {
        this.client.logger.warn(e);
        const error = getSdkError('USER_REJECTED');
        return this.rejectRequest({ id: event.id, topic: event.topic, error });
      }
    }
    // delay session request to allow for chain switch to complete
    setTimeout(() => this.client.events.emit('session_request', event), 1_000);
  };

  private onSessionProposal = (event: SingleEthereumTypes.SessionProposal) => {
    const proposal = parseProposal(event.params);
    try {
      validateProposalNamespaces(proposal);
    } catch (e) {
      this.client.logger.error(e);
      const error = getSdkError('UNSUPPORTED_NAMESPACE_KEY');
      this.client.events.emit('session_proposal_error', error);
      return this.rejectSession({
        id: event.id,
        error,
      });
    }

    try {
      validateProposalChains(proposal);
    } catch (e) {
      this.client.logger.error(e);
      const error = getSdkError('UNSUPPORTED_CHAINS');
      this.client.events.emit('session_proposal_error', error);
      return this.rejectSession({
        id: event.id,
        error,
      });
    }
    return this.client.events.emit('session_proposal', {
      id: event.id,
      params: proposal,
      verifyContext: event.verifyContext,
    });
  };

  private onSessionDelete = async (event: SingleEthereumTypes.SessionDelete) => {
    this.client.events.emit('session_delete', event);
    await this.disconnectPairings();
  };

  private initializeEventListeners = () => {
    this.web3wallet.on('session_proposal', this.onSessionProposal);
    this.web3wallet.on('session_request', this.onSessionRequest);
    this.web3wallet.on('session_delete', this.onSessionDelete);
    // this.web3wallet.on("auth_request", this.onAuthRequest);
  };

  private disconnectPairings = async () => {
    const pairings = this.web3wallet.core.pairing.getPairings();
    if (pairings.length) {
      await Promise.all(
        pairings.map((pairing) =>
          this.web3wallet.core.pairing.disconnect({ topic: pairing.topic }),
        ),
      );
    }
  };

  private changeChain = async (topic: string, chainId: number) => {
    try {
      clearTimeout(this.switchChainTimeout);
      await this.web3wallet.emitSessionEvent({
        topic,
        event: {
          name: 'chainChanged',
          data: chainId,
        },
        chainId: prefixChainWithNamespace(chainId),
      });
    } catch (e) {
      this.client.logger.warn(e);
    }
  };

  private switchEthereumChain = async (event: SingleEthereumTypes.SessionRequest) => {
    const { topic, params } = event;
    const chainId = parseInt(params.chainId);

    // return early if the request is to switch to the current chain
    if (this.isSwitchChainRequest(event)) return;

    let requestResolve: <T>(value?: T | PromiseLike<T>) => void;
    let requestReject: <T>(value?: T | PromiseLike<T>) => void;
    await new Promise((resolve, reject) => {
      requestResolve = resolve;
      requestReject = reject;
      const reqId = this.pendingInternalRequests.length + 1;
      this.pendingInternalRequests.push({
        id: reqId,
        resolve: requestResolve,
        reject: requestReject,
      });
      this.client.events.emit('session_request', {
        id: reqId,
        topic,
        params: {
          request: {
            method: 'wallet_switchEthereumChain',
            params: [
              {
                chainId: `0x${chainId.toString(16)}`,
              },
            ],
          },
          chainId: `${this.chainId}`,
        },
        verifyContext: {
          verified: {
            verifyUrl: '',
            validation: 'UNKNOWN',
            origin: '',
          },
        },
      });
    });
    this.chainId = chainId;
  };

  private shouldHandlePendingInternalRequest = (id: number, isSuccess: boolean) => {
    const internalRequest = this.pendingInternalRequests.find((r) => r.id === id);
    if (internalRequest) {
      this.pendingInternalRequests = this.pendingInternalRequests.filter((r) => r.id !== id);
      isSuccess ? internalRequest.resolve() : internalRequest.reject();
    }
    return !!internalRequest;
  };

  private isSwitchChainRequest(event: SingleEthereumTypes.SessionRequest) {
    try {
      const chainId = parseInt((event.params.request?.params as any[])?.[0].chainId);
      return (
        SWITCH_CHAIN_METHODS.includes(event.params.request.method) ||
        (chainId && chainId !== this.chainId)
      );
    } catch (e) {
      this.client.logger.warn(e);
    }
    return false;
  }
}
