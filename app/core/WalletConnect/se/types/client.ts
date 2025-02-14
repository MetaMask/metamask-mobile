/* eslint-disable @typescript-eslint/parameter-properties */
/* eslint-disable no-empty-function */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-namespace */
// eslint-disable-next-line import/no-nodejs-modules
import EventEmmiter, { EventEmitter } from 'events';
import { CoreTypes, ICore, Verify } from '@walletconnect/types';
import { ISingleEthereumEngine } from './engine';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Logger } from '@walletconnect/logger';
import { WalletKitTypes } from '@reown/walletkit';

export declare namespace SingleEthereumTypes {
  type Event = 'session_proposal' | 'session_proposal_error' | 'session_request' | 'session_delete';

  interface BaseEventArgs<T = unknown> {
    id: number;
    topic: string;
    params: T;
  }

  type SessionRequest = BaseEventArgs<{
    request: { method: string; params: unknown };
    chainId: string;
  }> & {
    verifyContext: Verify.Context;
  };

  type SessionProposal = WalletKitTypes.SessionProposal;

  type SessionDelete = Omit<BaseEventArgs, 'params'>;

  interface SessionProposalError {
    message: string;
    code: number;
  }

  interface EventArguments {
    session_proposal: SessionProposal;
    session_proposal_error: SessionProposalError;
    session_request: SessionRequest;
    session_delete: SessionDelete;
  }

  interface Options {
    core: ICore;
    metadata: Metadata;
    name?: string;
    chainId: number;
    signConfig?: WalletKitTypes.SignConfig;
  }

  type Metadata = CoreTypes.Metadata;
}

export abstract class ISingleEthereumEvents extends EventEmmiter {
  public abstract emit: <E extends SingleEthereumTypes.Event>(
    event: E,
    args: SingleEthereumTypes.EventArguments[E],
  ) => boolean;

  public abstract on: <E extends SingleEthereumTypes.Event>(
    event: E,
    listener: (args: SingleEthereumTypes.EventArguments[E]) => any,
  ) => this;

  public abstract once: <E extends SingleEthereumTypes.Event>(
    event: E,
    listener: (args: SingleEthereumTypes.EventArguments[E]) => any,
  ) => this;

  public abstract off: <E extends SingleEthereumTypes.Event>(
    event: E,
    listener: (args: SingleEthereumTypes.EventArguments[E]) => any,
  ) => this;

  public abstract removeListener: <E extends SingleEthereumTypes.Event>(
    event: E,
    listener: (args: SingleEthereumTypes.EventArguments[E]) => any,
  ) => this;
}

export abstract class ISingleEthereum {
  public abstract readonly name: string;
  public abstract engine: ISingleEthereumEngine;
  public abstract events: EventEmitter;
  public abstract logger: Logger;
  public abstract core: ICore;
  public abstract metadata: SingleEthereumTypes.Metadata;
  public abstract chainId: number;
  public abstract signConfig: WalletKitTypes.SignConfig;

  constructor(public opts: SingleEthereumTypes.Options) {}

  // ---------- Public Methods ----------------------------------------------- //

  public abstract pair: ISingleEthereumEngine['pair'];

  // sign //
  public abstract approveSession: ISingleEthereumEngine['approveSession'];
  public abstract rejectSession: ISingleEthereumEngine['rejectSession'];
  public abstract updateSession: ISingleEthereumEngine['updateSession'];
  public abstract approveRequest: ISingleEthereumEngine['approveRequest'];
  public abstract rejectRequest: ISingleEthereumEngine['rejectRequest'];
  public abstract disconnectSession: ISingleEthereumEngine['disconnectSession'];
  public abstract getActiveSessions: ISingleEthereumEngine['getActiveSessions'];
  public abstract getPendingSessionProposals: ISingleEthereumEngine['getPendingSessionProposals'];
  public abstract getPendingSessionRequests: ISingleEthereumEngine['getPendingSessionRequests'];

  // auth //
  // public abstract formatAuthMessage: ISingleEthereumEngine["formatAuthMessage"];
  public abstract approveAuthRequest: ISingleEthereumEngine['approveAuthRequest'];
  public abstract rejectAuthRequest: ISingleEthereumEngine['rejectAuthRequest'];
  // public abstract getPendingAuthRequests: ISingleEthereumEngine["getPendingAuthRequests"];

  // ---------- Event Handlers ----------------------------------------------- //
  public abstract on: <E extends SingleEthereumTypes.Event>(
    event: E,
    listener: (args: SingleEthereumTypes.EventArguments[E]) => void,
  ) => EventEmitter;

  public abstract once: <E extends SingleEthereumTypes.Event>(
    event: E,
    listener: (args: SingleEthereumTypes.EventArguments[E]) => void,
  ) => EventEmitter;

  public abstract off: <E extends SingleEthereumTypes.Event>(
    event: E,
    listener: (args: SingleEthereumTypes.EventArguments[E]) => void,
  ) => EventEmitter;

  public abstract removeListener: <E extends SingleEthereumTypes.Event>(
    event: E,
    listener: (args: SingleEthereumTypes.EventArguments[E]) => void,
  ) => EventEmitter;
}
