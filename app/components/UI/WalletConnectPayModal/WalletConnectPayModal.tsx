import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  WebView,
  type WebViewNavigation,
} from '@metamask/react-native-webview';
import {
  KeyringController,
  SignTypedDataVersion,
} from '@metamask/keyring-controller';
import { AccountsController } from '@metamask/accounts-controller';

import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../component-library/components/Buttons/Button';
import ButtonIcon from '../../../component-library/components/Buttons/ButtonIcon';
import {
  IconName,
  IconColor,
} from '../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../component-library/hooks';
import { useParams } from '../../../util/navigation/navUtils';

import WC2Manager from '../../../core/WalletConnect/WalletConnectV2';
import Engine from '../../../core/Engine';
import Logger from '../../../util/Logger';

import styleSheet from './WalletConnectPayModal.styles';
import { walletConnectPayModalReducer, initialState } from './reducer';
import {
  formatAmount,
  detectErrorType,
  getErrorTitle,
  getErrorMessage,
} from './utils';
import { WalletConnectPay } from '@walletconnect/pay';
import type {
  WalletConnectPayModalParams,
  PaymentOption,
  PaymentOptionsResponse,
  Action,
} from './types';

const FIT_CONTENT_JS = `
  (function() {
    var meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'viewport';
      document.head.appendChild(meta);
    }
    meta.content = 'width=device-width, initial-scale=1, maximum-scale=1, shrink-to-fit=yes';
    document.body.style.overflow = 'hidden';
  })();
  true;
`;

function getBaseUrl(urlString: string): string {
  try {
    const urlObj = new URL(urlString);
    return `${urlObj.protocol}//${urlObj.host}`;
  } catch {
    return urlString;
  }
}

type PayClient = InstanceType<typeof WalletConnectPay>;

async function getPayClient(): Promise<PayClient | null> {
  const wc2Manager = await WC2Manager.getInstance();
  const walletKit = wc2Manager.getWalletKit();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (walletKit as any)?.pay as PayClient | null;
}

const MAX_VISIBLE_OPTIONS = 4;
const OPTION_HEIGHT = 64;
const OPTION_GAP = 8;

const WalletConnectPayModal = () => {
  const { styles, theme } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const params = useParams<WalletConnectPayModalParams>();

  const [webViewLoading, setWebViewLoading] = useState(true);

  const [state, dispatch] = useReducer(
    walletConnectPayModalReducer,
    initialState,
  );

  const [paymentData, setPaymentData] =
    React.useState<PaymentOptionsResponse | null>(null);

  const selectedOptionCollectDataUrl = (
    state.selectedOption as PaymentOption | null
  )?.collectData?.url;

  const selectedNeedsCollectData = !!(
    state.selectedOption &&
    (state.selectedOption as PaymentOption).collectData?.url &&
    !state.collectDataCompletedIds.includes(state.selectedOption.id)
  );

  useEffect(() => {
    const fetchPaymentOptions = async () => {
      try {
        const payClient = await getPayClient();

        if (!payClient) {
          dispatch({
            type: 'SET_RESULT',
            payload: {
              status: 'error',
              message: 'WalletConnect Pay is not available',
              errorType: 'generic',
            },
          });
          return;
        }

        const accountsController = Engine.context
          .AccountsController as AccountsController;
        const selectedAccount = accountsController.getSelectedAccount();
        const walletAddress = selectedAccount?.address;

        if (!walletAddress) {
          dispatch({
            type: 'SET_RESULT',
            payload: {
              status: 'error',
              message: 'No wallet address found. Please select an account.',
              errorType: 'generic',
            },
          });
          return;
        }

        const chainIds = Object.keys(
          Engine.context.NetworkController.state
            .networkConfigurationsByChainId ?? {},
        );
        const accounts = chainIds.map(
          (chainId) => `eip155:${parseInt(chainId, 16)}:${walletAddress}`,
        );

        const options = await payClient.getPaymentOptions({
          paymentLink: params.paymentUrl,
          accounts,
          includePaymentInfo: true,
        });

        setPaymentData(options);

        if (!options.options || options.options.length === 0) {
          dispatch({
            type: 'SET_RESULT',
            payload: {
              status: 'error',
              message: getErrorMessage('insufficient_funds'),
              errorType: 'insufficient_funds',
            },
          });
        } else {
          dispatch({ type: 'SET_STEP', payload: 'confirm' });
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to fetch payment options';
        Logger.error(error as Error, 'WalletConnectPayModal: fetch error');
        const errorType = detectErrorType(errorMessage);
        dispatch({
          type: 'SET_RESULT',
          payload: {
            status: 'error',
            message: getErrorMessage(errorType, errorMessage),
            errorType,
          },
        });
      }
    };

    fetchPaymentOptions();
  }, [params.paymentUrl]);

  const onClose = useCallback(() => {
    dispatch({ type: 'RESET' });
    navigation.goBack();
  }, [navigation]);

  const goBack = useCallback(() => {
    switch (state.step) {
      case 'collectData':
        dispatch({ type: 'SET_STEP', payload: 'confirm' });
        break;
      case 'confirm':
        onClose();
        break;
      default:
        onClose();
    }
  }, [state.step, onClose]);

  const fetchPaymentActions = useCallback(
    async (option: PaymentOption) => {
      try {
        const payClient = await getPayClient();

        if (!payClient || !paymentData) {
          dispatch({
            type: 'SET_ACTIONS_ERROR',
            payload: 'Pay SDK not initialized',
          });
          return;
        }

        dispatch({ type: 'SET_LOADING_ACTIONS', payload: true });
        dispatch({ type: 'SET_ACTIONS_ERROR', payload: null });

        const actions = await payClient.getRequiredPaymentActions({
          paymentId: paymentData.paymentId,
          optionId: option.id,
        });

        dispatch({
          type: 'SET_PAYMENT_ACTIONS',
          payload: actions as Action[],
        });
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to get payment actions';
        const errorType = detectErrorType(errorMessage);
        dispatch({
          type: 'SET_RESULT',
          payload: {
            status: 'error',
            message: getErrorMessage(errorType, errorMessage),
            errorType,
          },
        });
      } finally {
        dispatch({ type: 'SET_LOADING_ACTIONS', payload: false });
      }
    },
    [paymentData],
  );

  const onSelectOption = useCallback(
    (option: PaymentOption) => {
      dispatch({ type: 'SELECT_OPTION', payload: option });
      fetchPaymentActions(option);
    },
    [fetchPaymentActions],
  );

  useEffect(() => {
    if (state.step === 'confirm' && !state.selectedOption) {
      const options = paymentData?.options || [];
      if (options.length > 0) {
        onSelectOption(options[0]);
      }
    }
  }, [state.step, paymentData?.options, state.selectedOption, onSelectOption]);

  const onApprovePayment = useCallback(async () => {
    if (state.step === 'confirming') {
      return;
    }

    if (
      !state.paymentActions ||
      state.paymentActions.length === 0 ||
      !state.selectedOption ||
      !paymentData
    ) {
      return;
    }

    dispatch({ type: 'SET_STEP', payload: 'confirming' });
    dispatch({ type: 'SET_ACTIONS_ERROR', payload: null });

    try {
      const payClient = await getPayClient();

      if (!payClient) {
        throw new Error('Pay SDK not available');
      }

      const keyringController = Engine.context
        .KeyringController as KeyringController;
      const accountsController = Engine.context
        .AccountsController as AccountsController;

      const selectedAccount = accountsController.getSelectedAccount();
      const walletAddress = selectedAccount?.address;

      if (!walletAddress) {
        throw new Error('No wallet address found');
      }

      const signatures: string[] = [];

      for (const action of state.paymentActions) {
        const { walletRpc } = action;
        if (walletRpc) {
          const { method, params: rpcParams } = walletRpc;
          const parsedParams = JSON.parse(rpcParams);

          if (
            method === 'eth_signTypedData_v4' ||
            method === 'eth_signTypedData_v3' ||
            method === 'eth_signTypedData'
          ) {
            const typedData = parsedParams[1];

            const signature = await keyringController.signTypedMessage(
              {
                from: walletAddress,
                data: typedData,
              },
              SignTypedDataVersion.V4,
            );

            signatures.push(signature);
          } else {
            throw new Error(`Unsupported signature method: ${method}`);
          }
        }
      }

      const confirmResult = await payClient.confirmPayment({
        paymentId: paymentData.paymentId,
        optionId: state.selectedOption.id,
        signatures,
      });

      if (!confirmResult) {
        throw new Error('Payment confirmation failed - no response received');
      }

      if (
        confirmResult.status === 'expired' ||
        confirmResult.status === 'cancelled' ||
        confirmResult.status === 'failed'
      ) {
        const errorType =
          confirmResult.status === 'expired'
            ? 'expired'
            : confirmResult.status === 'cancelled'
              ? 'cancelled'
              : 'generic';
        dispatch({
          type: 'SET_RESULT',
          payload: {
            status: 'error',
            message: getErrorMessage(errorType),
            errorType,
          },
        });
        return;
      }

      const amount = formatAmount(
        state.selectedOption.amount.value,
        state.selectedOption.amount.display.decimals,
        2,
      );
      dispatch({
        type: 'SET_RESULT',
        payload: {
          status: 'success',
          message: `You've paid ${amount} ${state.selectedOption.amount.display.assetSymbol} to ${paymentData.info?.merchant?.name || 'the merchant'}`,
        },
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to sign payment';
      Logger.error(error as Error, 'WalletConnectPayModal: sign error');
      const errorType = detectErrorType(errorMessage);
      dispatch({
        type: 'SET_RESULT',
        payload: {
          status: 'error',
          message: getErrorMessage(errorType, errorMessage),
          errorType,
        },
      });
    }
  }, [state.step, state.paymentActions, state.selectedOption, paymentData]);

  const handleConfirmOrNext = useCallback(() => {
    if (!state.selectedOption) return;

    const option = state.selectedOption as PaymentOption;
    const needsCollectData = !!option.collectData?.url;
    const alreadyCompleted = state.collectDataCompletedIds.includes(option.id);

    if (needsCollectData && !alreadyCompleted) {
      dispatch({ type: 'SET_STEP', payload: 'collectData' });
    } else {
      onApprovePayment();
    }
  }, [state.selectedOption, state.collectDataCompletedIds, onApprovePayment]);

  // -- WebView handlers --

  const webViewFinalUrl = useMemo(() => {
    if (!selectedOptionCollectDataUrl) return '';
    return selectedOptionCollectDataUrl;
  }, [selectedOptionCollectDataUrl]);

  const webViewBaseUrl = useMemo(
    () =>
      selectedOptionCollectDataUrl
        ? getBaseUrl(selectedOptionCollectDataUrl)
        : '',
    [selectedOptionCollectDataUrl],
  );

  const handleWebViewComplete = useCallback(() => {
    if (state.selectedOption) {
      dispatch({
        type: 'MARK_COLLECT_DATA_COMPLETED',
        payload: state.selectedOption.id,
      });
    }
    dispatch({ type: 'SET_STEP', payload: 'confirm' });
  }, [state.selectedOption]);

  const handleWebViewError = useCallback((errorStr: string) => {
    const errorType = detectErrorType(errorStr);
    dispatch({
      type: 'SET_RESULT',
      payload: {
        status: 'error',
        message: getErrorMessage(errorType, errorStr),
        errorType,
      },
    });
  }, []);

  const handleWebViewMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const message = JSON.parse(event.nativeEvent.data) as {
          type: 'IC_COMPLETE' | 'IC_ERROR';
          success: boolean;
          error?: string;
        };

        if (message.type === 'IC_COMPLETE' && message.success) {
          handleWebViewComplete();
        } else if (message.type === 'IC_ERROR' || !message.success) {
          handleWebViewError(message.error || 'Form submission failed');
        }
      } catch {
        // Non-JSON message, ignore
      }
    },
    [handleWebViewComplete, handleWebViewError],
  );

  const handleShouldStartLoadWithRequest = useCallback(
    (request: { url: string }) => {
      if (request.url.startsWith('about:blank')) {
        return true;
      }

      const requestBaseUrl = getBaseUrl(request.url);
      if (requestBaseUrl !== webViewBaseUrl) {
        Linking.openURL(request.url);
        return false;
      }

      return true;
    },
    [webViewBaseUrl],
  );

  // -- Render functions --

  const renderLoading = (message: string) => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={theme.colors.primary.default} />
      <Text
        variant={TextVariant.BodyMD}
        color={TextColor.Alternative}
        style={styles.loadingText}
      >
        {message}
      </Text>
    </View>
  );

  const renderMerchantInfo = () => {
    if (!paymentData?.info) return null;

    const { merchant, amount } = paymentData.info;
    const displayAmount = amount
      ? formatAmount(amount.value, amount.display?.decimals || 0, 2)
      : null;
    const currencySymbol = amount?.display?.assetSymbol || '';

    return (
      <View style={styles.merchantContainer}>
        {merchant?.iconUrl ? (
          <Image
            source={{ uri: merchant.iconUrl }}
            style={styles.merchantIcon}
          />
        ) : (
          <View style={styles.merchantIconPlaceholder}>
            <Text variant={TextVariant.HeadingLG}>
              {merchant?.name?.charAt(0) || '?'}
            </Text>
          </View>
        )}
        {merchant?.name && displayAmount && (
          <Text variant={TextVariant.HeadingMD} style={styles.merchantPayText}>
            Pay {currencySymbol}
            {displayAmount} to {merchant.name}
          </Text>
        )}
      </View>
    );
  };

  const renderCollectDataWebView = () => {
    if (!selectedOptionCollectDataUrl) return null;

    return (
      <View style={styles.webViewContainer}>
        {webViewLoading && (
          <View style={styles.webViewLoadingOverlay}>
            <ActivityIndicator
              size="large"
              color={theme.colors.primary.default}
            />
          </View>
        )}
        <WebView
          source={{ uri: webViewFinalUrl }}
          originWhitelist={[
            'https://dev.pay.walletconnect.com',
            'https://staging.pay.walletconnect.com',
            'https://pay.walletconnect.com',
          ]}
          style={styles.webView}
          onLoadStart={() => setWebViewLoading(true)}
          onLoadEnd={() => setWebViewLoading(false)}
          onNavigationStateChange={(navState: WebViewNavigation) => {
            Logger.log(
              `WalletConnectPayModal: WebView navigation to ${navState.url}`,
            );
          }}
          onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
          onError={(syntheticEvent) => {
            const { description } = syntheticEvent.nativeEvent;
            handleWebViewError(description || 'Failed to load the form');
          }}
          onMessage={handleWebViewMessage}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          scalesPageToFit
          showsVerticalScrollIndicator={false}
          injectedJavaScript={FIT_CONTENT_JS}
        />
      </View>
    );
  };

  const renderConfirm = () => {
    const options = paymentData?.options || [];

    const selectedCompleted =
      state.selectedOption &&
      state.collectDataCompletedIds.includes(state.selectedOption.id);
    const visibleOptions = selectedCompleted
      ? options.filter((o) => o.id === state.selectedOption?.id)
      : options;

    const scrollable = visibleOptions.length > MAX_VISIBLE_OPTIONS;
    const listMaxHeight =
      MAX_VISIBLE_OPTIONS * OPTION_HEIGHT +
      (MAX_VISIBLE_OPTIONS - 1) * OPTION_GAP;

    return (
      <>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderMerchantInfo()}
          {state.actionsError && (
            <View style={styles.errorBanner}>
              <Text variant={TextVariant.BodyMD} style={styles.errorText}>
                {state.actionsError}
              </Text>
            </View>
          )}
          <ScrollView
            style={[
              styles.optionsList,
              scrollable ? { maxHeight: listMaxHeight } : undefined,
            ]}
            contentContainerStyle={styles.optionsListContent}
            showsVerticalScrollIndicator={scrollable}
            nestedScrollEnabled
          >
            {visibleOptions.map((option) => {
              const isSelected = state.selectedOption?.id === option.id;
              const amount = formatAmount(
                option.amount.value,
                option.amount.display.decimals,
                2,
              );
              const hasCollectData =
                !!(option as PaymentOption).collectData?.url &&
                !state.collectDataCompletedIds.includes(option.id);
              const networkIconUrl = option.amount.display.networkIconUrl;

              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionCard,
                    isSelected && styles.optionCardSelected,
                  ]}
                  onPress={() => onSelectOption(option)}
                >
                  <View style={styles.optionIconContainer}>
                    {option.amount.display.iconUrl && (
                      <Image
                        source={{ uri: option.amount.display.iconUrl }}
                        style={styles.optionIcon}
                      />
                    )}
                    {networkIconUrl && (
                      <Image
                        source={{ uri: networkIconUrl }}
                        style={[
                          styles.optionChainIcon,
                          {
                            borderColor: isSelected
                              ? theme.colors.primary.muted
                              : theme.colors.background.alternative,
                          },
                        ]}
                      />
                    )}
                  </View>
                  <Text
                    variant={TextVariant.BodyMD}
                    style={styles.optionTextContainer}
                  >
                    {amount} {option.amount.display.assetSymbol}
                  </Text>
                  {hasCollectData && (
                    <View style={styles.collectDataPill}>
                      <Text
                        variant={TextVariant.BodySM}
                        color={TextColor.Warning}
                      >
                        Info required
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </ScrollView>
        <View style={styles.footer}>
          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label={
              selectedNeedsCollectData
                ? 'Next'
                : `Pay ${paymentData?.info?.amount?.display?.assetSymbol || ''} ${formatAmount(paymentData?.info?.amount?.value || '0', paymentData?.info?.amount?.display?.decimals || 0, 2)}`
            }
            onPress={handleConfirmOrNext}
            disabled={
              !state.selectedOption ||
              state.isLoadingActions ||
              !state.paymentActions ||
              state.paymentActions.length === 0
            }
            loading={state.isLoadingActions}
            style={styles.primaryButton}
          />
        </View>
      </>
    );
  };

  const renderResult = () => {
    const isSuccess = state.resultStatus === 'success';
    const errorType = state.resultErrorType;
    const title = isSuccess
      ? state.resultMessage
      : errorType
        ? getErrorTitle(errorType)
        : state.resultMessage;

    return (
      <View style={styles.resultContainer}>
        <View style={styles.resultIcon}>
          <Text variant={TextVariant.DisplayMD}>{isSuccess ? '✓' : '✕'}</Text>
        </View>
        <Text variant={TextVariant.HeadingLG} style={styles.resultTitle}>
          {title}
        </Text>
        {!isSuccess && errorType && (
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Alternative}
            style={styles.resultMessage}
            numberOfLines={3}
          >
            {state.resultMessage}
          </Text>
        )}
        <Button
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          label={isSuccess ? 'Got it!' : 'Close'}
          onPress={onClose}
          style={styles.primaryButton}
        />
      </View>
    );
  };

  const renderContent = () => {
    switch (state.step) {
      case 'loading':
        return renderLoading('Preparing your payment...');
      case 'collectData':
        return renderCollectDataWebView();
      case 'confirm':
        return renderConfirm();
      case 'confirming':
        return renderLoading('Confirming your payment...');
      case 'result':
        return renderResult();
      default:
        return renderLoading('Loading...');
    }
  };

  const showBackButton = state.step === 'collectData';

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerButton}>
          {showBackButton && (
            <ButtonIcon
              onPress={goBack}
              iconName={IconName.ArrowLeft}
              iconColor={IconColor.Default}
            />
          )}
        </View>
        <Text variant={TextVariant.HeadingMD} style={styles.headerTitle}>
          WalletConnect Pay
        </Text>
        <View style={styles.headerButton}>
          <ButtonIcon
            onPress={onClose}
            iconName={IconName.Close}
            iconColor={IconColor.Default}
          />
        </View>
      </View>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {renderContent()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default WalletConnectPayModal;
