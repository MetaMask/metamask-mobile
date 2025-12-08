import { Hex } from '@metamask/utils';
import { isAddress as isSolanaAddress } from '@solana/addresses';

import { strings } from '../../../../../locales/i18n';
import Engine from '../../../../core/Engine';
import { toChecksumAddress } from '../../../../util/address';
import {
  collectConfusables,
  getConfusablesExplanations,
  hasZeroWidthPoints,
} from '../../../../util/confusables';
import { memoizedGetTokenStandardAndDetails } from './token';
import {
  isBtcMainnetAddress,
  isTronAddress,
} from '../../../../core/Multichain/utils';

export const LOWER_CASED_BURN_ADDRESSES = [
  '0x0000000000000000000000000000000000000000',
  '0x000000000000000000000000000000000000dead',
];

export const validateBitcoinAddress = (
  toAddress: string,
): {
  error?: string;
  warning?: string;
} => {
  if (!isBtcMainnetAddress(toAddress)) {
    return {
      error: strings('send.invalid_address'),
    };
  }

  return {};
};

export const validateHexAddress = async (
  toAddress: string,
  chainId?: Hex,
  assetAddress?: string,
): Promise<{
  error?: string;
  warning?: string;
}> => {
  if (LOWER_CASED_BURN_ADDRESSES.includes(toAddress?.toLowerCase())) {
    return {
      error: strings('send.invalid_address'),
    };
  }

  if (toAddress?.toLowerCase() === assetAddress?.toLowerCase()) {
    return {
      error: strings('send.contractAddressError'),
    };
  }

  const checksummedAddress = toChecksumAddress(toAddress);
  if (chainId) {
    const { NetworkController } = Engine.context;

    try {
      const networkClientId = NetworkController.findNetworkClientIdByChainId(
        chainId as Hex,
      );
      const token = await memoizedGetTokenStandardAndDetails({
        tokenAddress: checksummedAddress,
        tokenId: undefined,
        userAddress: undefined,
        networkClientId,
      });
      if (token?.standard) {
        return {
          error: strings('send.token_contract_warning'),
        };
      }
    } catch {
      // Not a token address
    }
  }
  return {};
};

const SOLANA_BURN_ADDRESSES = [
  '1nc1nerator11111111111111111111111111111111',
  'So11111111111111111111111111111111111111112',
];

export const validateSolanaAddress = (
  toAddress: string,
): {
  error?: string;
  warning?: string;
} => {
  if (SOLANA_BURN_ADDRESSES.includes(toAddress)) {
    return {
      error: strings('send.invalid_address'),
    };
  }

  if (!isSolanaAddress(toAddress)) {
    return {
      error: strings('send.invalid_address'),
    };
  }
  return {};
};

export const getConfusableCharacterInfo = (toAddress: string) => {
  const confusableCollection = collectConfusables(toAddress);
  if (confusableCollection.length) {
    const invalidAddressMessage = strings('transaction.invalid_address');
    const confusableCharacterWarningMessage = `${strings(
      'transaction.confusable_msg',
    )} - ${getConfusablesExplanations(confusableCollection)}`;
    const invisibleCharacterWarningMessage = strings(
      'send.invisible_character_error',
    );
    const isError = confusableCollection.some(hasZeroWidthPoints);
    if (isError) {
      // Show ERROR for zero-width characters (more important than warning)
      return {
        error: invalidAddressMessage,
        warning: invisibleCharacterWarningMessage,
      };
    }
    // Show WARNING for confusable characters
    return {
      warning: confusableCharacterWarningMessage,
    };
  }
  return {};
};

export const validateTronAddress = (
  toAddress: string,
): {
  error?: string;
  warning?: string;
} => {
  if (!isTronAddress(toAddress)) {
    return {
      error: strings('send.invalid_address'),
    };
  }
  return {};
};
