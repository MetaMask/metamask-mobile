/**
 * Meld PoC — BuildQuote Screen
 *
 * Simplified version of Aggregator/Views/BuildQuote that talks
 * directly to Meld's White-Label API instead of going through
 * the on-ramp SDK → on-ramp API chain.
 *
 * This demonstrates:
 * 1. Country selection via Meld API
 * 2. Fiat/Crypto/Payment method fetching from Meld
 * 3. Amount input with limit validation
 * 4. Navigation to the Meld quotes screen
 */

import React, { useCallback, useState } from 'react';
import {
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Text,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

// eslint-disable-next-line react-native/no-inline-styles -- PoC: these will use tw in production
const pocStyles = StyleSheet.create({
  scrollView: { flex: 1 },
  amountInput: {
    fontSize: 32,
    fontWeight: '600',
    textAlign: 'center',
  },
});

import { useMeldContext } from '../../MeldProvider';
import useMeldCountries from '../../hooks/useMeldCountries';
import useMeldFiatCurrencies from '../../hooks/useMeldFiatCurrencies';
import useMeldCryptoCurrencies from '../../hooks/useMeldCryptoCurrencies';
import useMeldPaymentMethods from '../../hooks/useMeldPaymentMethods';
import {
  MeldCountry,
  MeldCryptoCurrency,
  MeldFiatCurrency,
  MeldPaymentMethodType,
} from '../../types';

import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../../../../component-library/components/Buttons/Button';

// ──────────────────────────────────────────────
// Selector Row Component
// ──────────────────────────────────────────────

interface SelectorRowProps {
  label: string;
  value: string;
  onPress: () => void;
  isLoading?: boolean;
}

const SelectorRow: React.FC<SelectorRowProps> = ({
  label,
  value,
  onPress,
  isLoading,
}) => {
  const tw = useTailwind();

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="px-4 py-3 bg-default rounded-lg mb-2"
    >
      <Text variant={TextVariant.BodyMd} twClassName="text-muted">
        {label}
      </Text>
      {isLoading ? (
        <ActivityIndicator size="small" />
      ) : (
        <Box
          twClassName="px-3 py-1 bg-muted rounded-full"
          style={tw.style('active:opacity-70')}
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            onPress={onPress}
          >
            {value || 'Select...'}
          </Text>
        </Box>
      )}
    </Box>
  );
};

// ──────────────────────────────────────────────
// Simple Picker Modal (Alert-based for PoC)
// ──────────────────────────────────────────────

function showPicker<T>(
  title: string,
  items: T[],
  labelFn: (item: T) => string,
  onSelect: (item: T) => void,
) {
  // For PoC, use Alert. In production, use a proper BottomSheet picker.
  const buttons = items.slice(0, 10).map((item) => ({
    text: labelFn(item),
    onPress: () => onSelect(item),
  }));
  buttons.push({
    text: 'Cancel',
    onPress: () => {
      // no-op: dismiss the picker
    },
  });
  Alert.alert(
    title,
    `Showing first ${Math.min(items.length, 10)} options`,
    buttons,
  );
}

// ──────────────────────────────────────────────
// Main BuildQuote Screen
// ──────────────────────────────────────────────

const MeldBuildQuote: React.FC = () => {
  const navigation = useNavigation();
  const { walletAddress, isBuy, setIsBuy } = useMeldContext();

  // ── Data hooks ──
  const {
    countries,
    isFetching: isFetchingCountries,
    selectedCountry,
    setSelectedCountry,
  } = useMeldCountries();

  const {
    fiatCurrencies,
    isFetching: isFetchingFiat,
    selectedFiatCurrency,
    setSelectedFiatCurrency,
  } = useMeldFiatCurrencies();

  const {
    cryptoCurrencies,
    isFetching: isFetchingCrypto,
    selectedCrypto,
    setSelectedCrypto,
  } = useMeldCryptoCurrencies();

  const {
    paymentMethods,
    isFetching: isFetchingPayments,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
  } = useMeldPaymentMethods();

  // ── Amount state ──
  const [amount, setAmount] = useState('100');

  // ── Navigation to Quotes ──
  const handleGetQuotes = useCallback(() => {
    if (!selectedCountry || !selectedFiatCurrency || !selectedCrypto) {
      Alert.alert(
        'Missing selection',
        'Please select country, currency, and crypto.',
      );
      return;
    }
    if (!amount || Number(amount) <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid amount.');
      return;
    }

    // Navigate to the Meld quotes screen
    // For PoC, we pass params via navigation
    (
      navigation as { navigate: (route: string, params: object) => void }
    ).navigate('MeldQuotes', { amount });
  }, [
    navigation,
    selectedCountry,
    selectedFiatCurrency,
    selectedCrypto,
    amount,
  ]);

  // ── Loading state ──
  const isLoading =
    isFetchingCountries ||
    isFetchingFiat ||
    isFetchingCrypto ||
    isFetchingPayments;

  return (
    <ScrollView style={pocStyles.scrollView}>
      <Box twClassName="p-4">
        {/* Header */}
        <Text variant={TextVariant.HeadingLg} twClassName="mb-1">
          {isBuy ? 'Buy Crypto' : 'Sell Crypto'}
        </Text>
        <Text variant={TextVariant.BodySm} twClassName="text-muted mb-4">
          Powered by Meld — Direct API Integration PoC
        </Text>

        {/* Buy/Sell Toggle */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          twClassName="mb-4 rounded-lg bg-muted p-1"
        >
          <Box
            twClassName={`flex-1 rounded-md py-2 ${isBuy ? 'bg-default' : ''}`}
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={isBuy ? FontWeight.Bold : FontWeight.Regular}
              onPress={() => setIsBuy(true)}
              twClassName="text-center"
            >
              Buy
            </Text>
          </Box>
          <Box
            twClassName={`flex-1 rounded-md py-2 ${!isBuy ? 'bg-default' : ''}`}
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={!isBuy ? FontWeight.Bold : FontWeight.Regular}
              onPress={() => setIsBuy(false)}
              twClassName="text-center"
            >
              Sell
            </Text>
          </Box>
        </Box>

        {/* Country Selector */}
        <SelectorRow
          label="Country"
          value={
            selectedCountry
              ? `${selectedCountry.countryCode} — ${selectedCountry.countryName}`
              : ''
          }
          isLoading={isFetchingCountries}
          onPress={() => {
            if (countries) {
              showPicker<MeldCountry>(
                'Select Country',
                countries,
                (c) => `${c.countryCode} — ${c.countryName}`,
                setSelectedCountry,
              );
            }
          }}
        />

        {/* Fiat Currency Selector */}
        <SelectorRow
          label="Pay with"
          value={
            selectedFiatCurrency
              ? `${selectedFiatCurrency.currencyCode}${selectedFiatCurrency.currencyName ? ` (${selectedFiatCurrency.currencyName})` : ''}`
              : ''
          }
          isLoading={isFetchingFiat}
          onPress={() => {
            if (fiatCurrencies) {
              showPicker<MeldFiatCurrency>(
                'Select Fiat Currency',
                fiatCurrencies,
                (f) => `${f.currencyCode} — ${f.currencyName}`,
                setSelectedFiatCurrency,
              );
            }
          }}
        />

        {/* Crypto Selector */}
        <SelectorRow
          label="Receive"
          value={
            selectedCrypto
              ? `${selectedCrypto.currencyName} (${selectedCrypto.networkName})`
              : ''
          }
          isLoading={isFetchingCrypto}
          onPress={() => {
            if (cryptoCurrencies) {
              showPicker<MeldCryptoCurrency>(
                'Select Crypto',
                cryptoCurrencies,
                (c) => `${c.currencyName} (${c.networkName})`,
                setSelectedCrypto,
              );
            }
          }}
        />

        {/* Payment Method Selector */}
        <SelectorRow
          label="Payment Method"
          value={selectedPaymentMethod?.replace(/_/g, ' ') ?? ''}
          isLoading={isFetchingPayments}
          onPress={() => {
            if (paymentMethods) {
              showPicker<{
                paymentMethodType: MeldPaymentMethodType;
                name: string;
              }>(
                'Select Payment Method',
                paymentMethods,
                (p) => p.name || p.paymentMethodType.replace(/_/g, ' '),
                (p) => setSelectedPaymentMethod(p.paymentMethodType),
              );
            }
          }}
        />

        {/* Amount Input */}
        <Box twClassName="my-4">
          <Text variant={TextVariant.BodySm} twClassName="text-muted mb-1">
            Amount ({selectedFiatCurrency?.currencyCode ?? 'USD'})
          </Text>
          <Box twClassName="bg-muted rounded-lg px-4 py-3">
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="Enter amount"
              style={pocStyles.amountInput}
            />
          </Box>
        </Box>

        {/* Wallet Address Display */}
        {walletAddress ? (
          <Box twClassName="mb-4 p-3 bg-muted rounded-lg">
            <Text variant={TextVariant.BodySm} twClassName="text-muted">
              Receiving wallet
            </Text>
            <Text variant={TextVariant.BodySm} numberOfLines={1}>
              {walletAddress}
            </Text>
          </Box>
        ) : null}

        {/* Get Quotes Button */}
        <Button
          variant={ButtonVariants.Primary}
          width={ButtonWidthTypes.Full}
          size={ButtonSize.Lg}
          label={isLoading ? 'Loading...' : 'Get Quotes from Meld'}
          onPress={handleGetQuotes}
          isDisabled={
            isLoading ||
            !selectedCountry ||
            !selectedFiatCurrency ||
            !selectedCrypto
          }
        />

        {/* Debug Info */}
        <Box twClassName="mt-6 p-3 bg-muted rounded-lg">
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Bold}
            twClassName="mb-1"
          >
            PoC Debug Info
          </Text>
          <Text variant={TextVariant.BodySm} twClassName="text-muted">
            API: Meld Sandbox (api-sb.meld.io){'\n'}
            Country: {selectedCountry?.countryCode ?? 'none'}
            {'\n'}
            Fiat: {selectedFiatCurrency?.currencyCode ?? 'none'}
            {'\n'}
            Crypto: {selectedCrypto?.currencyCode ?? 'none'}
            {'\n'}
            Payment: {selectedPaymentMethod ?? 'none'}
            {'\n'}
            Amount: {amount}
          </Text>
        </Box>
      </Box>
    </ScrollView>
  );
};

export default MeldBuildQuote;
