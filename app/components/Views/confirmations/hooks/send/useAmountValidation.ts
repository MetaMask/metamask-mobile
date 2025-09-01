import { useCallback } from 'react';

import { strings } from '../../../../../../locales/i18n';
import { isDecimal } from '../../../../../util/number';
import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { Nft, TokenStandard } from '../../types/token';
import { useSendContext } from '../../context/send-context';
import { useEvmAmountValidation } from './evm/useEvmAmountValidation';
import { useNonEvmAmountValidation } from './non-evm/useNonEvmAmountValidation';
import { useSendType } from './useSendType';

export const validateERC1155Balance = (asset: Nft, value?: string) => {
  if (asset?.balance && value) {
    if (parseInt(value) > parseInt(asset.balance)) {
      return strings('send.insufficient_funds');
    }
  }
  return undefined;
};

export const useAmountValidation = () => {
  const { asset, value } = useSendContext();
  const { isEvmSendType } = useSendType();
  const { validateEvmAmount } = useEvmAmountValidation();
  const { validateNonEvmAmount } = useNonEvmAmountValidation();

  const validateAmount = useCallback(async () => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (!isDecimal(value) || Number(value) < 0) {
      return strings('send.invalid_value');
    }
    if (asset?.standard === TokenStandard.ERC1155) {
      return validateERC1155Balance(asset as Nft, value);
    }
    return isEvmSendType ? validateEvmAmount() : await validateNonEvmAmount();
  }, [asset, isEvmSendType, validateEvmAmount, validateNonEvmAmount, value]);

  const { value: amountError } = useAsyncResult(validateAmount, [
    validateAmount,
  ]);

  return { amountError };
};
