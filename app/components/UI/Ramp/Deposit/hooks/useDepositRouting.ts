import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { BuyQuote } from '@consensys/native-ramps-sdk';
import type { AxiosError } from 'axios';
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
import { createEnterEmailNavDetails } from '../Views/EnterEmail/EnterEmail';
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
  const { selectedRegion, clearAuthToken } = useDepositSDK();

  const [, fetchKycForms] = useDepositSdkMethod({
    method: 'getKYCForms',
    onMount: false,
    throws: true,
  });

  const [, fetchKycFormData] = useDepositSdkMethod({
    method: 'getKycForm',
    onMount: false,
    throws: true,
  });

  const [, fetchUserDetails] = useDepositSdkMethod({
    method: 'getUserDetails',
    onMount: false,
    throws: true,
  });

  const [, createReservation] = useDepositSdkMethod({
    method: 'walletReserve',
    onMount: false,
    throws: true,
  });

  const [, createOrder] = useDepositSdkMethod({
    method: 'createOrder',
    onMount: false,
    throws: true,
  });

  const [, submitPurposeOfUsage] = useDepositSdkMethod({
    method: 'submitPurposeOfUsageForm',
    onMount: false,
    throws: true,
  });

  const handleApprovedKycFlow = useCallback(
    async (quote: BuyQuote) => {
      const userDetails = await fetchUserDetails();
      if (!userDetails) {
        throw new Error('Missing user details');
      }

      if (userDetails?.kyc?.l1?.status === KycStatus.APPROVED) {
        if (paymentMethodId === SEPA_PAYMENT_METHOD.id) {
          const reservation = await createReservation(
            quote,
            selectedWalletAddress,
          );

          if (!reservation) {
            throw new Error('Missing reservation');
          }

          const order = await createOrder(reservation);

          if (!order) {
            throw new Error('Missing order');
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
      paymentMethodId,
      createReservation,
      createOrder,
      selectedWalletAddress,
      handleNewOrder,
      navigation,
      cryptoCurrencyChainId,
    ],
  );

  const routeAfterAuthentication = useCallback(
    async (quote: BuyQuote) => {
      try {
        const forms = await fetchKycForms(quote);
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
          await submitPurposeOfUsage(['Buying/selling crypto for investments']);
          // After successful purpose of usage submission, check forms again
          await routeAfterAuthentication(quote);
          return;
        }

        const idProofData = idProofKycForm
          ? await fetchKycFormData(quote, idProofKycForm)
          : null;

        // Navigate to BasicInfo if personal details, address, or SSN forms are required
        const shouldShowSsnForm =
          ssnKycForm && selectedRegion?.isoCode === 'US';
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
      } catch (error) {
        if ((error as AxiosError).status === 401) {
          clearAuthToken();
          navigation.navigate(
            ...createEnterEmailNavDetails({
              quote,
              paymentMethodId,
              cryptoCurrencyChainId,
            }),
          );
          return;
        }
        throw error;
      }
    },
    [
      fetchKycForms,
      fetchKycFormData,
      selectedRegion?.isoCode,
      handleApprovedKycFlow,
      submitPurposeOfUsage,
      navigation,
      clearAuthToken,
      paymentMethodId,
      cryptoCurrencyChainId,
    ],
  );

  return {
    routeAfterAuthentication,
  };
};
