import React, { useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  PaymentCustomAction,
  ProviderBuyFeatureBrowserEnum,
} from '@consensys/on-ramp-sdk/dist/API';
import CustomActionButtonComponent from '../components/CustomActionButton';
import { useRampSDK } from '../sdk';
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
    isBuy,
    sdk,
  } = useRampSDK();

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

      const payload = {
        region: selectedRegion?.id as string,
        payment_method_id: selectedPaymentMethodId as string,
      };

      if (isBuy) {
        trackEvent('ONRAMP_DIRECT_PROVIDER_CLICKED', {
          ...payload,
          currency_source: fiatSymbol,
          currency_destination: selectedAsset?.symbol as string,
          provider_onramp: provider.provider.name,
          chain_id_destination: selectedChainId as string,
        });
      } else {
        trackEvent('OFFRAMP_DIRECT_PROVIDER_CLICKED', {
          ...payload,
          currency_destination: fiatSymbol,
          currency_source: selectedAsset?.symbol as string,
          provider_offramp: provider.provider.name,
          chain_id_source: selectedChainId as string,
        });
      }

      const getUrlMethod = isBuy ? 'getBuyUrl' : 'getSellUrl';

      const buyAction = await sdk[getUrlMethod](
        provider.provider,
        selectedRegion?.id as string,
        selectedPaymentMethodId as string,
        selectedAsset?.id as string,
        selectedFiatCurrencyId as string,
        amount,
        selectedAddress as string,
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
    isBuy,
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
      customActionButton={
        isBuy ? customAction.buyButton : customAction.sellButton
      }
      onPress={handleCustomAction}
      isLoading={isLoading}
      disabled={disabled || isLoading}
      {...props}
    />
  );
};

export default CustomActionButton;
