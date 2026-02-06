/**
 * Meld BuildQuote Screen — Production version
 *
 * Country/Fiat/Crypto/Payment selection with proper BottomSheet selectors,
 * amount input, and navigation to quotes.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, TextInput, StyleSheet } from 'react-native';
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

import { useMeldContext } from '../../MeldProvider';
import useMeldCountries from '../../hooks/useMeldCountries';
import useMeldFiatCurrencies from '../../hooks/useMeldFiatCurrencies';
import useMeldCryptoCurrencies from '../../hooks/useMeldCryptoCurrencies';
import useMeldPaymentMethods from '../../hooks/useMeldPaymentMethods';
import {
  MeldCountry,
  MeldCryptoCurrency,
  MeldFiatCurrency,
  MeldPaymentMethod,
} from '../../types';
import MeldSelectorModal, {
  SelectorItem,
} from '../../components/MeldSelectorModal';
import Routes from '../../../../../../constants/navigation/Routes';

import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../../../../component-library/components/Buttons/Button';

const pocStyles = StyleSheet.create({
  scrollView: { flex: 1 },
  amountInput: {
    fontSize: 32,
    fontWeight: '600',
    textAlign: 'center',
  },
});

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
}) => (
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
      <Box twClassName="px-3 py-1">
        <Text variant={TextVariant.BodySm} twClassName="text-muted">
          Loading...
        </Text>
      </Box>
    ) : (
      <Button
        variant={ButtonVariants.Secondary}
        size={ButtonSize.Sm}
        label={value || 'Select...'}
        onPress={onPress}
      />
    )}
  </Box>
);

// ──────────────────────────────────────────────
// Selector item mappers
// ──────────────────────────────────────────────

const countryToSelectorItem = (c: MeldCountry): SelectorItem => ({
  id: c.countryCode,
  title: c.name,
  subtitle: c.countryCode,
});

const fiatToSelectorItem = (f: MeldFiatCurrency): SelectorItem => ({
  id: f.currencyCode,
  title: f.currencyCode,
  subtitle: f.name,
});

const cryptoToSelectorItem = (c: MeldCryptoCurrency): SelectorItem => ({
  id: `${c.currencyCode}-${c.chainCode}`,
  title: c.name,
  subtitle: `${c.currencyCode} on ${c.chainName}`,
});

const paymentToSelectorItem = (p: MeldPaymentMethod): SelectorItem => ({
  id: p.paymentMethod,
  title: p.name || p.paymentMethod.replace(/_/g, ' '),
  subtitle: p.paymentType,
});

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

  // ── Modal visibility state ──
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [fiatModalVisible, setFiatModalVisible] = useState(false);
  const [cryptoModalVisible, setCryptoModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);

  // ── Navigation to Quotes ──
  const canProceed = useMemo(
    () =>
      !!selectedCountry &&
      !!selectedFiatCurrency &&
      !!selectedCrypto &&
      !!amount &&
      Number(amount) > 0,
    [selectedCountry, selectedFiatCurrency, selectedCrypto, amount],
  );

  const handleGetQuotes = useCallback(() => {
    if (!canProceed) return;
    (
      navigation as { navigate: (route: string, params: object) => void }
    ).navigate(Routes.MELD_RAMP.QUOTES, { amount });
  }, [navigation, canProceed, amount]);

  // ── Loading state ──
  const isLoading =
    isFetchingCountries ||
    isFetchingFiat ||
    isFetchingCrypto ||
    isFetchingPayments;

  return (
    <>
      <ScrollView style={pocStyles.scrollView}>
        <Box twClassName="p-4">
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
                ? `${selectedCountry.countryCode} — ${selectedCountry.name}`
                : ''
            }
            isLoading={isFetchingCountries}
            onPress={() => setCountryModalVisible(true)}
          />

          {/* Fiat Currency Selector */}
          <SelectorRow
            label={isBuy ? 'Pay with' : 'Receive'}
            value={
              selectedFiatCurrency
                ? `${selectedFiatCurrency.currencyCode} (${selectedFiatCurrency.name})`
                : ''
            }
            isLoading={isFetchingFiat}
            onPress={() => setFiatModalVisible(true)}
          />

          {/* Crypto Selector */}
          <SelectorRow
            label={isBuy ? 'Receive' : 'Sell'}
            value={
              selectedCrypto
                ? `${selectedCrypto.name} (${selectedCrypto.chainName})`
                : ''
            }
            isLoading={isFetchingCrypto}
            onPress={() => setCryptoModalVisible(true)}
          />

          {/* Payment Method Selector */}
          <SelectorRow
            label="Payment Method"
            value={selectedPaymentMethod?.replace(/_/g, ' ') ?? ''}
            isLoading={isFetchingPayments}
            onPress={() => setPaymentModalVisible(true)}
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
                {isBuy ? 'Receiving wallet' : 'Sending from'}
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
            label={isLoading ? 'Loading...' : 'Get Quotes'}
            onPress={handleGetQuotes}
            isDisabled={!canProceed || isLoading}
          />
        </Box>
      </ScrollView>

      {/* ── BottomSheet Selector Modals ── */}
      <MeldSelectorModal<MeldCountry>
        visible={countryModalVisible}
        onClose={() => setCountryModalVisible(false)}
        title="Select Country"
        items={countries ?? []}
        selectedId={selectedCountry?.countryCode ?? null}
        onSelect={(c) => {
          setSelectedCountry(c);
          setCountryModalVisible(false);
        }}
        toSelectorItem={countryToSelectorItem}
        searchKeys={['title', 'subtitle']}
        searchPlaceholder="Search countries..."
      />

      <MeldSelectorModal<MeldFiatCurrency>
        visible={fiatModalVisible}
        onClose={() => setFiatModalVisible(false)}
        title="Select Currency"
        items={fiatCurrencies ?? []}
        selectedId={selectedFiatCurrency?.currencyCode ?? null}
        onSelect={(f) => {
          setSelectedFiatCurrency(f);
          setFiatModalVisible(false);
        }}
        toSelectorItem={fiatToSelectorItem}
        searchKeys={['title', 'subtitle']}
        searchPlaceholder="Search currencies..."
      />

      <MeldSelectorModal<MeldCryptoCurrency>
        visible={cryptoModalVisible}
        onClose={() => setCryptoModalVisible(false)}
        title="Select Cryptocurrency"
        items={cryptoCurrencies ?? []}
        selectedId={
          selectedCrypto
            ? `${selectedCrypto.currencyCode}-${selectedCrypto.chainCode}`
            : null
        }
        onSelect={(c) => {
          setSelectedCrypto(c);
          setCryptoModalVisible(false);
        }}
        toSelectorItem={cryptoToSelectorItem}
        searchKeys={['title', 'subtitle']}
        searchPlaceholder="Search tokens..."
      />

      <MeldSelectorModal<MeldPaymentMethod>
        visible={paymentModalVisible}
        onClose={() => setPaymentModalVisible(false)}
        title="Select Payment Method"
        items={paymentMethods ?? []}
        selectedId={selectedPaymentMethod ?? null}
        onSelect={(p) => {
          setSelectedPaymentMethod(p.paymentMethod);
          setPaymentModalVisible(false);
        }}
        toSelectorItem={paymentToSelectorItem}
        searchPlaceholder="Search methods..."
      />
    </>
  );
};

export default MeldBuildQuote;
