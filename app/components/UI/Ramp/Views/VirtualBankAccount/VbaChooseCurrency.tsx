import React, { useCallback } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  HeaderStandard,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import I18n, { strings } from '../../../../../../locales/i18n';
import { selectMoneyMovementNeobank } from '../../../../../selectors/featureFlagController/moneyAccount';
import {
  getVbaChoosableCurrencies,
  getVbaCurrencyDisplayName,
  type VbaCurrencyCode,
} from '../../../../../util/region/getVbaSourceCurrency';
import bankTransferImage from '../../../../../images/bank-transfer.png';
import { openCompletedVbaAccount } from './hooks/useVbaOnboardingRouting';
import { VbaChooseCurrencySelectorsIDs } from './VbaChooseCurrency.testIds';

/**
 * Lets the user pick the account currency after identity verification. Only
 * shown when `moneyMovementNeobank.chooseCurrency` is true; otherwise the
 * account is created in the IP country's currency.
 *
 * Rows come from the enabled flag: deduped `regionCurrencies` values plus
 * `defaultCurrency`, then only the codes whose deposit details this client
 * can render. The bank icon is generic. A currency is not a country.
 */
const VbaChooseCurrency = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const { regionCurrencies, defaultCurrency } = useSelector(
    selectMoneyMovementNeobank,
  );
  const currencies = getVbaChoosableCurrencies(
    regionCurrencies,
    defaultCurrency,
  );
  const locale = typeof I18n.locale === 'string' ? I18n.locale : undefined;

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSelect = useCallback(
    (currency: VbaCurrencyCode) => () => {
      openCompletedVbaAccount(navigation, currency);
    },
    [navigation],
  );

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderStandard
        onBack={handleBack}
        backButtonProps={{ testID: VbaChooseCurrencySelectorsIDs.BACK_BUTTON }}
        includesTopInset
      />
      <ScrollView
        contentContainerStyle={tw.style('flex-grow px-4 pb-4')}
        testID={VbaChooseCurrencySelectorsIDs.CONTAINER}
      >
        <Box alignItems={BoxAlignItems.Center} twClassName="w-full">
          <Image
            source={bankTransferImage}
            accessibilityIgnoresInvertColors
            accessible={false}
            importantForAccessibility="no"
            style={tw.style('h-[88px] w-[88px]')}
          />
        </Box>
        <Text variant={TextVariant.HeadingLg} twClassName="mt-6 text-center">
          {strings('virtual_bank_account.choose_currency.title')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="mt-2 text-center"
        >
          {strings('virtual_bank_account.choose_currency.description')}
        </Text>
        <Box twClassName="mt-6 overflow-hidden rounded-xl bg-muted">
          {currencies.map((currency) => {
            const name = getVbaCurrencyDisplayName(currency, locale);
            return (
              <Pressable
                key={currency}
                onPress={handleSelect(currency)}
                accessibilityRole="button"
                accessibilityLabel={strings(
                  'virtual_bank_account.choose_currency.row_label',
                  { name, code: currency },
                )}
                testID={`${VbaChooseCurrencySelectorsIDs.CURRENCY_ROW}-${currency}`}
              >
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  twClassName="gap-3 px-4 py-3"
                >
                  <View
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                  >
                    <Icon
                      name={IconName.Bank}
                      size={IconSize.Lg}
                      color={IconColor.IconAlternative}
                    />
                  </View>
                  <Box twClassName="flex-1">
                    <Text variant={TextVariant.BodyMd}>{name}</Text>
                    <Text
                      variant={TextVariant.BodySm}
                      color={TextColor.TextAlternative}
                    >
                      {currency}
                    </Text>
                  </Box>
                  <Icon
                    name={IconName.ArrowRight}
                    size={IconSize.Sm}
                    color={IconColor.IconAlternative}
                  />
                </Box>
              </Pressable>
            );
          })}
        </Box>
        <Text
          variant={TextVariant.BodyXs}
          color={TextColor.TextAlternative}
          twClassName="mt-4"
        >
          {strings('virtual_bank_account.choose_currency.footnote')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

export default VbaChooseCurrency;
