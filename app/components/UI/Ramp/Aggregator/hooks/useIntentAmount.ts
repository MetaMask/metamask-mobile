import { useEffect } from 'react';
import type BN4 from 'bnjs4';
import { useRampSDK } from '../sdk';
import { toTokenMinimalUnit } from '../../../../../util/number';
import { FiatCurrency } from '@consensys/on-ramp-sdk';
import parseAmount from '../../../../../util/parseAmount';
import type { RampIntent } from '../../types';

/**
 * This hook is used to parse and set the amount of the ramp intent in the view state.
 * In case the amount can not be parsed, it logs the error and sets the amount to undefined.
 * It takes four arguments: setAmount, setAmountNumber, setAmountBNMinimalUnit, and currentFiatCurrency.
 *
 * @param setAmount - A state setter function to update the amount as a string.
 * @param setAmountNumber - A state setter function to update the amount as a number.
 * @param setAmountBNMinimalUnit - A state setter function to update the amount in minimal unit as a BN (BigNumber).
 * @param currentFiatCurrency - The current fiat currency.
 *
 * @returns {void} - This hook does not return a value. It performs side effects by setting the amount in different formats based on the intent and the current fiat currency.
 */
export default function useIntentAmount(
  setAmount: (amount: React.SetStateAction<string>) => void,
  setAmountNumber: (amount: React.SetStateAction<number>) => void,
  setAmountBNMinimalUnit: (
    amount: React.SetStateAction<BN4 | undefined>,
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
            ? (currentFiatCurrency.decimals ?? 0)
            : (selectedAsset.decimals ?? 0),
        );

        if (parsedAmount) {
          let valueAsNumber = 0;
          try {
            valueAsNumber = Number(parsedAmount);
          } catch (numberError) {
            console.error(
              'Error parsing intent amount as number',
              numberError as Error,
            );
          }
          setAmount(parsedAmount);
          setAmountNumber(valueAsNumber);
          if (isSell) {
            setAmountBNMinimalUnit(
              toTokenMinimalUnit(
                `${parsedAmount}`,
                selectedAsset?.decimals ?? 0,
              ) as BN4,
            );
          }
        }
      } catch (parsingError) {
        console.error('Error parsing intent amount', parsingError as Error);
      } finally {
        setIntent((prevIntent: RampIntent | undefined) => ({
          ...prevIntent,
          amount: undefined,
        }));
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
