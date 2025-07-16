import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { BuyQuote } from '@consensys/native-ramps-sdk';
import type { AxiosError } from 'axios';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';

import { useDepositSdkMethod } from './useDepositSdkMethod';
import {
  MANUAL_BANK_TRANSFER_PAYMENT_METHODS,
  KycStatus,
  REDIRECTION_URL,
} from '../constants';
import { depositOrderToFiatOrder } from '../orderProcessor';
import useHandleNewOrder from './useHandleNewOrder';
import {
  generateThemeParameters,
  getCryptoCurrencyFromTransakId,
} from '../utils';

import { createKycProcessingNavDetails } from '../Views/KycProcessing/KycProcessing';
import { createBasicInfoNavDetails } from '../Views/BasicInfo/BasicInfo';
import { createBankDetailsNavDetails } from '../Views/BankDetails/BankDetails';
import { createEnterEmailNavDetails } from '../Views/EnterEmail/EnterEmail';
import { createWebviewModalNavigationDetails } from '../Views/Modals/WebviewModal/WebviewModal';
import { createKycWebviewModalNavigationDetails } from '../Views/Modals/WebviewModal/KycWebviewModal';
import { createOrderProcessingNavDetails } from '../Views/OrderProcessing/OrderProcessing';
import { useDepositSDK } from '../sdk';
import { createVerifyIdentityNavDetails } from '../Views/VerifyIdentity/VerifyIdentity';

export interface UseDepositRoutingParams {
  cryptoCurrencyChainId: string;
  paymentMethodId: string;
}

export const useDepositRouting = ({
  cryptoCurrencyChainId,
  paymentMethodId,
}: UseDepositRoutingParams) => {
  const navigation = useNavigation();
  const handleNewOrder = useHandleNewOrder();
  const { selectedRegion, clearAuthToken, selectedWalletAddress } =
    useDepositSDK();
  const { themeAppearance, colors } = useTheme();

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

  const [, requestOtt] = useDepositSdkMethod({
    method: 'requestOtt',
    onMount: false,
    throws: true,
  });

  const [, generatePaymentUrl] = useDepositSdkMethod({
    method: 'generatePaymentWidgetUrl',
    onMount: false,
    throws: true,
  });

  const [, getOrder] = useDepositSdkMethod({
    method: 'getOrder',
    onMount: false,
    throws: true,
  });

  const popToBuildQuote = useCallback(() => {
    navigation.dispatch((state) => {
      const buildQuoteIndex = state.routes.findIndex(
        (route) => route.name === 'BuildQuote',
      );

      return {
        payload: {
          count: state.routes.length - buildQuoteIndex - 1,
          params: {
            animationEnabled: false,
          },
        },
        type: 'POP',
      };
    });
  }, [navigation]);

  const navigateToVerifyIdentityCallback = useCallback(
    ({ quote }: { quote: BuyQuote }) => {
      popToBuildQuote();
      navigation.navigate(
        ...createVerifyIdentityNavDetails({
          quote,
          cryptoCurrencyChainId,
          paymentMethodId,
        }),
      );
    },
    [navigation, popToBuildQuote, cryptoCurrencyChainId, paymentMethodId],
  );

  const navigateToEnterEmailCallback = useCallback(
    ({ quote }: { quote: BuyQuote }) => {
      popToBuildQuote();
      navigation.navigate(
        ...createEnterEmailNavDetails({
          quote,
          paymentMethodId,
          cryptoCurrencyChainId,
        }),
      );
    },
    [navigation, paymentMethodId, cryptoCurrencyChainId, popToBuildQuote],
  );

  const navigateToBasicInfoCallback = useCallback(
    ({ quote, kycUrl }: { quote: BuyQuote; kycUrl?: string }) => {
      popToBuildQuote();
      navigation.navigate(...createBasicInfoNavDetails({ quote, kycUrl }));
    },
    [navigation, popToBuildQuote],
  );

  const navigateToKycProcessingCallback = useCallback(
    ({ quote, kycUrl }: { quote: BuyQuote; kycUrl?: string }) => {
      popToBuildQuote();
      navigation.navigate(...createKycProcessingNavDetails({ quote, kycUrl }));
    },
    [navigation, popToBuildQuote],
  );

  const navigateToBankDetailsCallback = useCallback(
    ({
      orderId,
      shouldUpdate,
    }: {
      orderId: string;
      shouldUpdate?: boolean;
    }) => {
      popToBuildQuote();
      navigation.navigate(
        ...createBankDetailsNavDetails({ orderId, shouldUpdate }),
      );
    },
    [navigation, popToBuildQuote],
  );

  const navigateToOrderProcessingCallback = useCallback(
    ({ orderId }: { orderId: string }) => {
      popToBuildQuote();
      navigation.navigate(
        ...createOrderProcessingNavDetails({
          orderId,
        }),
      );
    },
    [navigation, popToBuildQuote],
  );

  const handleNavigationStateChange = useCallback(
    async ({ url }: { url: string }) => {
      if (url.startsWith(REDIRECTION_URL)) {
        try {
          const urlObj = new URL(url);
          const orderId = urlObj.searchParams.get('orderId');

          if (orderId) {
            try {
              const order = await getOrder(orderId, selectedWalletAddress);

              if (!order) {
                throw new Error('Missing order');
              }

              const cryptoCurrency = getCryptoCurrencyFromTransakId(
                order.cryptoCurrency,
              );
              const processedOrder = {
                ...depositOrderToFiatOrder(order),
                account: selectedWalletAddress || order.walletAddress,
                network: cryptoCurrency?.chainId || order.network,
              };

              await handleNewOrder(processedOrder);

              navigateToOrderProcessingCallback({
                orderId: order.id,
              });
            } catch (error) {
              throw new Error(
                error instanceof Error && error.message
                  ? error.message
                  : 'Failed to process order from navigation',
              );
            }
          }
        } catch (e) {
          console.error('Error extracting orderId from URL:', e);
        }
      }
    },
    [
      getOrder,
      selectedWalletAddress,
      handleNewOrder,
      navigateToOrderProcessingCallback,
    ],
  );

  const navigateToWebviewModalCallback = useCallback(
    ({ paymentUrl }: { paymentUrl: string }) => {
      popToBuildQuote();
      navigation.navigate(
        ...createWebviewModalNavigationDetails({
          sourceUrl: paymentUrl,
          handleNavigationStateChange,
        }),
      );
    },
    [navigation, popToBuildQuote, handleNavigationStateChange],
  );

  const handleApprovedKycFlow = useCallback(
    async (quote: BuyQuote) => {
      try {
        const userDetails = await fetchUserDetails();
        if (!userDetails) {
          throw new Error('Missing user details');
        }

        if (userDetails?.kyc?.l1?.status === KycStatus.APPROVED) {
          const isManualBankTransfer =
            MANUAL_BANK_TRANSFER_PAYMENT_METHODS.some(
              (method) => method.id === paymentMethodId,
            );
          if (isManualBankTransfer) {
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

            navigateToBankDetailsCallback({
              orderId: order.id,
              shouldUpdate: false,
            });
          } else {
            const ottResponse = await requestOtt();

            if (!ottResponse) {
              throw new Error('Failed to get OTT token');
            }

            const paymentUrl = await generatePaymentUrl(
              ottResponse.token,
              quote,
              selectedWalletAddress,
              { ...generateThemeParameters(themeAppearance, colors) },
            );

            if (!paymentUrl) {
              throw new Error('Failed to generate payment URL');
            }

            navigateToWebviewModalCallback({ paymentUrl });
          }
          return true;
        }

        navigateToKycProcessingCallback({ quote });
        return false;
      } catch (error) {
        throw new Error(
          error instanceof Error && error.message
            ? error.message
            : 'Failed to process KYC flow',
        );
      }
    },
    [
      fetchUserDetails,
      paymentMethodId,
      createReservation,
      createOrder,
      selectedWalletAddress,
      handleNewOrder,
      cryptoCurrencyChainId,
      requestOtt,
      generatePaymentUrl,
      navigateToKycProcessingCallback,
      navigateToBankDetailsCallback,
      navigateToWebviewModalCallback,
      themeAppearance,
      colors,
    ],
  );

  const navigateToKycWebviewCallback = useCallback(
    ({ quote, kycUrl }: { quote: BuyQuote; kycUrl: string }) => {
      popToBuildQuote();
      navigation.navigate(
        ...createKycWebviewModalNavigationDetails({ quote, sourceUrl: kycUrl }),
      );
    },
    [navigation, popToBuildQuote],
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

        // Auto submit the Purpose of Usage form if it's the only remaining form
        if (purposeOfUsageKycForm && requiredForms?.length === 1) {
          await submitPurposeOfUsage(['Buying/selling crypto for investments']);
          await routeAfterAuthentication(quote);
          return;
        }

        const idProofData = idProofKycForm
          ? await fetchKycFormData(quote, idProofKycForm)
          : null;

        const shouldShowSsnForm =
          ssnKycForm && selectedRegion?.isoCode === 'US';

        if (personalDetailsKycForm || addressKycForm || shouldShowSsnForm) {
          navigateToBasicInfoCallback({
            quote,
            kycUrl: idProofData?.data?.kycUrl,
          });
          return;
        } else if (idProofData?.data?.kycUrl) {
          // should we show a welcome screen here?
          // right now it is possible to go straight from build quote to verify identity
          // jarring UX - camera access poppup right after build quote
          navigateToKycWebviewCallback({
            quote,
            kycUrl: idProofData.data.kycUrl,
          });
          return;
        }
        throw new Error(strings('deposit.buildQuote.unexpectedError'));
      } catch (error) {
        if ((error as AxiosError).status === 401) {
          clearAuthToken();
          navigateToEnterEmailCallback({ quote });
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
      clearAuthToken,
      navigateToKycWebviewCallback,
      navigateToEnterEmailCallback,
      navigateToBasicInfoCallback,
    ],
  );

  return {
    routeAfterAuthentication,
    navigateToKycWebview: navigateToKycWebviewCallback,
    navigateToVerifyIdentity: navigateToVerifyIdentityCallback,
    navigateToBasicInfo: navigateToBasicInfoCallback,
    navigateToEnterEmail: navigateToEnterEmailCallback,
    handleApprovedKycFlow,
  };
};
