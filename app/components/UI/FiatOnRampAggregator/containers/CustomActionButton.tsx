import React, { useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  PaymentCustomAction,
  ProviderBuyFeatureBrowserEnum,
} from '@consensys/on-ramp-sdk/dist/API';
import CustomActionButtonComponent from '../components/CustomActionButton';
import { useFiatOnRampSDK } from '../sdk';
import useAnalytics from '../hooks/useAnalytics';
import useInAppBrowser from '../hooks/useInAppBrowser';
import Logger from '../../../../util/Logger';
import { createCheckoutNavDetails } from '../Views/Checkout';

interface Props {
  customAction: PaymentCustomAction;
  amount: number;
  fiatSymbol: string;
  disabled?: boolean;
}

const CustomActionButton: React.FC<
  Props & React.ComponentProps<typeof CustomActionButtonComponent>
> = ({ customAction, amount, disabled, fiatSymbol, ...props }: Props) => {
  const navigation = useNavigation();
  const trackEvent = useAnalytics();
  const [isLoading, setIsLoading] = useState(false);

  const renderInAppBrowser = useInAppBrowser();

  /**
   * Grab the current state of the SDK via the context.
   */
  const {
    selectedAddress,
    selectedPaymentMethodId,
    selectedRegion,
    selectedAsset,
    selectedFiatCurrencyId,
    selectedChainId,
    callbackBaseUrl,
    sdk,
  } = useFiatOnRampSDK();

  /**
   * * Handle custom action
   */

  const handleCustomAction = useCallback(async () => {
    if (!sdk || !customAction) {
      return;
    }
    try {
      setIsLoading(true);
      const providerId = customAction.buy.providerId;
      const provider = await sdk.getProvider(
        selectedRegion?.id as string,
        providerId,
      );

      trackEvent('ONRAMP_DIRECT_PROVIDER_CLICKED', {
        region: selectedRegion?.id as string,
        provider_onramp: provider.provider.name,
        currency_source: fiatSymbol,
        currency_destination: selectedAsset?.symbol as string,
        chain_id_destination: selectedChainId as string,
        payment_method_id: selectedPaymentMethodId as string,
      });

      const buyAction = await sdk.getBuyUrl(
        provider.provider,
        selectedRegion?.id as string,
        selectedPaymentMethodId as string,
        selectedAsset?.id as string,
        selectedFiatCurrencyId as string,
        amount,
        selectedAddress,
      );

      if (buyAction.browser === ProviderBuyFeatureBrowserEnum.AppBrowser) {
        const { url, orderId: customOrderId } = await buyAction.createWidget(
          callbackBaseUrl,
        );
        navigation.navigate(
          ...createCheckoutNavDetails({
            url,
            provider: provider.provider,
            customOrderId,
          }),
        );
      } else if (
        buyAction.browser === ProviderBuyFeatureBrowserEnum.InAppOsBrowser
      ) {
        await renderInAppBrowser(
          buyAction,
          provider.provider,
          amount,
          fiatSymbol,
        );
      } else {
        throw new Error('Unsupported browser type: ' + buyAction.browser);
      }
    } catch (error) {
      Logger.error(error as Error, {
        message:
          'FiatOrders::CustomActionButton error while getting buy action',
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    amount,
    callbackBaseUrl,
    customAction,
    fiatSymbol,
    navigation,
    renderInAppBrowser,
    sdk,
    selectedAddress,
    selectedAsset?.id,
    selectedAsset?.symbol,
    selectedChainId,
    selectedFiatCurrencyId,
    selectedPaymentMethodId,
    selectedRegion?.id,
    trackEvent,
  ]);

  return (
    <CustomActionButtonComponent
      customActionButton={customAction.button}
      onPress={handleCustomAction}
      isLoading={isLoading}
      disabled={disabled || isLoading}
      {...props}
    />
  );
};

export default CustomActionButton;
