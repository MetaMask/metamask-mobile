import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { RootParamList } from '../../../../../util/navigation/types';
import { BuyQuote, OrderIdTransformer } from '@consensys/native-ramps-sdk';
import type { AxiosError } from 'axios';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import { endTrace, TraceName } from '../../../../../util/trace';

import { useDepositSdkMethod } from './useDepositSdkMethod';
import { REDIRECTION_URL } from '../constants';
import { depositOrderToFiatOrder } from '../orderProcessor';
import useHandleNewOrder from './useHandleNewOrder';
import { generateThemeParameters } from '../utils';

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
import { useDepositUser } from './useDepositUser';
import { useDepositOrderNetworkName } from './useDepositOrderNetworkName';

class LimitExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LimitExceededError';
  }
}

interface UseDepositRoutingConfig {
  screenLocation: string;
}

export const useDepositRouting = (config?: UseDepositRoutingConfig) => {
  const { screenLocation = '' } = config || {};
  const navigation = useNavigation();
  const handleNewOrder = useHandleNewOrder();
  const {
    selectedRegion,
    selectedPaymentMethod,
    logoutFromProvider,
    selectedWalletAddress,
  } = useDepositSDK();
  const { themeAppearance, colors } = useTheme();
  const trackEvent = useAnalytics();

  const getDepositOrderNetworkName = useDepositOrderNetworkName();

  const { fetchUserDetails } = useDepositUser({
    screenLocation,
    shouldTrackFetch: true,
    fetchOnMount: false,
  });

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

  const [, getUserLimits] = useDepositSdkMethod({
    method: 'getUserLimits',
    onMount: false,
    throws: true,
  });

  const popToBuildQuote = useCallback(() => {
    navigation.dispatch((state) => {
      const buildQuoteIndex = state.routes.findIndex(
        (route) => route.name === 'BuildQuote',
      );

      if (buildQuoteIndex === -1) {
        return state;
      }

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

  const checkUserLimits = useCallback(
    async (quote: BuyQuote, kycType: string) => {
      try {
        const userLimits = await getUserLimits(
          selectedRegion?.currency || '',
          selectedPaymentMethod?.id || '',
          kycType,
        );

        if (!userLimits?.remaining) {
          return;
        }

        const { remaining } = userLimits;
        const dailyLimit = remaining['1'];
        const monthlyLimit = remaining['30'];
        const yearlyLimit = remaining['365'];

        if (
          dailyLimit === undefined ||
          monthlyLimit === undefined ||
          yearlyLimit === undefined
        ) {
          return;
        }

        const depositAmount = quote.fiatAmount;
        const currency = selectedRegion?.currency || '';

        if (depositAmount > dailyLimit) {
          throw new LimitExceededError(
            strings('deposit.buildQuote.limitExceeded', {
              period: 'daily',
              remaining: `${dailyLimit} ${currency}`,
            }),
          );
        }

        if (depositAmount > monthlyLimit) {
          throw new LimitExceededError(
            strings('deposit.buildQuote.limitExceeded', {
              period: 'monthly',
              remaining: `${monthlyLimit} ${currency}`,
            }),
          );
        }

        if (depositAmount > yearlyLimit) {
          throw new LimitExceededError(
            strings('deposit.buildQuote.limitExceeded', {
              period: 'yearly',
              remaining: `${yearlyLimit} ${currency}`,
            }),
          );
        }
      } catch (error) {
        if (error instanceof LimitExceededError) {
          throw error;
        }

        Logger.error(error as Error, 'Failed to check user limits');
      }
    },
    [getUserLimits, selectedRegion?.currency, selectedPaymentMethod?.id],
  );

  const navigateToVerifyIdentityCallback = useCallback(
    ({ quote }: { quote: BuyQuote }) => {
      popToBuildQuote();
      navigation.navigate(
        ...createVerifyIdentityNavDetails({
          quote,
        }),
      );
    },
    [navigation, popToBuildQuote],
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
        routes: [{ name: name as keyof RootParamList, params }],
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

              const processedOrder = {
                ...depositOrderToFiatOrder(order),
                account: selectedWalletAddress || order.walletAddress,
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
                payment_method_id: order.paymentMethod.id,
                country: selectedRegion?.isoCode || '',
                chain_id: order.network?.chainId || '',
                currency_destination: order.cryptoCurrency.assetId || '',
                currency_destination_symbol: order.cryptoCurrency.symbol,
                currency_destination_network: getDepositOrderNetworkName(order),
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
      getDepositOrderNetworkName,
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
        }),
      );
    },
    [navigation, popToBuildQuote],
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

              await checkUserLimits(quote, requirements.kycType);

              if (selectedPaymentMethod?.isManualBankTransfer) {
                const order = await createOrder(
                  quote,
                  selectedWalletAddress,
                  selectedPaymentMethod.id,
                );

                if (!order) {
                  throw new Error('Missing order');
                }

                const processedOrder = {
                  ...depositOrderToFiatOrder(order),
                  account: selectedWalletAddress || order.walletAddress,
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

              trackEvent('RAMPS_KYC_STARTED', {
                ramp_type: 'DEPOSIT',
                kyc_type: 'STANDARD',
                region: selectedRegion?.isoCode || '',
              });

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

          case 'SUBMITTED': {
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
      selectedPaymentMethod?.isManualBankTransfer,
      selectedPaymentMethod?.id,
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
      checkUserLimits,
      selectedWalletAddress,
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
