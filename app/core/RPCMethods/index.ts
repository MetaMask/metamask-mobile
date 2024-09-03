import eth_sendTransaction from './eth_sendTransaction';
import wallet_addEthereumChain from './wallet_addEthereumChain';
import wallet_switchEthereumChain from './wallet_switchEthereumChain';
import wallet_watchAsset from './wallet_watchAsset';
import { JsonRpcRequest, PendingJsonRpcResponse } from 'json-rpc-engine';
import { TransactionParams, TransactionController } from '@metamask/transaction-controller';

interface EthSendTransactionParams {
  hostname: string;
  req: JsonRpcRequest<TransactionParams> & { method: 'eth_sendTransaction' };
  res: PendingJsonRpcResponse<unknown>;
  sendTransaction: TransactionController['addTransaction'];
  validateAccountAndChainId: (args: {
    from: string;
    chainId?: number;
  }) => Promise<void>;
}

interface AddEthereumChainParams {
  req: JsonRpcRequest<
    [
      {
        chainId: string;
        chainName: string;
        nativeCurrency: { name: string; symbol: string; decimals: number };
        rpcUrls: string[];
        blockExplorerUrls?: string[];
      },
    ]
  >;
  res: PendingJsonRpcResponse<null>;
  requestUserApproval: (args: {
    type: string;
    requestData: Record<string, unknown>;
  }) => Promise<void>;
  analytics: Record<string, unknown>;
  startApprovalFlow: () => { id: string };
  endApprovalFlow: (args: { id: string }) => void;
}

interface SwitchEthereumChainParams {
  req: JsonRpcRequest<[{ chainId: string }]>;
  res: PendingJsonRpcResponse<null>;
  requestUserApproval: (args: {
    type: string;
    requestData: Record<string, unknown>;
  }) => Promise<void>;
  analytics: Record<string, unknown>;
}

interface WatchAssetParams {
  req: JsonRpcRequest<{
    type: string;
    options: {
      address: string;
      symbol: string;
      decimals: string;
      image: string;
    };
  }>;
  res: PendingJsonRpcResponse<boolean>;
  hostname: string;
  checkTabActive: () => true | undefined;
}

interface RPCMethodsType {
  eth_sendTransaction: (args: EthSendTransactionParams) => Promise<void>;
  wallet_addEthereumChain: (args: AddEthereumChainParams) => Promise<void>;
  wallet_switchEthereumChain: (
    args: SwitchEthereumChainParams,
  ) => Promise<void>;
  wallet_watchAsset: (args: WatchAssetParams) => Promise<void>;
}

const RPCMethods: RPCMethodsType = {
  eth_sendTransaction,
  wallet_addEthereumChain,
  wallet_switchEthereumChain,
  wallet_watchAsset,
};

export default RPCMethods;
