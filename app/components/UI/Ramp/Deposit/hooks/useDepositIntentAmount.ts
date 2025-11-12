import { useEffect } from 'react';
import { useDepositSDK } from '../sdk';
import parseAmount from '../../../../../util/parseAmount';

export default function useDepositIntentAmount(
  setAmount: (amount: React.SetStateAction<string>) => void,
  setAmountAsNumber: (amount: React.SetStateAction<number>) => void,
) {
  const { selectedCryptoCurrency, selectedRegion, intent, setIntent } =
    useDepositSDK();

  useEffect(() => {
    if (intent?.amount && selectedRegion && selectedCryptoCurrency) {
      try {
        const parsedAmount = parseAmount(
          intent.amount,
          selectedRegion.currency.decimals ?? 2,
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
          setAmountAsNumber(valueAsNumber);
        }
      } catch (parsingError) {
        console.error('Error parsing intent amount', parsingError as Error);
      } finally {
        setIntent((prevIntent) =>
          prevIntent ? { ...prevIntent, amount: undefined } : undefined,
        );
      }
    }
  }, [
    selectedRegion,
    intent,
    setIntent,
    selectedCryptoCurrency,
    setAmount,
    setAmountAsNumber,
  ]);
}
