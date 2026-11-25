// Lowest intrinsic transaction cost defined by EIP-2780 (a self-transfer).
export const MIN_GAS_LIMIT = 12000n;

export enum GasModalType {
  ESTIMATES = 'estimatesModal',
  ADVANCED_EIP1559 = 'advancedEIP1559Modal',
  ADVANCED_GAS_PRICE = 'advancedGasPriceModal',
}

export const EMPTY_VALUE_STRING = '--';
