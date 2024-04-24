import { useEffect } from 'react';
import { type BN } from 'ethereumjs-util';
import { useRampSDK } from '../sdk';
import parseAmount from '../utils/parseAmount';
import { toTokenMinimalUnit } from '../../../../util/number';
import Logger from '../../../../util/Logger';
import { FiatCurrency } from '@consensys/on-ramp-sdk';

export default function useIntentAmount(
  setAmount: (amount: React.SetStateAction<string>) => void,
  setAmountNumber: (amount: React.SetStateAction<number>) => void,
  setAmountBNMinimalUnit: (
    amount: React.SetStateAction<BN | undefined>,
  ) => void,
  currentFiatCurrency: FiatCurrency | null,
) {
  const { selectedAsset, intent, setIntent, isBuy, isSell } = useRampSDK();
  useEffect(() => {
    if (intent?.amount && currentFiatCurrency && selectedAsset) {
      try {
        const parsedAmount = parseAmount(
          intent.amount,
          isBuy
            ? currentFiatCurrency.decimals ?? 0
            : selectedAsset.decimals ?? 0,
        );

        if (parsedAmount) {
          let valueAsNumber = 0;
          try {
            valueAsNumber = Number(parsedAmount);
          } catch (numberError) {
            Logger.error(numberError, 'Error parsing intent amount as number');
          }
          setAmount(parsedAmount);
          setAmountNumber(valueAsNumber);
          if (isSell) {
            setAmountBNMinimalUnit(
              toTokenMinimalUnit(
                `${parsedAmount}`,
                selectedAsset?.decimals ?? 0,
              ) as BN,
            );
          }
        }
      } catch (parsingError) {
        Logger.error(parsingError, 'Error parsing intent amount');
      } finally {
        setIntent((prevIntent) => ({ ...prevIntent, amount: undefined }));
      }
    }
  }, [
    currentFiatCurrency,
    intent,
    setIntent,
    isBuy,
    isSell,
    selectedAsset,
    setAmount,
    setAmountNumber,
    setAmountBNMinimalUnit,
  ]);
}
