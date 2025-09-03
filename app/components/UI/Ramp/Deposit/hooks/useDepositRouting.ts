import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { BuyQuote, OrderIdTransformer } from '@consensys/native-ramps-sdk';
import type { AxiosError } from 'axios';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import { endTrace, TraceName } from '../../../../../util/trace';

import { useDepositSdkMethod } from './useDepositSdkMethod';
import {
  MANUAL_BANK_TRANSFER_PAYMENT_METHODS,
  KycStatus,
  REDIRECTION_URL,
  TransakFormId,
} from '../constants';
import { depositOrderToFiatOrder } from '../orderProcessor';
import useHandleNewOrder from './useHandleNewOrder';
import {
  generateThemeParameters,
  getCryptoCurrencyFromTransakId,
} from '../utils';

import { createKycProcessingNavDetails } from '../Views/KycProcessing/KycProcessing';
import {
  BasicInfoFormData,
  createBasicInfoNavDetails,
} from '../Views/BasicInfo/BasicInfo';
import { createBankDetailsNavDetails } from '../Views/BankDetails/BankDetails';
import { createWebviewModalNavigationDetails } from '../Views/Modals/WebviewModal/WebviewModal';
import { createKycWebviewModalNavigationDetails } from '../Views/Modals/WebviewModal/KycWebviewModal';
import { createOrderProcessingNavDetails } from '../Views/OrderProcessing/OrderProcessing';
import { useDepositSDK, DEPOSIT_ENVIRONMENT } from '../sdk';
import { createVerifyIdentityNavDetails } from '../Views/VerifyIdentity/VerifyIdentity';
import useAnalytics from '../../hooks/useAnalytics';
import { createAdditionalVerificationNavDetails } from '../Views/AdditionalVerification/AdditionalVerification';
import Logger from '../../../../../../app/util/Logger';
import { AddressFormData } from '../Views/EnterAddress/EnterAddress';
import { createEnterEmailNavDetails } from '../Views/EnterEmail/EnterEmail';
import Routes from '../../../../../constants/navigation/Routes';

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
  const { selectedRegion, logoutFromProvider, selectedWalletAddress } =
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

  const navigateToBasicInfoCallback = useCallback(
    ({
      quote,
      previousFormData,
    }: {
      quote: BuyQuote;
      previousFormData?: BasicInfoFormData & AddressFormData;
    }) => {
      popToBuildQuote();
      navigation.navigate(
        ...createBasicInfoNavDetails({ quote, previousFormData }),
      );
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
      const [name, params] = createBankDetailsNavDetails({
        orderId,
        shouldUpdate,
      });
      navigation.reset({
        index: 0,
        routes: [{ name, params }],
      });
    },
    [navigation],
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
    ({
      quote,
      kycUrl,
      kycWorkflowRunId,
    }: {
      quote: BuyQuote;
      kycUrl: string;
      kycWorkflowRunId: string;
    }) => {
      popToBuildQuote();
      navigation.navigate(
        ...createAdditionalVerificationNavDetails({
          quote,
          kycUrl,
          kycWorkflowRunId,
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
              const transformedOrderId =
                OrderIdTransformer.transakOrderIdToDepositOrderId(
                  orderId,
                  DEPOSIT_ENVIRONMENT,
                );

              navigateToOrderProcessingCallback({
                orderId: transformedOrderId,
              });

              const order = await getOrder(orderId, selectedWalletAddress);

              if (!order) {
                throw new Error('Missing order');
              }

              const cryptoCurrency = getCryptoCurrencyFromTransakId(
                order.cryptoCurrency,
                order.network,
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
                currency_destination: cryptoCurrency?.assetId || '',
                currency_source: order.fiatCurrency,
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
      endTrace({
        name: TraceName.DepositContinueFlow,
        data: {
          destination: Routes.DEPOSIT.MODALS.WEBVIEW,
          isPaymentWebview: true,
        },
      });

      endTrace({
        name: TraceName.DepositInputOtp,
        data: {
          destination: Routes.DEPOSIT.MODALS.WEBVIEW,
        },
      });

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
      kycWorkflowRunId,
    }: {
      quote: BuyQuote;
      kycUrl: string;
      kycWorkflowRunId: string;
    }) => {
      popToBuildQuote();
      navigation.navigate(
        ...createKycWebviewModalNavigationDetails({
          quote,
          sourceUrl: kycUrl,
          kycWorkflowRunId,
          cryptoCurrencyChainId,
          paymentMethodId,
        }),
      );
    },
    [navigation, popToBuildQuote, cryptoCurrencyChainId, paymentMethodId],
  );

  const routeAfterAuthentication = useCallback(
    async (quote: BuyQuote, depth = 0) => {
      try {
        const userDetails = await fetchUserDetails();
        const previousFormData = {
          firstName: userDetails?.firstName || '',
          lastName: userDetails?.lastName || '',
          mobileNumber: userDetails?.mobileNumber || '',
          dob: userDetails?.dob || '',
          addressLine1: userDetails?.address?.addressLine1 || '',
          addressLine2: userDetails?.address?.addressLine2 || '',
          city: userDetails?.address?.city || '',
          state: userDetails?.address?.state || '',
          postCode: userDetails?.address?.postCode || '',
          countryCode: userDetails?.address?.countryCode || '',
        };
        const forms = await fetchKycForms(quote);
        const { forms: requiredForms } = forms || {};

        const getForm = (formId: string) =>
          requiredForms?.find((form) => form.id === formId);

        // If there are no forms, we can assume that all KYC data has been submitted
        // check kyc status and route to approved or pending flow
        if (requiredForms?.length === 0) {
          try {
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
                  generateThemeParameters(themeAppearance, colors),
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
        }
        // auto-submit purpose of usage form and then recursive call to route again
        const purposeOfUsageForm = getForm(TransakFormId.PURPOSE_OF_USAGE);
        if (purposeOfUsageForm && purposeOfUsageForm.isSubmitted === false) {
          if (depth < 5) {
            await submitPurposeOfUsage([
              'Buying/selling crypto for investments',
            ]);
            await routeAfterAuthentication(quote, depth + 1);
          } else {
            Logger.error(
              new Error(`Submit of purpose depth exceeded: ${depth}`),
            );
          }
          return;
        }

        // if personal details or address form is not submitted, route to basic info
        // SSN is always submitted with personal details for US users, so we don't need to check for it
        const personalDetailsForm = getForm(TransakFormId.PERSONAL_DETAILS);
        const addressForm = getForm(TransakFormId.ADDRESS);
        if (
          personalDetailsForm?.isSubmitted === false ||
          addressForm?.isSubmitted === false
        ) {
          trackEvent('RAMPS_KYC_STARTED', {
            ramp_type: 'DEPOSIT',
            kyc_type: forms?.kycType || '',
            region: selectedRegion?.isoCode || '',
          });

          navigateToBasicInfoCallback({ quote, previousFormData });
          return;
        }

        // check for id proof form and route to additional verification if needed
        const idProofForm = getForm(TransakFormId.ID_PROOF);
        if (idProofForm?.isSubmitted === false) {
          const idProofData = await fetchKycFormData(quote, idProofForm);
          if (!idProofData) {
            throw new Error(strings('deposit.buildQuote.unexpectedError'));
          }
          if (idProofData?.data?.kycUrl) {
            navigateToAdditionalVerificationCallback({
              quote,
              kycUrl: idProofData.data.kycUrl,
              kycWorkflowRunId: idProofData.data.workFlowRunId,
            });
            return;
          }
        }

        throw new Error(strings('deposit.buildQuote.unexpectedError'));
      } catch (error) {
        if ((error as AxiosError).status === 401) {
          await logoutFromProvider(false);
          popToBuildQuote();
          navigation.navigate(...createEnterEmailNavDetails({}));
          return;
        }
        throw error;
      }
    },
    [
      popToBuildQuote,
      navigation,
      fetchKycForms,
      fetchKycFormData,
      fetchUserDetails,
      selectedRegion?.isoCode,
      handleNewOrder,
      navigateToBankDetailsCallback,
      navigateToWebviewModalCallback,
      navigateToKycProcessingCallback,
      submitPurposeOfUsage,
      logoutFromProvider,
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
    navigateToKycWebview: navigateToKycWebviewCallback,
    navigateToVerifyIdentity: navigateToVerifyIdentityCallback,
  };
};
