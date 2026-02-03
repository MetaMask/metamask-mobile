import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Box } from '@metamask/design-system-react-native';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import ListItemSelect from '../../../../../component-library/components/List/ListItemSelect';
import ScreenLayout from '../../Aggregator/components/ScreenLayout';
import { getDepositNavbarOptions } from '../../../Navbar';
import Routes from '../../../../../constants/navigation/Routes';
import { useTheme } from '../../../../../util/theme';
import { useRampsController } from '../../hooks/useRampsController';
import Icon, {
  IconName,
  IconColor,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import type { Country } from '@metamask/ramps-controller';
import type { RampsToken } from '@metamask/ramps-controller';

function SectionLabel({
  label,
  count,
  countLabel,
}: {
  label: string;
  count?: number;
  countLabel?: string;
}) {
  return (
    <View style={styles.sectionLabelRow}>
      <Text variant={TextVariant.BodyMDMedium} style={styles.sectionLabel}>
        {label}
      </Text>
      {count !== undefined && (
        <Text variant={TextVariant.BodySM} style={styles.sectionCount}>
          {countLabel ?? `${count} item${count !== 1 ? 's' : ''}`}
        </Text>
      )}
    </View>
  );
}

function SectionError({ error }: { error: string }) {
  const { colors } = useTheme();
  return (
    <Text
      variant={TextVariant.BodySM}
      style={[styles.errorText, { color: colors.error.default }]}
    >
      {error}
    </Text>
  );
}

function SectionLoading() {
  const { colors } = useTheme();
  return (
    <View style={styles.loadingRow}>
      <ActivityIndicator size="small" color={colors.primary.default} />
      <Text variant={TextVariant.BodySM} style={styles.loadingText}>
        Loading…
      </Text>
    </View>
  );
}

function DummyPage() {
  const navigation = useNavigation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {
    userRegion,
    setUserRegion,
    providers,
    selectedProvider,
    setSelectedProvider,
    providersLoading,
    providersError,
    tokens,
    selectedToken,
    setSelectedToken,
    tokensLoading,
    tokensError,
    countries,
    countriesLoading,
    countriesError,
    paymentMethods,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    paymentMethodsLoading,
    paymentMethodsError,
  } = useRampsController();

  const [regionPickerOpen, setRegionPickerOpen] = useState(false);
  const [providerPickerOpen, setProviderPickerOpen] = useState(false);
  const [tokenPickerOpen, setTokenPickerOpen] = useState(false);
  const [paymentMethodPickerOpen, setPaymentMethodPickerOpen] = useState(false);

  const goHome = useCallback(() => {
    navigation.navigate(Routes.WALLET_VIEW);
  }, [navigation]);

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(
        navigation,
        { title: 'Ramps Dummy', showBack: true },
        theme,
      ),
    );
  }, [navigation, theme]);

  const tokenList = tokens?.topTokens ?? tokens?.allTokens ?? [];
  const topTokenCount = tokens?.topTokens?.length ?? 0;
  const allTokenCount = tokens?.allTokens?.length ?? 0;
  const tokenCountLabel =
    topTokenCount > 0 && allTokenCount > 0
      ? `${topTokenCount} top / ${allTokenCount} all`
      : undefined;

  const handleSelectRegion = useCallback(
    (country: Country) => {
      setUserRegion(country.isoCode.toLowerCase()).then(() => {
        setRegionPickerOpen(false);
      });
    },
    [setUserRegion],
  );

  return (
    <ScreenLayout scrollable={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          onPress={goHome}
          style={styles.backToHomeButton}
          activeOpacity={0.7}
        >
          <Icon name={IconName.ArrowLeft} size={IconSize.Md} color={IconColor.Primary} />
          <Text variant={TextVariant.BodyMD}>Back to Home</Text>
        </TouchableOpacity>

        <Box
          style={[
            styles.section,
            { backgroundColor: theme.colors.background.alternative },
          ]}
        >
          <SectionLabel
            label="User region"
            count={countries?.length}
            countLabel={countries?.length != null ? `${countries.length} countries` : undefined}
          />
          {countriesLoading && <SectionLoading />}
          {countriesError && <SectionError error={countriesError} />}
          {!countriesLoading && userRegion && (
            <Text variant={TextVariant.BodySM} style={styles.selectedSummary}>
              Selected: {userRegion.regionCode}
            </Text>
          )}
          {!countriesLoading && countries.length > 0 && (
            <View style={styles.pickerList}>
              {regionPickerOpen
                ? countries.map((country) => (
                    <ListItemSelect
                      key={country.isoCode}
                      isSelected={
                        userRegion?.country?.isoCode === country.isoCode
                      }
                      onPress={() => handleSelectRegion(country)}
                    >
                      <Text variant={TextVariant.BodyMD}>
                        {country.flag} {country.name} ({country.isoCode})
                      </Text>
                    </ListItemSelect>
                  ))
                : (
                    <ListItemSelect
                      isSelected={false}
                      onPress={() => setRegionPickerOpen(true)}
                    >
                      <Text variant={TextVariant.BodyMD}>
                        {userRegion?.country
                          ? `${userRegion.country.flag} ${userRegion.country.name} (${userRegion.regionCode})`
                          : 'Select region'}
                      </Text>
                    </ListItemSelect>
                  )}
              {regionPickerOpen && (
                <TouchableOpacity
                  onPress={() => setRegionPickerOpen(false)}
                  style={styles.moreButton}
                >
                  <Text variant={TextVariant.BodySM}>Collapse</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </Box>

        <Box
          style={[
            styles.section,
            { backgroundColor: theme.colors.background.alternative },
          ]}
        >
           {providerPickerOpen && (
                <TouchableOpacity
                  onPress={() => setProviderPickerOpen(false)}
                  style={styles.moreButton}
                >
                  <Text variant={TextVariant.BodySM}>Collapse</Text>
                </TouchableOpacity>
              )}
          <SectionLabel
            label="Providers"
            count={providers?.length}
            countLabel={providers?.length != null ? `${providers.length} providers` : undefined}
          />
          {providersLoading && <SectionLoading />}
          {providersError && <SectionError error={providersError} />}
          
            <Text variant={TextVariant.BodySM} style={styles.selectedSummary}>
              Selected: {selectedProvider?.name ?? 'None'}
            </Text>
          {!providersLoading && providers.length > 0 && (
            <View style={styles.pickerList}>
              {providerPickerOpen
                ? providers.map((provider) => (
                    <ListItemSelect
                      key={provider.id}
                      isSelected={selectedProvider?.id === provider.id}
                      onPress={() => {
                        setSelectedProvider(provider);
                        setProviderPickerOpen(false);
                      }}
                    >
                      <Text variant={TextVariant.BodyMD}>
                        {provider.name}
                      </Text>
                    </ListItemSelect>
                  ))
                : (
                    <ListItemSelect
                      isSelected={false}
                      onPress={() => setProviderPickerOpen(true)}
                    >
                      <Text variant={TextVariant.BodyMD}>
                        {selectedProvider
                          ? `${selectedProvider.name}`
                          : 'Select provider'}
                      </Text>
                    </ListItemSelect>
                  )}
             
            </View>
          )}
        </Box>

        <Box
          style={[
            styles.section,
            { backgroundColor: theme.colors.background.alternative },
          ]}
        >
          {tokenPickerOpen && (
                <TouchableOpacity
                  onPress={() => setTokenPickerOpen(false)}
                  style={styles.moreButton}
                >
                  <Text variant={TextVariant.BodySM}>Collapse</Text>
                </TouchableOpacity>
              )}
          <SectionLabel
            label="Tokens"
            count={tokenList.length}
            countLabel={tokenCountLabel ?? (tokenList.length > 0 ? `${tokenList.length} tokens` : undefined)}
          />
          {tokensLoading && <SectionLoading />}
          {tokensError && <SectionError error={tokensError} />}
          <Text variant={TextVariant.BodySM} style={styles.selectedSummary}>
              Selected: {selectedToken?.symbol ?? 'None'}
            </Text>
          {!tokensLoading && tokenList.length > 0 && (
            <View style={styles.pickerList}>
              {tokenPickerOpen
                ? tokenList.map((token: RampsToken) => (
                    <ListItemSelect
                      key={token.assetId}
                      isSelected={selectedToken?.assetId === token.assetId}
                      onPress={() => {
                        setSelectedToken(token);
                        setTokenPickerOpen(false);
                      }}
                    >
                      <Text variant={TextVariant.BodyMD}>
                        {token.symbol} – {token.name}
                      </Text>
                    </ListItemSelect>
                  ))
                : (
                    <ListItemSelect
                      isSelected={false}
                      onPress={() => setTokenPickerOpen(true)}
                    >
                      <Text variant={TextVariant.BodyMD}>
                        {selectedToken
                          ? `${selectedToken.symbol}`
                          : 'Select token'}
                      </Text>
                    </ListItemSelect>
                  )}
            </View>
          )}
        </Box>

        <Box
          style={[
            styles.section,
            { backgroundColor: theme.colors.background.alternative },
          ]}
        >
                {paymentMethodPickerOpen && (
                <TouchableOpacity
                  onPress={() => setPaymentMethodPickerOpen(false)}
                  style={styles.moreButton}
                >
                  <Text variant={TextVariant.BodySM}>Collapse</Text>
                </TouchableOpacity>
              )}
          <SectionLabel
            label="Payment methods"
            count={paymentMethods?.length}
            countLabel={paymentMethods?.length != null ? `${paymentMethods.length} methods` : undefined}
          />
          {paymentMethodsLoading && <SectionLoading />}
          {paymentMethodsError && (
            <SectionError error={paymentMethodsError} />
          )}
              <Text variant={TextVariant.BodySM} style={styles.selectedSummary}>
              Selected: {selectedPaymentMethod?.name ?? 'None'}
            </Text>
          {!paymentMethodsLoading && paymentMethods.length > 0 && (
            <View style={styles.pickerList}>
              {paymentMethodPickerOpen
                ? paymentMethods.map((pm) => (
                    <ListItemSelect
                      key={pm.id}
                      isSelected={selectedPaymentMethod?.id === pm.id}
                      onPress={() => {
                        setSelectedPaymentMethod(pm);
                        setPaymentMethodPickerOpen(false);
                      }}
                    >
                      <Text variant={TextVariant.BodyMD}>
                        {pm.name}
                      </Text>
                    </ListItemSelect>
                  ))
                : (
                    <ListItemSelect
                      isSelected={false}
                      onPress={() => setPaymentMethodPickerOpen(true)}
                    >
                      <Text variant={TextVariant.BodyMD}>
                        {selectedPaymentMethod
                          ? `${selectedPaymentMethod.name}`
                          : 'Select payment method'}
                      </Text>
                    </ListItemSelect>
                  )}
        
            </View>
          )}
        </Box>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  backToHomeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  section: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  sectionLabel: {
    flexShrink: 0,
  },
  sectionCount: {
    opacity: 0.7,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  loadingText: {
    opacity: 0.8,
  },
  errorText: {
    marginBottom: 8,
  },
  selectedSummary: {
    opacity: 0.85,
    marginBottom: 8,
  },
  pickerList: {
    gap: 4,
  },
  moreButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignSelf: 'flex-start',
  },
});

export default DummyPage;
