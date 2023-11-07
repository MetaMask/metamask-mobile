import { useEffect, useMemo, useState } from 'react';
import { useFiatOnRampSDK } from '../sdk';
import useSDKMethod from './useSDKMethod';

function usePaymentMethods() {
  const {
    selectedRegion,
    selectedPaymentMethodId,
    setSelectedPaymentMethodId,
    selectedChainId,
    sdk,
  } = useFiatOnRampSDK();
  const [isFilterLoading, setIsFilterLoading] = useState(true);
  const [allowedMethodIds, setAllowedMethodIds] = useState<string[]>();

  const [{ data: paymentMethods, isFetching, error }, queryGetPaymentMethods] =
    useSDKMethod('getPaymentMethods', selectedRegion?.id);

  useEffect(() => setAllowedMethodIds(undefined), [selectedRegion]);

  useEffect(() => {
    if (!isFetching && !error && paymentMethods && selectedRegion) {
      const getAllowedPaymentMethods = async () => {
        setIsFilterLoading(true);
        const allowed = [];
        for (const method of paymentMethods) {
          if (!method.customAction) {
            allowed.push(method.id);
          } else {
            const cryptoCurrencies = await sdk?.getCryptoCurrencies(
              selectedRegion.id,
              method.id,
            );
            if (
              cryptoCurrencies?.some(
                (cryptoCurrency) =>
                  String(cryptoCurrency.network.chainId) === selectedChainId,
              )
            ) {
              allowed.push(method.id);
            }
          }
        }
        setAllowedMethodIds(allowed);
        setIsFilterLoading(false);
      };
      getAllowedPaymentMethods();
    }
    /** Dependency `selectedRegion?.id` is disabled because is causing an extra
     * filter cycle, leading to a wrong default payment method selection.
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    error,
    isFetching,
    paymentMethods,
    sdk,
    selectedChainId,
    // selectedRegion?.id,
  ]);

  const availablePaymentMethods = useMemo(() => {
    if (
      !isFetching &&
      !isFilterLoading &&
      !error &&
      paymentMethods &&
      allowedMethodIds
    ) {
      if (allowedMethodIds.length === 0) return [];
      return paymentMethods.filter((method) =>
        allowedMethodIds.includes(method.id),
      );
    }

    return null;
  }, [error, isFetching, isFilterLoading, paymentMethods, allowedMethodIds]);

  const currentPaymentMethod = useMemo(
    () =>
      availablePaymentMethods?.find(
        (method) => method.id === selectedPaymentMethodId,
      ),
    [availablePaymentMethods, selectedPaymentMethodId],
  );

  useEffect(() => {
    if (!isFetching && !isFilterLoading && !error && availablePaymentMethods) {
      const paymentMethod = availablePaymentMethods.find(
        (pm) => pm.id === selectedPaymentMethodId,
      );
      if (!paymentMethod) {
        setSelectedPaymentMethodId(availablePaymentMethods?.[0]?.id);
      }
    }
  }, [
    error,
    availablePaymentMethods,
    isFetching,
    selectedPaymentMethodId,
    setSelectedPaymentMethodId,
    isFilterLoading,
  ]);

  return {
    data: availablePaymentMethods,
    isFetching: isFetching || isFilterLoading,
    error,
    query: queryGetPaymentMethods,
    currentPaymentMethod,
  };
}

export default usePaymentMethods;
