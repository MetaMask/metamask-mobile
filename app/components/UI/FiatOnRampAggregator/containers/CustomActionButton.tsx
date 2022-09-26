import React, { useCallback, useState } from 'react';
import { Linking } from 'react-native';
import { useSelector } from 'react-redux';
import { InAppBrowser } from 'react-native-inappbrowser-reborn';
import { PaymentCustomAction } from '@consensys/on-ramp-sdk/dist/API';
import { callbackBaseDeeplink, SDK, useFiatOnRampSDK } from '../sdk';
import CustomActionButtonComponent from '../components/CustomActionButton';
import { setLockTime } from '../../../../actions/settings';
import Device from '../../../../util/device';

interface Props {
  customAction: PaymentCustomAction;
  amount: number;
  disabled?: boolean;
}

const CustomActionButton: React.FC<
  Props & React.ComponentProps<typeof CustomActionButtonComponent>
> = ({ customAction, amount, disabled, ...props }: Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const lockTime = useSelector((state: any) => state.settings.lockTime);

  /**
   * Grab the current state of the SDK via the context.
   */
  const {
    selectedAddress,
    selectedPaymentMethodId,
    selectedRegion,
    selectedAsset,
    selectedFiatCurrencyId,
    sdk,
  } = useFiatOnRampSDK();

  /**
   * * Handle custom action
   */

  const handleCustomAction = useCallback(async () => {
    if (!sdk || !customAction) {
      return;
    }
    setIsLoading(true);
    const prevLockTime = lockTime;
    setLockTime(-1);

    const providerId = customAction.buy.providerId;
    const redirectUrl = `${callbackBaseDeeplink}${providerId}`;
    const provider = await sdk.getProvider(
      selectedRegion?.id as string,
      providerId,
    );

    const { url, orderId: customOrderId } = sdk.getBuyUrl(
      provider.provider,
      selectedRegion?.id as string,
      selectedPaymentMethodId as string,
      selectedAsset?.id as string,
      selectedFiatCurrencyId as string,
      amount,
      selectedAddress,
      redirectUrl,
    );

    try {
      if (await InAppBrowser.isAvailable()) {
        let result;
        if (Device.isAndroid()) {
          result = await InAppBrowser.open(url, { enableDefaultShare: false });
        } else {
          result = await InAppBrowser.openAuth(url, redirectUrl);
        }

        // eslint-disable-next-line no-console
        console.log('RESULT', result);

        if (result.type === 'success' && result.url) {
          const orders = await SDK.orders();
          const orderId = await orders.getOrderIdFromCallback(
            providerId,
            result.url,
          );
          // eslint-disable-next-line no-console
          console.log(
            `We must use add orderId ${orderId} to track the order status
            and remove customOrderId ${customOrderId} from the list of customOrderIds`,
          );
        } else {
          // eslint-disable-next-line no-console
          console.log(
            `We still track customOrderId ${customOrderId} in case the user finished
            the flow outside the app`,
          );
        }
      } else {
        //** In App browser is not available so we must use customOrderId */
        // eslint-disable-next-line no-console
        console.log(
          `We must use customOrderId ${customOrderId} to track the order status`,
        );
        Linking.openURL(url);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('error', error);
    } finally {
      setIsLoading(false);
      InAppBrowser.closeAuth();
      setLockTime(prevLockTime);
    }
  }, [
    amount,
    customAction,
    lockTime,
    sdk,
    selectedAddress,
    selectedAsset?.id,
    selectedFiatCurrencyId,
    selectedPaymentMethodId,
    selectedRegion?.id,
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
