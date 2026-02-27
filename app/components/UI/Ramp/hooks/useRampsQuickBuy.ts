import { useEffect, useMemo, type ReactNode } from 'react';
import { useRampsController } from './useRampsController';
import { useRampNavigation } from './useRampNavigation';
import { registerQuickBuyErrorCallback } from '../utils/quickBuyCallbackRegistry';

export interface UseRampsQuickBuyParams {
  assetId?: string;
  amount?: string;
  onError?: (errorMessage: string) => void;
}

export interface RampsQuickBuyOption {
  providerId: string;
  providerName: string;
  paymentMethodId: string;
  paymentMethodName: string;
  deeplink: string;
  onPress: () => void;
}

export interface UseRampsQuickBuyResult {
  paymentOptions: RampsQuickBuyOption[];
  isLoading: boolean;
  error: string | null;
  hasOptions: boolean;
}

export interface RampsQuickBuyProps extends UseRampsQuickBuyParams {
  children: (state: UseRampsQuickBuyResult) => ReactNode;
}

const createQuickBuyDeeplink = ({
  assetId,
  amount,
  providerId,
  paymentMethodId,
}: {
  assetId: string;
  amount: string;
  providerId: string;
  paymentMethodId: string;
}): string => {
  const searchParams = new URLSearchParams({
    assetId,
    amount,
    providerId,
    paymentMethodId,
    autoProceed: 'true',
  });

  return `metamask://buy?${searchParams.toString()}`;
};

export function useRampsQuickBuy({
  assetId,
  amount,
  onError,
}: UseRampsQuickBuyParams): UseRampsQuickBuyResult {
  const { goToBuy } = useRampNavigation();
  const {
    selectedProvider,
    paymentMethods,
    setSelectedToken,
    tokensLoading,
    providersLoading,
    paymentMethodsLoading,
    tokensError,
    providersError,
    paymentMethodsError,
  } = useRampsController();

  useEffect(() => {
    if (assetId) {
      setSelectedToken(assetId);
    }
  }, [assetId, setSelectedToken]);

  const isLoading = tokensLoading || providersLoading || paymentMethodsLoading;
  const error = tokensError || providersError || paymentMethodsError;

  const paymentOptions = useMemo(() => {
    if (!assetId || !amount || !selectedProvider) {
      return [];
    }

    return paymentMethods.map((paymentMethod) => {
      const deeplink = createQuickBuyDeeplink({
        assetId,
        amount,
        providerId: selectedProvider.id,
        paymentMethodId: paymentMethod.id,
      });

      const onPress = () => {
        const callbackKey = onError
          ? registerQuickBuyErrorCallback(onError)
          : undefined;

        goToBuy({
          assetId,
          amount,
          providerId: selectedProvider.id,
          paymentMethodId: paymentMethod.id,
          autoProceed: true,
          callbackKey,
        });
      };

      return {
        providerId: selectedProvider.id,
        providerName: selectedProvider.name,
        paymentMethodId: paymentMethod.id,
        paymentMethodName: paymentMethod.name,
        deeplink,
        onPress,
      };
    });
  }, [amount, assetId, goToBuy, onError, paymentMethods, selectedProvider]);

  return {
    paymentOptions,
    isLoading,
    error,
    hasOptions: paymentOptions.length > 0,
  };
}

export function RampsQuickBuy({
  children,
  ...params
}: RampsQuickBuyProps): ReactNode {
  return children(useRampsQuickBuy(params));
}

export default useRampsQuickBuy;
