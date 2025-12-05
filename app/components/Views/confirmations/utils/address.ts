import { ChainType } from './send';
import { isAddress as isSolanaAddress } from '@solana/addresses';
import { isAddress as isEvmAddress } from 'ethers/lib/utils';
import {
  isBtcMainnetAddress,
  isTronAddress,
} from '../../../../core/Multichain/utils';

export const derivePredefinedRecipientParams = (address: string) => {
  if (isEvmAddress(address)) {
    return {
      address,
      chainType: ChainType.EVM,
    };
  }

  if (isSolanaAddress(address)) {
    return {
      address,
      chainType: ChainType.SOLANA,
    };
  }

  if (isBtcMainnetAddress(address)) {
    return {
      address,
      chainType: ChainType.BITCOIN,
    };
  }

  if (isTronAddress(address)) {
    return {
      address,
      chainType: ChainType.TRON,
    };
  }

  return undefined;
};
