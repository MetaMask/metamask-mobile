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
  REDIRECTION_URL,
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

  const [, getKycRequirement] = useDepositSdkMethod({
    method: 'getKycRequirement',
    onMount: false,
    throws: true,
  });

  const [, getAdditionalRequirements] = useDepositSdkMethod({
    method: 'getAdditionalRequirements',
    onMount: false,
    throws: true,
  });

  const [, fetchUserDetails] = useDepositSdkMethod({
    method: 'getUserDetails',
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
      workFlowRunId,
    }: {
      quote: BuyQuote;
      kycUrl: string;
      workFlowRunId: string;
    }) => {
      popToBuildQuote();
      navigation.navigate(
        ...createAdditionalVerificationNavDetails({
          quote,
          kycUrl,
          workFlowRunId,
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
      workFlowRunId,
    }: {
      quote: BuyQuote;
      kycUrl: string;
      workFlowRunId: string;
    }) => {
      popToBuildQuote();
      navigation.navigate(
        ...createKycWebviewModalNavigationDetails({
          quote,
          sourceUrl: kycUrl,
          workFlowRunId,
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

        const requirements = await getKycRequirement(quote.quoteId);

        if (!requirements) {
          throw new Error('Missing KYC requirements');
        }

        switch (requirements.status) {
          case 'APPROVED': {
            try {
              if (!userDetails) {
                throw new Error('Missing user details');
              }

              const isManualBankTransfer =
                MANUAL_BANK_TRANSFER_PAYMENT_METHODS.some(
                  (method) => method.id === paymentMethodId,
                );

              if (isManualBankTransfer) {
                const order = await createOrder(
                  quote,
                  selectedWalletAddress,
                  paymentMethodId,
                );

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
                  ottResponse.ott,
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
            } catch (error) {
              throw new Error(
                error instanceof Error && error.message
                  ? error.message
                  : 'Failed to process KYC flow',
              );
            }
          }

          case 'NOT_SUBMITTED':
            trackEvent('RAMPS_KYC_STARTED', {
              ramp_type: 'DEPOSIT',
              kyc_type: requirements.kycType || '',
              region: selectedRegion?.isoCode || '',
            });

            navigateToBasicInfoCallback({ quote, previousFormData });
            return;

          case 'ADDITIONAL_FORMS_REQUIRED': {
            const additionalRequirements = await getAdditionalRequirements(
              quote.quoteId,
            );
            const formsRequired = additionalRequirements?.formsRequired || [];

            const purposeOfUsageForm = formsRequired.find(
              (f) => f.type === 'PURPOSE_OF_USAGE',
            );

            if (purposeOfUsageForm) {
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
            const idProofForm = formsRequired.find((f) => f.type === 'IDPROOF');

            if (idProofForm) {
              const { metadata } = idProofForm;
              if (!metadata) {
                throw new Error('Missing ID proof metadata');
              }

              navigateToAdditionalVerificationCallback({
                quote,
                kycUrl: metadata.kycUrl,
                workFlowRunId: metadata.workFlowRunId,
              });
              return;
            }

            // If no additional forms are required, route to KYC processing
            navigateToKycProcessingCallback({ quote });
            return;
          }

          default:
            throw new Error(strings('deposit.buildQuote.unexpectedError'));
        }
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
      getKycRequirement,
      getAdditionalRequirements,
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
