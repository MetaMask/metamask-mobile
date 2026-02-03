import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CaipChainId } from '@metamask/utils';

import ScreenLayout from '../../Aggregator/components/ScreenLayout';
import Keypad, { type KeypadChangeData } from '../../../../Base/Keypad';
import PaymentMethodPill from '../PaymentMethodPill';
import QuickAmounts from '../QuickAmounts';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import {
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';

import {
  createNavigationDetails,
  useParams,
} from '../../../../../util/navigation/navUtils';
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

interface BuildQuoteParams {
  assetId?: string;
}

export const createBuildQuoteNavDetails =
  createNavigationDetails<BuildQuoteParams>(Routes.RAMP.AMOUNT_INPUT);

function BuildQuote() {
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});
  const { assetId } = useParams<BuildQuoteParams>();

  const [amount, setAmount] = useState<string>('0');
  const [amountAsNumber, setAmountAsNumber] = useState<number>(0);
  const [userHasEnteredAmount, setUserHasEnteredAmount] = useState(false);
  const [isPendingQuote, setIsPendingQuote] = useState(false);
  const [isPaymentMethodReady, setIsPaymentMethodReady] = useState(false);

  // Get user region, selected provider, tokens, quotes, and payment methods from RampsController
  const {
    userRegion,
    selectedProvider,
    selectedToken: controllerSelectedToken,
    setSelectedToken,
    selectedQuote,
    quotesLoading,
    startQuotePolling,
    stopQuotePolling,
    paymentMethods,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    paymentMethodsLoading,
  } = useRampsController();

  // Get currency, quick amounts, and default amount from user's region
  const currency = userRegion?.country?.currency || 'USD';
  const quickAmounts = userRegion?.country?.quickAmounts ?? [50, 100, 200, 400];
  const defaultAmount = userRegion?.country?.defaultAmount ?? 100;

  // Get network info helper
  const getTokenNetworkInfo = useTokenNetworkInfo();

  // Set the token in controller when assetId param is provided
  useEffect(() => {
    if (assetId && controllerSelectedToken?.assetId !== assetId) {
      setSelectedToken(assetId);
    }
  }, [assetId, controllerSelectedToken?.assetId, setSelectedToken]);

  // Use the controller's selected token (which matches assetId param)
  const selectedToken = controllerSelectedToken;

  // Get wallet address for the selected token's chain
  const walletAddress = useRampAccountAddress(
    selectedToken?.chainId as CaipChainId,
  );

  // Amount to use for polling: user's amount if entered, otherwise defaultAmount
  const pollingAmount = userHasEnteredAmount ? amountAsNumber : defaultAmount;

  // Debounce the polling amount to avoid spamming requests while user types
  const debouncedPollingAmount = useDebouncedValue(pollingAmount, 500);

  // Get network info for the selected token
  const networkInfo = useMemo(() => {
    if (!selectedToken) return null;
    return getTokenNetworkInfo(selectedToken.chainId as CaipChainId);
  }, [selectedToken, getTokenNetworkInfo]);

  // Auto-select first payment method when available and loaded
  useEffect(() => {
    if (
      !selectedPaymentMethod &&
      !paymentMethodsLoading &&
      paymentMethods.length > 0
    ) {
      setSelectedPaymentMethod(paymentMethods[0]);
      // Mark payment method as ready after a brief delay to ensure controller state is updated
      setTimeout(() => setIsPaymentMethodReady(true), 100);
    }
  }, [
    paymentMethods,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    paymentMethodsLoading,
  ]);

  // Mark payment method as ready when it's already selected (e.g., from controller state)
  useEffect(() => {
    if (selectedPaymentMethod && !isPaymentMethodReady) {
      setIsPaymentMethodReady(true);
    }
  }, [selectedPaymentMethod, isPaymentMethodReady]);

  // Update navigation options - shows skeleton when data is loading
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
      setIsPendingQuote(true); // Immediately show loading to prevent race condition
    },
    [],
  );

  const handleQuickAmountPress = useCallback((quickAmount: number) => {
    setAmount(String(quickAmount));
    setAmountAsNumber(quickAmount);
    setUserHasEnteredAmount(true);
    setIsPendingQuote(true);
  }, []);

  // Clear pending state when controller finishes loading
  useEffect(() => {
    if (!quotesLoading) {
      setIsPendingQuote(false);
    }
  }, [quotesLoading]);

  // Start polling on mount with defaultAmount for initial quote
  useEffect(() => {
    if (!walletAddress || !isPaymentMethodReady || !userRegion) {
      return;
    }

    startQuotePolling({
      walletAddress,
      amount: defaultAmount,
    });

    return () => {
      stopQuotePolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    walletAddress,
    isPaymentMethodReady,
    userRegion?.regionCode,
    defaultAmount,
  ]);

  // Restart polling when user changes amount (debounced)
  useEffect(() => {
    if (!walletAddress || !isPaymentMethodReady || !userHasEnteredAmount) {
      return;
    }

    startQuotePolling({
      walletAddress,
      amount: debouncedPollingAmount,
    });
  }, [
    debouncedPollingAmount,
    walletAddress,
    isPaymentMethodReady,
    userHasEnteredAmount,
    startQuotePolling,
  ]);

  const handleContinuePress = useCallback(() => {
    // TODO: Navigate to next screen with amount
  }, []);

  const hasAmount = amountAsNumber > 0;
  const isQuoteLoading = quotesLoading || isPendingQuote;
  const canContinue = hasAmount && !isQuoteLoading && selectedQuote !== null;

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
                label={strings('fiat_on_ramp.debit_card')}
                onPress={() => {
                  // TODO: Open payment method selector
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
                isLoading={isQuoteLoading}
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
