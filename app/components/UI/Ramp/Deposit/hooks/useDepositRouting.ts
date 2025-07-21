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
import useAnalytics from '../../hooks/useAnalytics';
import { createAdditionalVerificationNavDetails } from '../Views/AdditionalVerification/AdditionalVerification';

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
  const trackEvent = useAnalytics();

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
    ({ quote }: { quote: BuyQuote }) => {
      popToBuildQuote();
      navigation.navigate(...createBasicInfoNavDetails({ quote }));
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

  const navigateToAdditionalVerificationCallback = useCallback(
    ({ quote, kycUrl }: { quote: BuyQuote; kycUrl: string }) => {
      popToBuildQuote();
      navigation.navigate(
        ...createAdditionalVerificationNavDetails({
          quote,
          kycUrl,
          cryptoCurrencyChainId,
          paymentMethodId,
        }),
      );
    },
    [navigation, popToBuildQuote, cryptoCurrencyChainId, paymentMethodId],
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

              trackEvent('RAMPS_TRANSACTION_CONFIRMED', {
                ramp_type: 'DEPOSIT',
                amount_source: Number(order.fiatAmount),
                amount_destination: Number(order.cryptoAmount),
                exchange_rate: Number(order.exchangeRate),
                gas_fee: order.networkFees ? Number(order.networkFees) : 0,
                processing_fee: order.partnerFees
                  ? Number(order.partnerFees)
                  : 0,
                total_fee: Number(order.totalFeesFiat),
                payment_method_id: order.paymentMethod,
                country: selectedRegion?.isoCode || '',
                chain_id: cryptoCurrency?.chainId || '',
                currency_destination:
                  selectedWalletAddress || order.walletAddress,
                currency_source: order.fiatCurrency,
              });

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
      selectedRegion?.isoCode,
      trackEvent,
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

  const navigateToKycProcessingCallback = useCallback(
    ({ quote }: { quote: BuyQuote }) => {
      popToBuildQuote();
      navigation.navigate(...createKycProcessingNavDetails({ quote }));
    },
    [navigation, popToBuildQuote],
  );

  const navigateToKycWebviewCallback = useCallback(
    ({
      quote,
      kycUrl,
      cryptoCurrencyChainId: chainId,
      paymentMethodId: methodId,
    }: {
      quote: BuyQuote;
      kycUrl: string;
      cryptoCurrencyChainId: string;
      paymentMethodId: string;
    }) => {
      popToBuildQuote();
      navigation.navigate(
        ...createKycWebviewModalNavigationDetails({
          quote,
          sourceUrl: kycUrl,
          cryptoCurrencyChainId: chainId,
          paymentMethodId: methodId,
        }),
      );
    },
    [navigation, popToBuildQuote],
  );

  const routeAfterAuthentication = useCallback(
    async (quote: BuyQuote) => {
      try {
        // Forms are the source of truth for the KYC flow.
        // They are requested as a batch of smaller object that represent kyc steps that need to be completed
        // each form can be fetched individually for more details

        // This function is meant to be called in repitition for each step in the KYC flow

        // Required forms in order are:

        // Basic Info (personalDetails)
        // Address
        // SSN (usSSN) - only if the user is in the US
        // ID Proof (idProof)
        // Purpose of Usage (purposeOfUsage)

        // 1. Fetch the bactched forms and work backwards
        const forms = await fetchKycForms(quote);
        const { forms: requiredForms } = forms || {};

        // 2. If there are no forms, we can assume that all KYC data has been submitted
        if (requiredForms?.length === 0) {
          try {
            // 2.1 Fetch user details to get the exact KYC status
            const userDetails = await fetchUserDetails();
            if (!userDetails) {
              throw new Error('Missing user details');
            }

            // 2.2 if it's approved, we can move the user to the next step
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

                // 2.2.1 if it's a manual bank transfer, we need to navigate to the bank details page
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

                // 2.2.2 if it's not a manual bank transfer, we need to navigate to the Transak Webview
                navigateToWebviewModalCallback({ paymentUrl });
              }
              return true;
            }

            // 2.3 if it's not approved it is probably pending, so we need to poll for the KYC status
            navigateToKycProcessingCallback({ quote });
            return false;
          } catch (error) {
            throw new Error(
              error instanceof Error && error.message
                ? error.message
                : 'Failed to process KYC flow',
            );
          }
        }

        // 3. Fetch the Purpose of Usage form only if it's the only remaining form
        // it is auto-submitted as the last step in the KYC flow, then recursive call to route again
        const purposeOfUsageKycForm = requiredForms?.find(
          (form) => form.id === 'purposeOfUsage',
        );
        if (purposeOfUsageKycForm && requiredForms?.length === 1) {
          await submitPurposeOfUsage(['Buying/selling crypto for investments']);
          await routeAfterAuthentication(quote);
          return;
        }

        // 4. Fetch the ID Proof form only if it's the only remaining form
        // this is the final step in the Standard user KYC flow, so we don't need to fetch the url until they are ready to visit KYC webview
        const idProofKycForm = requiredForms?.find(
          (form) => form.id === 'idProof',
        );
        if (idProofKycForm && requiredForms?.length === 1) {
          const idProofData = await fetchKycFormData(quote, idProofKycForm);

          if (idProofData?.data?.kycUrl) {
            navigateToAdditionalVerificationCallback({
              quote,
              kycUrl: idProofData.data.kycUrl,
            });
            return;
          }

          throw new Error(strings('deposit.buildQuote.unexpectedError'));
        }

        // 5. Send user to BasicInfo Form if mis Personal Details, Address, and SSN forms
        const personalDetailsKycForm = requiredForms?.find(
          (form) => form.id === 'personalDetails',
        );
        const addressKycForm = requiredForms?.find(
          (form) => form.id === 'address',
        );
        const ssnKycForm = requiredForms?.find((form) => form.id === 'usSSN');
        const shouldShowSsnForm =
          ssnKycForm && selectedRegion?.isoCode === 'US';

        if (personalDetailsKycForm || addressKycForm || shouldShowSsnForm) {
          trackEvent('RAMPS_KYC_STARTED', {
            ramp_type: 'DEPOSIT',
            kyc_type: forms?.kycType || '',
            region: selectedRegion?.isoCode || '',
          });

          navigateToBasicInfoCallback({ quote });
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
      fetchUserDetails,
      selectedRegion?.isoCode,
      handleNewOrder,
      navigateToBankDetailsCallback,
      navigateToWebviewModalCallback,
      navigateToKycProcessingCallback,
      submitPurposeOfUsage,
      clearAuthToken,
      navigateToEnterEmailCallback,
      navigateToBasicInfoCallback,
      trackEvent,
      navigateToAdditionalVerificationCallback,
      createReservation,
      createOrder,
      requestOtt,
      generatePaymentUrl,
      selectedWalletAddress,
      cryptoCurrencyChainId,
      paymentMethodId,
      themeAppearance,
      colors,
    ],
  );

  return {
    routeAfterAuthentication,

    // needed for direct route from Additional Verification Page
    navigateToKycWebview: navigateToKycWebviewCallback,

    // needed for direct route from BQ to Verify Identity starter page, then to Enter Email page before the user logs in
    navigateToVerifyIdentity: navigateToVerifyIdentityCallback,
    navigateToEnterEmail: navigateToEnterEmailCallback,
  };
};
