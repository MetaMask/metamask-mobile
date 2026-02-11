import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CaipChainId } from '@metamask/utils';

import ScreenLayout from '../../Aggregator/components/ScreenLayout';
import { callbackBaseUrl } from '../../Aggregator/sdk';
import Keypad, { type KeypadChangeData } from '../../../../Base/Keypad';
import PaymentMethodPill from '../../components/PaymentMethodPill';
import QuickAmounts from '../../components/QuickAmounts';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import {
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';

import { createNavigationDetails } from '../../../../../util/navigation/navUtils';
import { getRampsBuildQuoteNavbarOptions } from '../../../Navbar';
import Routes from '../../../../../constants/navigation/Routes';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './BuildQuote.styles';
import { formatCurrency } from '../../utils/formatCurrency';
import { useTokenNetworkInfo } from '../../hooks/useTokenNetworkInfo';
import { useRampsController } from '../../hooks/useRampsController';
import { createSettingsModalNavDetails } from '../Modals/SettingsModal';
import useRampAccountAddress from '../../hooks/useRampAccountAddress';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { createPaymentSelectionModalNavigationDetails } from '../Modals/PaymentSelectionModal';
import { createCheckoutNavDetails } from '../Checkout';
import { isNativeProvider, getQuoteProviderName } from '../../types';
import { createDepositNavigationDetails } from '../../Deposit/routes/utils';
import Logger from '../../../../../util/Logger';

interface BuildQuoteParams {
  assetId?: string;
}

export const createBuildQuoteNavDetails =
  createNavigationDetails<BuildQuoteParams>(Routes.RAMP.AMOUNT_INPUT);

const DEFAULT_AMOUNT = 100;

function BuildQuote() {
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});

  const [amount, setAmount] = useState<string>(() => String(DEFAULT_AMOUNT));
  const [amountAsNumber, setAmountAsNumber] = useState<number>(DEFAULT_AMOUNT);
  const [userHasEnteredAmount, setUserHasEnteredAmount] = useState(false);

  const {
    userRegion,
    selectedProvider,
    selectedToken,
    selectedQuote,
    quotesLoading,
    startQuotePolling,
    stopQuotePolling,
    getWidgetUrl,
    paymentMethodsLoading,
    selectedPaymentMethod,
  } = useRampsController();

  const currency = userRegion?.country?.currency || 'USD';
  const quickAmounts = userRegion?.country?.quickAmounts ?? [50, 100, 200, 400];

  useEffect(() => {
    if (!userHasEnteredAmount && userRegion?.country?.defaultAmount != null) {
      const regionDefault = userRegion.country.defaultAmount;
      setAmount(String(regionDefault));
      setAmountAsNumber(regionDefault);
      setUserHasEnteredAmount(true);
    }
  }, [userRegion?.country?.defaultAmount, userHasEnteredAmount]);

  const getTokenNetworkInfo = useTokenNetworkInfo();

  const walletAddress = useRampAccountAddress(
    selectedToken?.chainId as CaipChainId,
  );

  const debouncedPollingAmount = useDebouncedValue(amountAsNumber, 500);

  const networkInfo = useMemo(() => {
    if (!selectedToken) return null;
    return getTokenNetworkInfo(selectedToken.chainId as CaipChainId);
  }, [selectedToken, getTokenNetworkInfo]);

  useEffect(() => {
    navigation.setOptions(
      getRampsBuildQuoteNavbarOptions(navigation, {
        tokenName: selectedToken?.name,
        tokenSymbol: selectedToken?.symbol,
        tokenIconUrl: selectedToken?.iconUrl,
        networkName: networkInfo?.networkName ?? undefined,
        networkImageSource: networkInfo?.networkImageSource,
        onSettingsPress: () => {
          navigation.navigate(...createSettingsModalNavDetails());
        },
      }),
    );
  }, [navigation, selectedToken, networkInfo]);

  const handleKeypadChange = useCallback(
    ({ value, valueAsNumber }: KeypadChangeData) => {
      setAmount(value || '0');
      setAmountAsNumber(valueAsNumber || 0);
      setUserHasEnteredAmount(true);
    },
    [],
  );

  const handleQuickAmountPress = useCallback((quickAmount: number) => {
    setAmount(String(quickAmount));
    setAmountAsNumber(quickAmount);
    setUserHasEnteredAmount(true);
  }, []);

  useEffect(() => {
    if (
      !walletAddress ||
      !selectedPaymentMethod ||
      debouncedPollingAmount <= 0
    ) {
      stopQuotePolling();
      return;
    }

    startQuotePolling({
      walletAddress,
      amount: debouncedPollingAmount,
      redirectUrl: callbackBaseUrl,
    });

    return () => {
      stopQuotePolling();
    };
  }, [
    walletAddress,
    selectedPaymentMethod,
    debouncedPollingAmount,
    startQuotePolling,
    stopQuotePolling,
  ]);

  const handleContinuePress = useCallback(async () => {
    if (!selectedQuote) return;

    // Native/whitelabel provider (e.g. Transak Native) -> deposit flow
    if (isNativeProvider(selectedQuote)) {
      navigation.navigate(
        ...createDepositNavigationDetails({
          assetId: selectedToken?.assetId,
          amount: String(amountAsNumber),
          currency,
          shouldRouteImmediately: true,
        }),
      );
      return;
    }

    // Aggregator provider -> needs a widget URL
    // Note: CustomActions (e.g., PayPal) are handled through the same flow.
    // If the API returns a quote with a URL, it will be opened in the checkout webview.
    // If customActions appear without a URL, they will error here (needs backend fix).
    try {
      const widgetUrl = await getWidgetUrl(selectedQuote);

      if (widgetUrl) {
        navigation.navigate(
          ...createCheckoutNavDetails({
            url: widgetUrl,
            providerName: getQuoteProviderName(selectedQuote),
          }),
        );
      } else {
        Logger.error(
          new Error('No widget URL available for aggregator provider'),
          { provider: selectedQuote.provider },
        );
        // TODO: Show user-facing error (alert or inline)
      }
    } catch (error) {
      Logger.error(error as Error, {
        provider: selectedQuote.provider,
        message: 'Failed to fetch widget URL',
      });
      // TODO: Show user-facing error (alert or inline)
    }
  }, [
    selectedQuote,
    navigation,
    getWidgetUrl,
    amountAsNumber,
    selectedToken,
    currency,
  ]);

  const hasAmount = amountAsNumber > 0;

  const quoteMatchesAmount =
    debouncedPollingAmount === amountAsNumber && debouncedPollingAmount > 0;

  const canContinue =
    hasAmount && !quotesLoading && selectedQuote !== null && quoteMatchesAmount;

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content style={styles.content}>
          <View style={styles.centerGroup}>
            <View style={styles.amountContainer}>
              <Text
                variant={TextVariant.HeadingLG}
                style={styles.mainAmount}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatCurrency(amountAsNumber, currency, {
                  currencyDisplay: 'narrowSymbol',
                })}
              </Text>
              <PaymentMethodPill
                label={
                  selectedPaymentMethod?.name ||
                  strings('fiat_on_ramp.select_payment_method')
                }
                isLoading={paymentMethodsLoading}
                onPress={() => {
                  navigation.navigate(
                    ...createPaymentSelectionModalNavigationDetails(),
                  );
                }}
              />
            </View>
          </View>

          <View style={styles.actionSection}>
            {selectedProvider && (
              <Text variant={TextVariant.BodySM} style={styles.poweredByText}>
                {strings('fiat_on_ramp.powered_by_provider', {
                  provider: selectedProvider.name,
                })}
              </Text>
            )}
            {hasAmount ? (
              <Button
                variant={ButtonVariant.Primary}
                size={ButtonSize.Lg}
                onPress={handleContinuePress}
                isFullWidth
                isDisabled={!canContinue}
                isLoading={quotesLoading}
                testID="build-quote-continue-button"
              >
                {strings('fiat_on_ramp.continue')}
              </Button>
            ) : (
              quickAmounts.length > 0 && (
                <QuickAmounts
                  amounts={quickAmounts}
                  currency={currency}
                  onAmountPress={handleQuickAmountPress}
                />
              )
            )}
          </View>
          <Keypad
            currency={currency}
            value={amount}
            onChange={handleKeypadChange}
          />
        </ScreenLayout.Content>
      </ScreenLayout.Body>
    </ScreenLayout>
  );
}

export default BuildQuote;
