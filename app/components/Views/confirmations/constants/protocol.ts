import { isEvmAccountType } from '@metamask/keyring-api';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { isSolanaChainId, isBitcoinChainId } from '@metamask/bridge-controller';
import { isAddress as isEvmAddress } from 'ethers/lib/utils';

import {
  isSolanaAccount,
  isBtcAccount,
} from '../../../../core/Multichain/utils';
import { AssetType, Nft } from '../types/token';

export enum AssetProtocol {
  EVM = 'EVM',
  SOLANA = 'SOLANA',
  BITCOIN = 'BITCOIN',
}

interface ProtocolConfig {
  isAssetType: (asset: AssetType | Nft) => boolean;
  isAccountType: (account: InternalAccount) => boolean;
}

export const PROTOCOL_CONFIG: Record<AssetProtocol, ProtocolConfig> = {
  [AssetProtocol.EVM]: {
    isAssetType: (asset) =>
      asset?.address ? isEvmAddress(asset.address) : false,
    isAccountType: (account) => isEvmAccountType(account.type),
  },
  [AssetProtocol.SOLANA]: {
    isAssetType: (asset) =>
      asset?.chainId ? isSolanaChainId(asset.chainId) : false,
    isAccountType: (account) => isSolanaAccount(account),
  },
  [AssetProtocol.BITCOIN]: {
    isAssetType: (asset) =>
      asset?.chainId ? isBitcoinChainId(asset.chainId) : false,
    isAccountType: (account) => isBtcAccount(account),
  },
};
