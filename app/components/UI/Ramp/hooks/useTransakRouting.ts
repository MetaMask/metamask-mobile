import { useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import type { CaipChainId } from '@metamask/utils';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import { type TransakBuyQuote } from '@metamask/ramps-controller';
import { REDIRECTION_URL } from '../Deposit/constants';
import { depositOrderToFiatOrder } from '../Deposit/orderProcessor';
import useHandleNewOrder from '../Deposit/hooks/useHandleNewOrder';
import { generateThemeParameters } from '../Deposit/utils';
import { BasicInfoFormData } from '../Deposit/Views/BasicInfo/BasicInfo';
import { AddressFormData } from '../Deposit/Views/EnterAddress/EnterAddress';
import { createCheckoutNavDetails } from '../Views/Checkout';
import { registerCheckoutCallback } from '../utils/checkoutCallbackRegistry';
import useAnalytics from './useAnalytics';
import Logger from '../../../../util/Logger';
import Routes from '../../../../constants/navigation/Routes';
import { useTransakController } from './useTransakController';
import { useRampsUserRegion } from './useRampsUserRegion';
import { useRampsPaymentMethods } from './useRampsPaymentMethods';
import { selectTokens } from '../../../../selectors/rampsController';
import useRampAccountAddress from './useRampAccountAddress';
import { parseUserFacingError } from '../utils/parseUserFacingError';
import type { MMPayOnRampIntent } from '../types';
import { useMMPayOnRampContext } from '../../../Views/confirmations/context/mmpay-on-ramp-context';
import {
  resolveMMPayOnRampOrderProcessingIntercept,
  returnToMMPayConfirmation,
} from '../../../Views/confirmations/utils/mmpay-on-ramp-utils';

interface RampStackParamList {
  RampVerifyIdentity: { quote: TransakBuyQuote };
  RampBasicInfo: {
    quote: TransakBuyQuote;
    previousFormData?: BasicInfoFormData & AddressFormData;
  };
  RampBankDetails: { orderId: string; shouldUpdate?: boolean };
  RampOrderProcessing: { orderId: string };
  RampAdditionalVerification: {
    quote: TransakBuyQuote;
    kycUrl: string;
    workFlowRunId: string;
  };
  RampKycProcessing: { quote: TransakBuyQuote };
  RampEnterEmail: undefined;
  Checkout: {
    url: string;
    providerName: string;
    userAgent?: string;
    callbackKey?: string;
  };
  [key: string]: object | undefined;
}

class LimitExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LimitExceededError';
  }
}

interface UseTransakRoutingConfig {
  screenLocation?: string;
}

export const useTransakRouting = (_config?: UseTransakRoutingConfig) => {
  const navigation = useNavigation<StackNavigationProp<RampStackParamList>>();
  const handleNewOrder = useHandleNewOrder();
  const { themeAppearance, colors } = useTheme();
  const trackEvent = useAnalytics();
  const processingOrderIdRef = useRef<string | null>(null);
  const { mmPayOnRamp } = useMMPayOnRampContext();

  const {
    logoutFromProvider,
    getUserDetails,
    getKycRequirement,
    getAdditionalRequirements,
    createOrder: transakCreateOrder,
    getOrder,
    getUserLimits,
    requestOtt,
    generatePaymentWidgetUrl,
    submitPurposeOfUsageForm,
  } = useTransakController();

  const { userRegion } = useRampsUserRegion();
  const { selectedPaymentMethod } = useRampsPaymentMethods();

  const { selected: selectedToken } = useSelector(selectTokens);
  const walletAddress = useRampAccountAddress(
    selectedToken?.chainId as CaipChainId,
  );

  const fiatCurrency = userRegion?.country?.currency || '';
  const regionIsoCode = userRegion?.regionCode || '';

  const checkUserLimits = useCallback(
    async (quote: TransakBuyQuote, kycType: string) => {
      try {
        const userLimits = await getUserLimits(
          fiatCurrency,
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

        if (depositAmount > dailyLimit) {
          throw new LimitExceededError(
            strings('deposit.buildQuote.limitExceeded', {
              period: 'daily',
              remaining: `${dailyLimit} ${fiatCurrency}`,
            }),
          );
        }

        if (depositAmount > monthlyLimit) {
          throw new LimitExceededError(
            strings('deposit.buildQuote.limitExceeded', {
              period: 'monthly',
              remaining: `${monthlyLimit} ${fiatCurrency}`,
            }),
          );
        }

        if (depositAmount > yearlyLimit) {
          throw new LimitExceededError(
            strings('deposit.buildQuote.limitExceeded', {
              period: 'yearly',
              remaining: `${yearlyLimit} ${fiatCurrency}`,
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
    [getUserLimits, fiatCurrency, selectedPaymentMethod?.id],
  );

  const navigateToVerifyIdentityCallback = useCallback(
    ({ quote }: { quote: TransakBuyQuote }) => {
      navigation.reset({
        index: 1,
        routes: [
          { name: Routes.RAMP.AMOUNT_INPUT },
          { name: Routes.RAMP.VERIFY_IDENTITY, params: { quote } },
        ],
      });
    },
    [navigation],
  );

  const navigateToBasicInfoCallback = useCallback(
    ({
      quote,
      previousFormData,
    }: {
      quote: TransakBuyQuote;
      previousFormData?: BasicInfoFormData & AddressFormData;
    }) => {
      navigation.reset({
        index: 1,
        routes: [
          { name: Routes.RAMP.AMOUNT_INPUT },
          {
            name: Routes.RAMP.BASIC_INFO,
            params: { quote, previousFormData },
          },
        ],
      });
    },
    [navigation],
  );

  const navigateToBankDetailsCallback = useCallback(
    ({
      orderId,
      shouldUpdate,
    }: {
      orderId: string;
      shouldUpdate?: boolean;
    }) => {
      navigation.reset({
        index: 0,
        routes: [
          {
            name: Routes.RAMP.BANK_DETAILS,
            params: { orderId, shouldUpdate },
          },
        ],
      });
    },
    [navigation],
  );

  const navigateToOrderProcessingCallback = useCallback(
    ({
      orderId,
      mmPayOnRamp: mmPayOnRampIntent,
    }: {
      orderId: string;
      mmPayOnRamp?: MMPayOnRampIntent;
    }) => {
      if (mmPayOnRampIntent) {
        returnToMMPayConfirmation(navigation);
        return;
      }

      navigation.reset({
        index: 0,
        routes: [
          {
            name: Routes.RAMP.RAMPS_ORDER_DETAILS,
            params: { orderId, showCloseButton: true },
          },
        ],
      });
    },
    [navigation],
  );

  const navigateToAdditionalVerificationCallback = useCallback(
    ({
      quote,
      kycUrl,
      workFlowRunId,
    }: {
      quote: TransakBuyQuote;
      kycUrl: string;
      workFlowRunId: string;
    }) => {
      navigation.reset({
        index: 1,
        routes: [
          { name: Routes.RAMP.AMOUNT_INPUT },
          {
            name: Routes.RAMP.ADDITIONAL_VERIFICATION,
            params: { quote, kycUrl, workFlowRunId },
          },
        ],
      });
    },
    [navigation],
  );

  const handleNavigationStateChange = useCallback(
    async ({ url }: { url: string }) => {
      if (!url.startsWith(REDIRECTION_URL)) return;

      let orderId: string | null = null;
      try {
        const urlObj = new URL(url);
        orderId = urlObj.searchParams.get('orderId');
      } catch (e) {
        Logger.error(
          e as Error,
          'useTransakRouting: Error parsing redirect URL',
        );
        return;
      }

      if (!orderId || processingOrderIdRef.current === orderId) return;
      processingOrderIdRef.current = orderId;

      try {
        const order = await getOrder(orderId, walletAddress || '');

        if (!order) {
          throw new Error('Missing order');
        }

        // At runtime, cryptoCurrency and network may be plain strings
        // instead of the expected objects, depending on the controller version.
        const rawCryptoCurrency = order.cryptoCurrency as
          | string
          | { symbol?: string; assetId?: string };
        const cryptocurrency =
          typeof rawCryptoCurrency === 'string'
            ? rawCryptoCurrency
            : rawCryptoCurrency?.symbol || '';

        const processedOrder = {
          ...depositOrderToFiatOrder(
            order as Parameters<typeof depositOrderToFiatOrder>[0],
          ),
          account: walletAddress || order.walletAddress,
          cryptocurrency,
          ...(mmPayOnRamp
            ? {
                mmPayTransactionId: mmPayOnRamp.mmPayTransactionId,
              }
            : {}),
        };

        await handleNewOrder(processedOrder);

        const processedOrderId = processedOrder.id;
        const { mmPayOnRamp: currentMMPayOnRamp, shouldSkip } =
          resolveMMPayOnRampOrderProcessingIntercept({
            mmPayOnRamp,
            processedOrderId,
          });

        if (shouldSkip) {
          return;
        }

        navigateToOrderProcessingCallback({
          orderId: processedOrder.id,
          mmPayOnRamp: currentMMPayOnRamp,
        });

        const rawNetwork = order.network as
          | string
          | { chainId?: string; name?: string; assetId?: string };
        trackEvent('RAMPS_TRANSACTION_CONFIRMED', {
          ramp_type: 'DEPOSIT',
          amount_source: Number(order.fiatAmount),
          amount_destination: Number(order.cryptoAmount),
          exchange_rate: Number(order.exchangeRate),
          gas_fee: order.networkFees ? Number(order.networkFees) : 0,
          processing_fee: order.partnerFees ? Number(order.partnerFees) : 0,
          total_fee: Number(order.totalFeesFiat),
          payment_method_id: order.paymentMethod.id,
          country: regionIsoCode,
          chain_id:
            typeof rawNetwork === 'string'
              ? rawNetwork
              : rawNetwork?.chainId || '',
          currency_destination:
            typeof rawCryptoCurrency === 'string'
              ? ''
              : rawCryptoCurrency?.assetId || '',
          currency_destination_symbol: cryptocurrency,
          currency_destination_network:
            typeof rawNetwork === 'string'
              ? rawNetwork
              : rawNetwork?.name || '',
          currency_source: order.fiatCurrency,
        });
      } catch (error) {
        // Reset ref so the user can retry if the redirect URL fires again
        processingOrderIdRef.current = null;
        Logger.error(error as Error, {
          message: 'useTransakRouting: Failed to process order after checkout',
        });
      }
    },
    [
      getOrder,
      walletAddress,
      handleNewOrder,
      navigateToOrderProcessingCallback,
      mmPayOnRamp,
      regionIsoCode,
      trackEvent,
    ],
  );

  const navigateToWebviewModalCallback = useCallback(
    ({ paymentUrl }: { paymentUrl: string }) => {
      const callbackKey = registerCheckoutCallback(handleNavigationStateChange);
      const [routeName, routeParams] = createCheckoutNavDetails({
        url: paymentUrl,
        providerName: 'Transak',
        callbackKey,
      });
      navigation.reset({
        index: 1,
        routes: [
          { name: Routes.RAMP.AMOUNT_INPUT },
          { name: routeName, params: routeParams },
        ],
      });
    },
    [navigation, handleNavigationStateChange],
  );

  const navigateToKycProcessingCallback = useCallback(
    ({ quote }: { quote: TransakBuyQuote }) => {
      navigation.reset({
        index: 1,
        routes: [
          { name: Routes.RAMP.AMOUNT_INPUT },
          { name: Routes.RAMP.KYC_PROCESSING, params: { quote } },
        ],
      });
    },
    [navigation],
  );

  const navigateToKycWebviewCallback = useCallback(
    ({ kycUrl }: { kycUrl: string }) => {
      const [routeName, routeParams] = createCheckoutNavDetails({
        url: kycUrl,
        providerName: 'Transak',
      });
      navigation.reset({
        index: 1,
        routes: [
          { name: Routes.RAMP.AMOUNT_INPUT },
          { name: routeName, params: routeParams },
        ],
      });
    },
    [navigation],
  );

  const routeAfterAuthentication = useCallback(
    async (quote: TransakBuyQuote, depth = 0) => {
      try {
        const userDetails = await getUserDetails();
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
                const order = await transakCreateOrder(
                  quote.quoteId,
                  walletAddress || '',
                  selectedPaymentMethod.id,
                );
                if (!order) {
                  throw new Error('Missing order');
                }

                const processedOrder = {
                  ...depositOrderToFiatOrder(
                    order as Parameters<typeof depositOrderToFiatOrder>[0],
                  ),
                  account: walletAddress || order.walletAddress,
                  ...(mmPayOnRamp?.source === 'mm_pay'
                    ? {
                        mmPayTransactionId: mmPayOnRamp.mmPayTransactionId,
                      }
                    : {}),
                };

                await handleNewOrder(processedOrder);

                navigateToBankDetailsCallback({
                  orderId: processedOrder.id,
                  shouldUpdate: false,
                });
              } else {
                const ottResponse = await requestOtt();

                if (!ottResponse) {
                  throw new Error('Failed to get OTT token');
                }

                const paymentUrl = generatePaymentWidgetUrl(
                  ottResponse.ott,
                  quote,
                  walletAddress || '',
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
                parseUserFacingError(
                  error,
                  strings('deposit.buildQuote.unexpectedError'),
                ),
              );
            }
          }

          case 'NOT_SUBMITTED':
            trackEvent('RAMPS_KYC_STARTED', {
              ramp_type: 'DEPOSIT',
              kyc_type: requirements.kycType || '',
              region: regionIsoCode,
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
                await submitPurposeOfUsageForm([
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
                region: regionIsoCode,
              });

              navigateToAdditionalVerificationCallback({
                quote,
                kycUrl: metadata.kycUrl,
                workFlowRunId: metadata.workFlowRunId,
              });
              return;
            }

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
        const httpError = error as { status?: number };
        if (httpError.status === 401) {
          await logoutFromProvider(false);
          navigation.navigate(Routes.RAMP.ENTER_EMAIL);
          return;
        }
        throw error;
      }
    },
    [
      navigation,
      getKycRequirement,
      getAdditionalRequirements,
      getUserDetails,
      regionIsoCode,
      selectedPaymentMethod?.isManualBankTransfer,
      selectedPaymentMethod?.id,
      handleNewOrder,
      navigateToBankDetailsCallback,
      navigateToWebviewModalCallback,
      navigateToKycProcessingCallback,
      submitPurposeOfUsageForm,
      logoutFromProvider,
      navigateToBasicInfoCallback,
      trackEvent,
      navigateToAdditionalVerificationCallback,
      transakCreateOrder,
      requestOtt,
      generatePaymentWidgetUrl,
      checkUserLimits,
      walletAddress,
      mmPayOnRamp?.source,
      mmPayOnRamp?.mmPayTransactionId,
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
