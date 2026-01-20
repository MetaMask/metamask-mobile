import { useCallback, useState, useEffect } from 'react';
import BN from 'bnjs4';

import { strings } from '../../../../../../locales/i18n';
import {
  isValidPositiveNumericString,
  toTokenMinimalUnit,
} from '../../utils/send';
import { AssetType, Nft, TokenStandard } from '../../types/token';
import { useSendContext } from '../../context/send-context';
import { useBalance } from './useBalance';
import { useSendType } from './useSendType';
import {
  useSnapAmountOnInput,
  type SnapOnAmountInputResult,
} from './useSnapAmountOnInput';

export const useAmountValidation = () => {
  const { asset, value } = useSendContext();
  const { decimals, rawBalanceBN } = useBalance();
  const { isNonEvmSendType } = useSendType();
  const { validateAmountWithSnap } = useSnapAmountOnInput();
  const [amountError, setAmountError] = useState<string | undefined>(undefined);

  const setAndReturnError = useCallback((errorMessage: string | undefined) => {
    setAmountError(errorMessage);
    return errorMessage;
  }, []);

  const validateNonEvmAmount = useCallback(async (): Promise<
    string | undefined
  > => {
    if (!isNonEvmSendType) {
      return undefined;
    }

    if (rawBalanceBN.isZero()) {
      return strings('send.insufficient_funds');
    }

    try {
      const result = (await validateAmountWithSnap(
        value || '0',
      )) as SnapOnAmountInputResult;

      if (result.errors?.length > 0) {
        const errorMessage = mapSnapErrorCodeIntoTranslation(
          result.errors[0].code,
        );
        return errorMessage;
      }
      return undefined;
    } catch (error) {
      return strings('send.invalid_value');
    }
  }, [value, validateAmountWithSnap, isNonEvmSendType, rawBalanceBN]);

  const validateAmountAsync = useCallback(async () => {
    if (!value) {
      return setAndReturnError(undefined);
    }

    const validations = [
      () => validatePositiveNumericString(value),
      () => validateERC1155Balance(asset as AssetType | Nft, value),
      () => validateTokenBalance(value, rawBalanceBN, decimals ?? 0),
      validateNonEvmAmount,
    ];

    for (const validation of validations) {
      const error = await Promise.resolve(validation());
      if (error) {
        return setAndReturnError(error);
      }
    }

    return setAndReturnError(undefined);
  }, [
    asset,
    rawBalanceBN,
    decimals,
    value,
    validateNonEvmAmount,
    setAndReturnError,
  ]);

  // This callback is needed for non-EVM validation when nothing is typed into amount
  const validateNonEvmAmountAsync = useCallback(async () => {
    const error = await validateNonEvmAmount();
    return setAndReturnError(error);
  }, [validateNonEvmAmount, setAndReturnError]);

  useEffect(() => {
    validateAmountAsync();
  }, [validateAmountAsync]);

  return { amountError, validateNonEvmAmountAsync };
};

export function validateERC1155Balance(
  asset: AssetType | Nft,
  value: string | undefined,
): string | undefined {
  if (asset?.standard !== TokenStandard.ERC1155) {
    return undefined;
  }

  if (asset?.balance && value) {
    const valueInt = parseInt(value, 10);
    const balanceInt = parseInt(asset.balance.toString(), 10);
    if (valueInt > balanceInt) {
      return strings('send.insufficient_funds');
    }
  }

  return undefined;
}

export function validateTokenBalance(
  amount: string,
  rawBalanceBN: BN,
  decimals: number | undefined,
): string | undefined {
  const amountInputBN = toTokenMinimalUnit(amount, decimals ?? 0);
  if (rawBalanceBN.cmp(amountInputBN) === -1) {
    return strings('send.insufficient_funds');
  }
  return undefined;
}

export function validatePositiveNumericString(
  value: string,
): string | undefined {
  if (!isValidPositiveNumericString(value)) {
    return strings('send.invalid_value');
  }
  return undefined;
}

function mapSnapErrorCodeIntoTranslation(errorCode: string): string {
  switch (errorCode) {
    case 'InsufficientBalance':
      return strings('send.insufficient_funds');
    case 'InsufficientBalanceToCoverFee':
      return strings('send.insufficient_balance_to_cover_fee');
    case 'Invalid':
    default:
      return strings('send.invalid_value');
  }
}
