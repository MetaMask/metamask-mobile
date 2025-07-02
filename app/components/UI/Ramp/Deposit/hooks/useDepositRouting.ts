import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { BuyQuote } from '@consensys/native-ramps-sdk';
import { strings } from '../../../../../../locales/i18n';

import { useDepositSdkMethod } from './useDepositSdkMethod';
import { KycStatus } from './useUserDetailsPolling';
import { SEPA_PAYMENT_METHOD } from '../constants';
import { depositOrderToFiatOrder } from '../orderProcessor';
import useHandleNewOrder from './useHandleNewOrder';

import { createKycProcessingNavDetails } from '../Views/KycProcessing/KycProcessing';
import { createProviderWebviewNavDetails } from '../Views/ProviderWebview/ProviderWebview';
import { createBasicInfoNavDetails } from '../Views/BasicInfo/BasicInfo';
import { createKycWebviewNavDetails } from '../Views/KycWebview/KycWebview';
import { createBankDetailsNavDetails } from '../Views/BankDetails/BankDetails';

export interface UseDepositRoutingParams {
  selectedWalletAddress?: string;
  cryptoCurrencyChainId: string;
  paymentMethodId: string;
}

export const useDepositRouting = ({
  selectedWalletAddress,
  cryptoCurrencyChainId,
  paymentMethodId,
}: UseDepositRoutingParams) => {
  const navigation = useNavigation();
  const handleNewOrder = useHandleNewOrder();

  const [{ error: kycFormsFetchError }, fetchKycForms] = useDepositSdkMethod({
    method: 'getKYCForms',
    onMount: false,
  });

  const [{ error: kycFormFetchError }, fetchKycFormData] = useDepositSdkMethod({
    method: 'getKycForm',
    onMount: false,
  });

  const [{ error: userDetailsFetchError }, fetchUserDetails] =
    useDepositSdkMethod({
      method: 'getUserDetails',
      onMount: false,
    });

  const [{ error: reservationError }, createReservation] = useDepositSdkMethod({
    method: 'walletReserve',
    onMount: false,
  });

  const [{ error: orderError }, createOrder] = useDepositSdkMethod({
    method: 'createOrder',
    onMount: false,
  });

  const routeAfterAuthentication = useCallback(
    async (quote: BuyQuote) => {
      const forms = await fetchKycForms(quote);

      if (kycFormsFetchError) {
        throw new Error(strings('deposit.buildQuote.unexpectedError'));
      }

      const { forms: requiredForms } = forms || {};

      if (requiredForms?.length === 0) {
        const userDetails = await fetchUserDetails();

        if (userDetailsFetchError) {
          throw new Error(strings('deposit.buildQuote.unexpectedError'));
        }

        if (userDetails?.kyc?.l1?.status === KycStatus.APPROVED) {
          if (paymentMethodId === SEPA_PAYMENT_METHOD.id) {
            const reservation = await createReservation(
              quote,
              selectedWalletAddress,
            );

            if (reservationError || !reservation) {
              throw new Error(strings('deposit.buildQuote.unexpectedError'));
            }

            const order = await createOrder(reservation);

            if (orderError || !order) {
              throw new Error(strings('deposit.buildQuote.unexpectedError'));
            }

            const processedOrder = {
              ...depositOrderToFiatOrder(order),
              account: selectedWalletAddress || order.walletAddress,
              network: cryptoCurrencyChainId,
            };

            await handleNewOrder(processedOrder);

            navigation.navigate(
              ...createBankDetailsNavDetails({
                orderId: order.id,
                shouldUpdate: false,
              }),
            );
          } else {
            navigation.navigate(...createProviderWebviewNavDetails({ quote }));
          }
          return;
        }

        navigation.navigate(...createKycProcessingNavDetails({ quote }));
        return;
      }

      const personalDetailsKycForm = requiredForms?.find(
        (form) => form.id === 'personalDetails',
      );

      const addressKycForm = requiredForms?.find(
        (form) => form.id === 'address',
      );

      const idProofKycForm = requiredForms?.find(
        (form) => form.id === 'idProof',
      );

      const idProofData = idProofKycForm
        ? await fetchKycFormData(quote, idProofKycForm)
        : null;

      if (kycFormFetchError) {
        throw new Error(strings('deposit.buildQuote.unexpectedError'));
      }

      if (personalDetailsKycForm || addressKycForm) {
        navigation.navigate(
          ...createBasicInfoNavDetails({
            quote,
            kycUrl: idProofData?.data?.kycUrl,
          }),
        );
        return;
      } else if (idProofData) {
        navigation.navigate(
          ...createKycWebviewNavDetails({
            quote,
            kycUrl: idProofData.data.kycUrl,
          }),
        );
        return;
      }
      throw new Error(strings('deposit.buildQuote.unexpectedError'));
    },
    [
      fetchKycForms,
      kycFormsFetchError,
      fetchUserDetails,
      userDetailsFetchError,
      createReservation,
      reservationError,
      createOrder,
      orderError,
      selectedWalletAddress,
      handleNewOrder,
      navigation,
      cryptoCurrencyChainId,
      fetchKycFormData,
      kycFormFetchError,
      paymentMethodId,
    ],
  );

  return {
    routeAfterAuthentication,
  };
};
