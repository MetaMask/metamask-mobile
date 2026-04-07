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
import {
  buildProvisioningUserAddress,
  buildCardholderName,
} from '../../../util/buildUserAddress';
import type { CardHomeData } from '../../../../../../core/Engine/controllers/card-controller/provider-types';

export function useCardProvisioning(data: CardHomeData | undefined) {
  const theme = useTheme();
  const { toastRef } = useContext(ToastContext);

  const cardholderName = useMemo(() => {
    if (!data?.account?.holderName) return 'Card Holder';
    const parts = data.account.holderName.split(' ');
    return buildCardholderName({
      firstName: parts[0],
      lastName: parts.slice(1).join(' ') || undefined,
    } as never);
  }, [data?.account?.holderName]);

  const cardDetailsForProvisioning = useMemo(
    () =>
      data?.card
        ? {
            id: data.card.id,
            holderName: cardholderName,
            panLast4: data.card.lastFour,
            status: data.card.status,
          }
        : null,
    [data?.card, cardholderName],
  );

  const userAddressForProvisioning = useMemo(() => {
    const addr = data?.account?.shippingAddress;
    if (!addr) return undefined;
    return buildProvisioningUserAddress(
      {
        addressLine1: addr.line1,
        addressLine2: addr.line2 ?? null,
        city: addr.city,
        usState: addr.state ?? null,
        zip: addr.postalCode,
        phoneNumber: null,
        phoneCountryCode: null,
      } as never,
      cardholderName,
    );
  }, [data?.account?.shippingAddress, cardholderName]);

  const { initiateProvisioning, isProvisioning, canAddToWallet } =
    usePushProvisioning({
      cardDetails: cardDetailsForProvisioning,
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
          backgroundColor: theme.colors.error.muted,
          hasNoTimeout: false,
        });
      },
    });

  return { initiateProvisioning, isProvisioning, canAddToWallet };
}
