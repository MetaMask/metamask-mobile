import { Hex, add0x } from '@metamask/utils';
import { decimalToHex, multiplyHexes } from '../../../../../util/conversions';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

export const useTransactionMaxGasCost = () => {
  const transactionMetadata = useTransactionMetadataRequest();

  if (!transactionMetadata) {
    return undefined;
  }

  const { txParams } = transactionMetadata;
  const { maxFeePerGas, gas, gasPrice } = txParams;

  return add0x(
    multiplyHexes(
      maxFeePerGas ? (decimalToHex(maxFeePerGas) as Hex) : (gasPrice as Hex),
      gas as Hex,
    ),
  );
};
