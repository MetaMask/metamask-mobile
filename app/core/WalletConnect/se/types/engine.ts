import { ErrorResponse } from "@walletconnect/jsonrpc-utils";
import { PendingRequestTypes, ProposalTypes, SessionTypes } from "@walletconnect/types";
import { ISingleEthereum } from "./client";
import { IWalletKit } from "@reown/walletkit";
export abstract class ISingleEthereumEngine {
  public abstract web3wallet: IWalletKit;
  public abstract chainId?: number;

  constructor(public client: ISingleEthereum) {}
  // ---------- Public Methods ------------------------------------------------- //
  public abstract init(): Promise<void>;

  public abstract pair(params: { uri: string; activatePairing?: boolean }): Promise<void>;

  // ---------- Sign ------------------------------------------------- //
  // approve a session proposal (SIGN)
  public abstract approveSession(params: {
    id: number;
    chainId: number;
    accounts: string[];
  }): Promise<SessionTypes.Struct>;

  // reject a session proposal (SIGN)
  public abstract rejectSession(params: { id: number; error: ErrorResponse }): Promise<void>;

  // update session namespaces (SIGN)
  public abstract updateSession(params: {
    topic: string;
    chainId: number;
    accounts: string[];
  }): Promise<void>;

  // approve JSON-RPC request (SIGN)
  public abstract approveRequest(params: { topic: string; id: number; result: any }): Promise<void>;

  // reject session events (SIGN)
  public abstract rejectRequest(params: {
    topic: string;
    id: number;
    error: ErrorResponse;
  }): Promise<void>;

  // disconnect a session (SIGN)
  public abstract disconnectSession(params: { topic: string; error: ErrorResponse }): Promise<void>;

  // query all active sessions (SIGN)
  public abstract getActiveSessions(): Record<string, SessionTypes.Struct> | undefined;

  // query all pending session requests (SIGN)
  public abstract getPendingSessionProposals(): Record<number, ProposalTypes.Struct> | undefined;

  // query all pending session requests (SIGN)
  public abstract getPendingSessionRequests(): PendingRequestTypes.Struct[] | undefined;

  // // ---------- Auth ------------------------------------------------- //

  public abstract approveAuthRequest(params: {
    id: number;
    signature: string;
    address: string;
  }): Promise<void>;

  public abstract rejectAuthRequest(params: { id: number; error: ErrorResponse }): Promise<void>;
}
