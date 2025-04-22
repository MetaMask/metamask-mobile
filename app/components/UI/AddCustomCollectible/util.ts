import { isValidAddress } from 'ethereumjs-util';
import { isSmartContractAddress } from '../../../util/transactions';
import { strings } from '../../../../locales/i18n';

interface ValidationResult {
  isValid: boolean;
  warningMessage: string;
}

/**
 * Validates a custom collectible address
 * @param address - The address to validate
 * @param chainId - The chain ID to check if the address is a smart contract
 * @returns Promise<ValidationResult> - Object containing validation result and warning message
 */
export const validateCustomCollectibleAddress = async (
  address: string,
  chainId?: string | null,
): Promise<ValidationResult> => {
  const isValidEthAddress = isValidAddress(address);

  if (address.length === 0) {
    return {
      isValid: false,
      warningMessage: strings('collectible.address_cant_be_empty'),
    };
  }

  if (!isValidEthAddress) {
    return {
      isValid: false,
      warningMessage: strings('collectible.address_must_be_valid'),
    };
  }

  if (chainId && !(await isSmartContractAddress(address, chainId))) {
    return {
      isValid: false,
      warningMessage: strings('collectible.address_must_be_smart_contract'),
    };
  }

  return {
    isValid: true,
    warningMessage: '',
  };
};

interface OwnershipValidationResult {
  isOwner: boolean;
  error?: {
    title: string;
    message: string;
  };
}

/**
 * Validates if a user owns a specific NFT
 * @param selectedAddress - The user's address
 * @param contractAddress - The NFT contract address
 * @param tokenId - The NFT token ID
 * @returns Promise<OwnershipValidationResult> - Object containing ownership result and optional error
 */
export const validateCollectibleOwnership = async (
  selectedAddress: string,
  contractAddress: string,
  tokenId: string,
): Promise<OwnershipValidationResult> => {
  try {
    const { NftController } = Engine.context;
    const isOwner = await NftController.isNftOwner(
      selectedAddress,
      contractAddress,
      tokenId,
    );

    if (!isOwner) {
      return {
        isOwner: false,
        error: {
          title: strings('collectible.not_owner_error_title'),
          message: strings('collectible.not_owner_error'),
        },
      };
    }

    return { isOwner: true };
  } catch {
    return {
      isOwner: false,
      error: {
        title: strings('collectible.ownership_verification_error_title'),
        message: strings('collectible.ownership_verification_error'),
      },
    };
  }
};
