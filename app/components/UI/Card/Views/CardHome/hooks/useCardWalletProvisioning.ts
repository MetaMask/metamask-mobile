import { useContext, useMemo } from 'react';
import { useTheme } from '../../../../../../util/theme';
import { strings } from '../../../../../../../locales/i18n';
import { IconName } from '../../../../../../component-library/components/Icons/Icon';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../../component-library/components/Toast';
import {
  usePushProvisioning,
  getWalletName,
  type ProvisioningError,
} from '../../../pushProvisioning';
import { buildProvisioningUserAddress } from '../../../util/buildUserAddress';
import type { CardHomeData } from '../../../../../../core/Engine/controllers/card-controller/provider-types';

export function useCardWalletProvisioning(
  data: CardHomeData | null | undefined,
) {
  const theme = useTheme();
  const { toastRef } = useContext(ToastContext);
  const walletProvisioning = data?.walletProvisioning ?? null;

  const userAddressForProvisioning = useMemo(() => {
    const addr = data?.account?.shippingAddress;
    if (!addr || !walletProvisioning) {
      return undefined;
    }
    return buildProvisioningUserAddress(
      {
        addressLine1: addr.line1,
        addressLine2: addr.line2 ?? null,
        city: addr.city,
        usState: addr.state ?? null,
        zip: addr.postalCode,
        phoneNumber: null,
        phoneCountryCode: null,
      },
      walletProvisioning.cardholderName,
    );
  }, [data?.account?.shippingAddress, walletProvisioning]);

  const {
    initiateProvisioning,
    isProvisioning,
    isLoading,
    canAddToWallet,
    isCardInWallet,
  } = usePushProvisioning({
    cardId: data?.card?.id,
    walletProvisioning,
    userAddress: userAddressForProvisioning,
    onSuccess: () => {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          {
            label: strings('card.push_provisioning.success_message', {
              walletName: getWalletName(),
            }),
          },
        ],
        iconName: IconName.Confirmation,
        iconColor: theme.colors.success.default,
        hasNoTimeout: false,
      });
    },
    onError: (provisioningError: ProvisioningError) => {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          {
            label:
              provisioningError.message ||
              strings('card.push_provisioning.error_unknown'),
          },
        ],
        iconName: IconName.Danger,
        iconColor: theme.colors.error.default,
        hasNoTimeout: false,
      });
    },
  });

  return {
    initiateProvisioning,
    isProvisioning,
    isLoading,
    canAddToWallet,
    isCardInWallet,
  };
}
