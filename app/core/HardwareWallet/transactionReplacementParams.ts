import type {
  FeeMarketEIP1559Values,
  GasPriceValue,
} from '@metamask/transaction-controller';

export interface ReplacementTxParams {
  type: string;
  eip1559GasFee?: {
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
  };
  legacyGasFee?: {
    gasPrice?: string;
  };
}

/**
 * Normalizes replacement gas params down to the controller-supported fields.
 */
export function getReplacementGasFeeParams(
  replacementParams?: ReplacementTxParams,
): GasPriceValue | FeeMarketEIP1559Values | undefined {
  if (replacementParams?.legacyGasFee?.gasPrice) {
    return {
      gasPrice: replacementParams.legacyGasFee.gasPrice,
    };
  }

  if (
    replacementParams?.eip1559GasFee?.maxFeePerGas &&
    replacementParams?.eip1559GasFee?.maxPriorityFeePerGas
  ) {
    return {
      maxFeePerGas: replacementParams.eip1559GasFee.maxFeePerGas,
      maxPriorityFeePerGas:
        replacementParams.eip1559GasFee.maxPriorityFeePerGas,
    };
  }

  return undefined;
}
