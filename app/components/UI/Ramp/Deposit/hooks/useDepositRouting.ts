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
import { useDepositSDK } from '../sdk';

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
  const { selectedRegion } = useDepositSDK();

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

  const [{ error: purposeError }, submitPurposeOfUsage] = useDepositSdkMethod({
    method: 'submitPurposeOfUsageForm',
    onMount: false,
  });

  const handleApprovedKycFlow = useCallback(
    async (quote: BuyQuote) => {
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
        return true;
      }

      navigation.navigate(...createKycProcessingNavDetails({ quote }));
      return false;
    },
    [
      fetchUserDetails,
      userDetailsFetchError,
      paymentMethodId,
      createReservation,
      reservationError,
      createOrder,
      orderError,
      selectedWalletAddress,
      handleNewOrder,
      navigation,
      cryptoCurrencyChainId,
    ],
  );

  const routeAfterAuthentication = useCallback(
    async (quote: BuyQuote) => {
      const forms = await fetchKycForms(quote);

      if (kycFormsFetchError) {
        throw new Error(strings('deposit.buildQuote.unexpectedError'));
      }

      const { forms: requiredForms } = forms || {};

      if (requiredForms?.length === 0) {
        await handleApprovedKycFlow(quote);
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

      const ssnKycForm = requiredForms?.find((form) => form.id === 'usSSN');

      const purposeOfUsageKycForm = requiredForms?.find(
        (form) => form.id === 'purposeOfUsage',
      );

      // Handle Purpose of Usage form if it's the only remaining form
      if (purposeOfUsageKycForm && requiredForms?.length === 1) {
        try {
          await submitPurposeOfUsage(['Buying/selling crypto for investments']);

          if (purposeError) {
            throw new Error(strings('deposit.buildQuote.unexpectedError'));
          }

          // After successful purpose of usage submission, check forms again
          const updatedForms = await fetchKycForms(quote);

          if (kycFormsFetchError) {
            throw new Error(strings('deposit.buildQuote.unexpectedError'));
          }

          const { forms: updatedRequiredForms } = updatedForms || {};

          if (updatedRequiredForms?.length === 0) {
            await handleApprovedKycFlow(quote);
            return;
          }
        } catch (error) {
          throw new Error(strings('deposit.buildQuote.unexpectedError'));
        }
      }

      const idProofData = idProofKycForm
        ? await fetchKycFormData(quote, idProofKycForm)
        : null;

      if (kycFormFetchError) {
        throw new Error(strings('deposit.buildQuote.unexpectedError'));
      }

      // Navigate to BasicInfo if personal details, address, or SSN forms are required
      const shouldShowSsnForm = ssnKycForm && selectedRegion?.isoCode === 'US';
      if (personalDetailsKycForm || addressKycForm || shouldShowSsnForm) {
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
      handleApprovedKycFlow,
      fetchKycFormData,
      kycFormFetchError,
      submitPurposeOfUsage,
      purposeError,
      selectedRegion,
      navigation,
    ],
  );

  return {
    routeAfterAuthentication,
  };
};
