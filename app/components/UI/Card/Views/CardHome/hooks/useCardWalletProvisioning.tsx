import React, { useContext, useMemo } from 'react';
import {
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
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
import {
  CardStatus,
  type CardHomeData,
} from '../../../../../../core/Engine/controllers/card-controller/provider-types';

export type WalletEntry = 'push' | 'instructions' | 'none';

export function resolveWalletEntry({
  cardStatus,
  isEligibilityLoading,
  canAddToWallet,
  isCardInWallet,
  platformWalletSupported,
}: {
  cardStatus: CardStatus | undefined;
  isEligibilityLoading: boolean;
  canAddToWallet: boolean;
  isCardInWallet: boolean;
  platformWalletSupported: boolean;
}): WalletEntry {
  if (cardStatus !== CardStatus.ACTIVE) return 'none';
  if (canAddToWallet) return 'push';
  if (!platformWalletSupported) return 'instructions';
  if (isEligibilityLoading || isCardInWallet) return 'none';
  return 'instructions';
}

export function useCardWalletProvisioning(
  data: CardHomeData | null | undefined,
  platformWalletSupported: boolean,
) {
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
        variant: ToastVariants.Plain,
        labelOptions: [
          {
            label: strings('card.push_provisioning.success_message', {
              walletName: getWalletName(),
            }),
          },
        ],
        startAccessory: (
          <Icon
            name={IconName.Confirmation}
            color={IconColor.SuccessDefault}
            size={IconSize.Lg}
          />
        ),
        hasNoTimeout: false,
      });
    },
    onError: (provisioningError: ProvisioningError) => {
      toastRef?.current?.showToast({
        variant: ToastVariants.Plain,
        labelOptions: [
          {
            label:
              provisioningError.message ||
              strings('card.push_provisioning.error_unknown'),
          },
        ],
        startAccessory: (
          <Icon
            name={IconName.Danger}
            color={IconColor.ErrorDefault}
            size={IconSize.Lg}
          />
        ),
        hasNoTimeout: false,
      });
    },
  });

  const walletEntry = resolveWalletEntry({
    cardStatus: data?.card?.status,
    isEligibilityLoading: isLoading,
    canAddToWallet,
    isCardInWallet,
    platformWalletSupported,
  });

  return {
    initiateProvisioning,
    isProvisioning,
    isLoading,
    canAddToWallet,
    isCardInWallet,
    walletEntry,
  };
}
