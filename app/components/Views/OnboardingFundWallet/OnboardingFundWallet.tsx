/* eslint-disable no-console */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { PaymentMethod } from '@metamask/ramps-controller';
import HeaderCompactStandard from '../../../component-library/components-temp/HeaderCompactStandard';
import { strings } from '../../../../locales/i18n';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useSelector } from 'react-redux';
import { selectOnboardingAccountType } from '../../../selectors/onboarding';
import { selectSelectedAccountGroup } from '../../../selectors/multichainAccounts/accountTreeController';
import Logger from '../../../util/Logger';
import type { RootStackParamList } from '../../../core/NavigationService/types';
import { OnboardingFundWalletTestIds } from './OnboardingFundWallet.testIds';
import {
  RECEIVE_EXTERNAL_OPTION_ID,
  MORE_WAYS_TO_FUND_ENTRIES,
  isBankOrCardPaymentType,
  resolveMoreWaysSelection,
  type MoreWaysToFundEntry,
} from './OnboardingFundWallet.constants';
import {
  OptionRow,
  SectionHeader,
  RampsPaymentMethodIcon,
  getPaymentMethodDescription,
} from './OnboardingFundWallet.components';
import { navigateFromOnboardingToBuyFlow } from './navigateFromOnboardingToBuyFlow';
import { navigateFromOnboardingToReceiveFlow } from './navigateFromOnboardingToReceiveFlow';
import MoreWaysToFundBottomSheet from './MoreWaysToFundBottomSheet';
import { useRampsController } from '../../UI/Ramp/hooks/useRampsController';
import { useRampsProviders } from '../../UI/Ramp/hooks/useRampsProviders';
import { providerSupportsAsset } from '../../UI/Ramp/utils/providerSupportsAsset';
import { MUSD_PLACEHOLDER } from '../../UI/Ramp/Deposit/constants/constants';

const OnboardingFundWallet = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const route =
    useRoute<RouteProp<RootStackParamList, 'OnboardingFundWallet'>>();
  const { onComplete, accountType: routeAccountType } = route.params;
  const reduxAccountType = useSelector(selectOnboardingAccountType);
  const selectedAccountGroup = useSelector(selectSelectedAccountGroup);

  const accountType = routeAccountType ?? reduxAccountType;

  // Drive ramps provider auto-selection while this onboarding screen is mounted.
  // For returning users / Transak regions this picks the preferred provider so
  // the payment-methods query can run. The effect is guarded by
  // `!selectedProvider`, so it's a no-op once a provider is already selected.
  useRampsProviders({ enableSideEffects: true });

  // Unified RampsController is the single source of truth for the payment list.
  // The legacy Deposit SDK is no longer used here.
  const {
    paymentMethods,
    paymentMethodsLoading,
    paymentMethodsFetching,
    paymentMethodsStatus,
    paymentMethodsError,
    setSelectedPaymentMethod,
    providers,
    providersLoading,
    selectedProvider,
    setSelectedProvider,
    tokens,
    tokensLoading,
    selectedToken,
    setSelectedToken,
    userRegion,
  } = useRampsController();

  // Seed a default token + provider so the payment-methods query can fire.
  // Priority: mUSD if a provider supports it, else the first topToken that
  // any provider supports. This guarantees the token→provider→paymentMethods
  // cascade always resolves for the user's region.
  const allAvailableTokens = useMemo(
    () => [...(tokens?.topTokens ?? []), ...(tokens?.allTokens ?? [])],
    [tokens],
  );

  const { defaultToken, defaultProvider } = useMemo(() => {
    if (allAvailableTokens.length === 0 || !providers?.length) {
      return { defaultToken: undefined, defaultProvider: undefined };
    }

    const musdAssetId = MUSD_PLACEHOLDER.assetId.toLowerCase();
    const musdToken = allAvailableTokens.find(
      (t) => t.assetId.toLowerCase() === musdAssetId,
    );

    // Try mUSD first with a supporting provider
    if (musdToken) {
      const provider = providers.find((p) =>
        providerSupportsAsset(p, musdToken.assetId),
      );
      if (provider) {
        return { defaultToken: musdToken, defaultProvider: provider };
      }
    }

    // Fallback: first topToken that any provider supports
    for (const token of tokens?.topTokens ?? []) {
      const provider = providers.find((p) =>
        providerSupportsAsset(p, token.assetId),
      );
      if (provider) {
        return { defaultToken: token, defaultProvider: provider };
      }
    }

    // Last resort: first token from allTokens
    for (const token of tokens?.allTokens ?? []) {
      const provider = providers.find((p) =>
        providerSupportsAsset(p, token.assetId),
      );
      if (provider) {
        return { defaultToken: token, defaultProvider: provider };
      }
    }

    return { defaultToken: undefined, defaultProvider: undefined };
  }, [allAvailableTokens, providers, tokens]);

  useEffect(() => {
    if (selectedToken || !defaultToken) return;

    try {
      setSelectedToken(defaultToken.assetId);
    } catch (e) {
      Logger.log('OnboardingFundWallet: failed to seed default token', e);
    }
  }, [selectedToken, defaultToken, setSelectedToken]);

  useEffect(() => {
    if (!selectedProvider && defaultProvider) {
      setSelectedProvider(defaultProvider, { autoSelected: true });
    }
  }, [selectedProvider, defaultProvider, setSelectedProvider]);

  const effectiveAssetId = selectedToken?.assetId;

  // Surface only bank/card methods in the top section; wallets and other
  // provider-specific methods live in the unified flow / curated "More ways".
  const bankAndCard = useMemo(
    () =>
      (paymentMethods ?? []).filter((paymentMethod) =>
        isBankOrCardPaymentType(paymentMethod.paymentType),
      ),
    [paymentMethods],
  );

  const hasError = Boolean(paymentMethodsError);

  // We're still resolving the bank/card list whenever the query is in-flight, or
  // while we are still seeding the token/provider selection that enables it
  // (region/providers/tokens loading, a default token about to be applied, or a
  // supporting provider about to be selected). Anything outside these cases is a
  // settled "no eligible methods" state, so we show the unavailable message
  // rather than spinning forever.
  const isSeedingSelection =
    providersLoading ||
    tokensLoading ||
    !selectedToken ||
    (!selectedProvider && Boolean(defaultProvider));

  const isQueryRunning =
    paymentMethodsLoading ||
    paymentMethodsStatus === 'loading' ||
    (paymentMethodsFetching && bankAndCard.length === 0);

  const isResolvingPaymentMethods =
    !hasError &&
    (isQueryRunning || (paymentMethodsStatus === 'idle' && isSeedingSelection));

  const isBankAndCardEmpty =
    !isResolvingPaymentMethods && !hasError && bankAndCard.length === 0;

  useEffect(() => {
    if (paymentMethodsError) {
      Logger.log(
        'OnboardingFundWallet: failed to load payment methods',
        paymentMethodsError,
      );
    }
  }, [paymentMethodsError]);

  // TODO: Remove — temporary debug logging for demo
  useEffect(() => {
    console.log('[FundWallet] --- state snapshot ---');
    console.log(
      '[FundWallet] userRegion:',
      userRegion?.regionCode,
      userRegion?.country?.currency,
    );
    console.log(
      '[FundWallet] topTokens:',
      tokens?.topTokens?.slice(0, 5)?.map((t) => t.symbol),
    );
    console.log('[FundWallet] allTokens count:', tokens?.allTokens?.length);
    console.log(
      '[FundWallet] selectedToken:',
      selectedToken?.symbol,
      selectedToken?.assetId,
    );
    console.log(
      '[FundWallet] selectedProvider:',
      selectedProvider?.id,
      selectedProvider?.name,
    );
    console.log(
      '[FundWallet] defaultToken:',
      defaultToken?.symbol,
      defaultToken?.assetId,
    );
    console.log(
      '[FundWallet] defaultProvider:',
      defaultProvider?.id,
      defaultProvider?.name,
    );
    console.log(
      '[FundWallet] providers:',
      providers?.map((p) => ({
        id: p.id,
        name: p.name,
        supportsMusd: p.supportedCryptoCurrencies?.[effectiveAssetId ?? ''],
        supportedCryptoCount: Object.keys(p.supportedCryptoCurrencies ?? {})
          .length,
        supportedPayments: Object.keys(p.supportedPaymentMethods ?? {}),
      })),
    );
    console.log('[FundWallet] paymentMethodsStatus:', paymentMethodsStatus);
    console.log('[FundWallet] paymentMethodsLoading:', paymentMethodsLoading);
    console.log('[FundWallet] paymentMethodsError:', paymentMethodsError);
    console.log(
      '[FundWallet] paymentMethods:',
      paymentMethods?.map((pm) => ({
        id: pm.id,
        name: pm.name,
        type: pm.paymentType,
      })),
    );
    console.log(
      '[FundWallet] bankAndCard:',
      bankAndCard?.map((pm) => ({
        id: pm.id,
        name: pm.name,
        type: pm.paymentType,
      })),
    );
  }, [
    userRegion,
    tokens,
    selectedToken,
    selectedProvider,
    defaultToken,
    defaultProvider,
    providers,
    effectiveAssetId,
    paymentMethodsStatus,
    paymentMethodsLoading,
    paymentMethodsError,
    paymentMethods,
    bankAndCard,
  ]);

  const hasTrackedView = React.useRef(false);
  useEffect(() => {
    if (hasTrackedView.current) return;
    hasTrackedView.current = true;
    trackEvent(
      createEventBuilder(MetaMetricsEvents.ONBOARDING_QUESTION_VIEWED)
        .addProperties({
          question_type: 'fund_wallet',
          ...(accountType && { account_type: accountType }),
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder, accountType]);

  const trackSubmitted = useCallback(
    (selectedFundMethod: string) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.ONBOARDING_QUESTION_SUBMITTED)
          .addProperties({
            question_type: 'fund_wallet',
            selected_fund_method: selectedFundMethod,
            skipped: false,
            ...(accountType && { account_type: accountType }),
          })
          .build(),
      );
    },
    [trackEvent, createEventBuilder, accountType],
  );

  const [isMoreWaysSheetVisible, setIsMoreWaysSheetVisible] = useState(false);

  const onBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const onSkip = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.ONBOARDING_QUESTION_SUBMITTED)
        .addProperties({
          question_type: 'fund_wallet',
          skipped: true,
          ...(accountType && { account_type: accountType }),
        })
        .build(),
    );

    onComplete();
  }, [trackEvent, createEventBuilder, accountType, onComplete]);

  // Bank/card methods pre-select in the unified RampsController state, then open
  // the unified Buy v2 flow so the payment screen opens with the choice applied.
  const handlePaymentMethodPress = useCallback(
    (paymentMethod: PaymentMethod) => {
      trackSubmitted(paymentMethod.id);
      setSelectedPaymentMethod(paymentMethod);
      navigateFromOnboardingToBuyFlow(navigation);
    },
    [trackSubmitted, setSelectedPaymentMethod, navigation],
  );

  // Curated "More ways to fund" entries pre-select their specific provider /
  // payment method (when eligible for the region) so the unified Buy v2 flow
  // opens that checkout directly (PayPal's external browser, Revolut's redirect,
  // Google Pay, etc.). When nothing eligible is found we open the flow without a
  // pre-selection so the user can still pick a method there.
  const handleMoreWaysPress = useCallback(
    (entry: MoreWaysToFundEntry) => {
      if (entry.id === 'more_payment_methods') {
        setIsMoreWaysSheetVisible(true);
        return;
      }

      trackSubmitted(entry.id);

      const selection = resolveMoreWaysSelection(entry, {
        providers: providers ?? [],
        paymentMethods: paymentMethods ?? [],
      });

      if (selection.kind === 'paymentMethod') {
        setSelectedPaymentMethod(selection.paymentMethod);
      } else if (selection.kind === 'provider') {
        setSelectedProvider(selection.provider);
      }

      navigateFromOnboardingToBuyFlow(navigation);
    },
    [
      trackSubmitted,
      providers,
      paymentMethods,
      setSelectedPaymentMethod,
      setSelectedProvider,
      navigation,
    ],
  );

  const handleReceivePress = useCallback(() => {
    trackSubmitted(RECEIVE_EXTERNAL_OPTION_ID);

    if (!selectedAccountGroup?.id) {
      Logger.error(
        new Error(
          'OnboardingFundWallet::handleReceivePress - Missing selectedAccountGroup',
        ),
      );
      return;
    }

    navigateFromOnboardingToReceiveFlow(navigation, {
      groupId: selectedAccountGroup.id,
    });
  }, [trackSubmitted, navigation, selectedAccountGroup?.id]);

  const handleMoreWaysSheetClose = useCallback(() => {
    setIsMoreWaysSheetVisible(false);
  }, []);

  const handleMoreWaysSheetSelect = useCallback(
    (id: string) => {
      trackSubmitted(id);
      setIsMoreWaysSheetVisible(false);
      navigateFromOnboardingToBuyFlow(navigation);
    },
    [trackSubmitted, navigation],
  );

  return (
    <View
      style={tw.style('flex-1')}
      testID={OnboardingFundWalletTestIds.SCREEN}
    >
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
      >
        <HeaderCompactStandard
          includesTopInset
          onBack={onBack}
          backButtonProps={{
            testID: OnboardingFundWalletTestIds.BACK_BUTTON,
          }}
          endAccessory={
            <Text
              variant={TextVariant.BodyLg}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextDefault}
              onPress={onSkip}
              testID={OnboardingFundWalletTestIds.SKIP_BUTTON}
            >
              {strings('onboarding_fund_wallet.skip')}
            </Text>
          }
        />

        <Box twClassName="mx-4 mb-6">
          <Text
            variant={TextVariant.DisplayMd}
            color={TextColor.TextDefault}
            fontWeight={FontWeight.Bold}
          >
            {strings('onboarding_fund_wallet.title')}
          </Text>
        </Box>

        <ScrollView
          style={tw.style('flex-1')}
          contentContainerStyle={tw.style('px-4 pb-4')}
          showsVerticalScrollIndicator={false}
        >
          <Box>
            <SectionHeader
              title={strings('onboarding_fund_wallet.section_bank_and_card')}
            />
            {isResolvingPaymentMethods ? (
              <ActivityIndicator
                testID={OnboardingFundWalletTestIds.PAYMENT_METHODS_LOADER}
                style={tw.style('py-4')}
              />
            ) : hasError ? (
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
                twClassName="py-4"
                testID={OnboardingFundWalletTestIds.PAYMENT_METHODS_ERROR}
              >
                {strings('onboarding_fund_wallet.payment_methods_error')}
              </Text>
            ) : isBankAndCardEmpty ? (
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
                twClassName="py-4"
                testID={OnboardingFundWalletTestIds.PAYMENT_METHODS_UNAVAILABLE}
              >
                {strings(
                  'onboarding_fund_wallet.payment_methods_unavailable_region',
                )}
              </Text>
            ) : (
              <Box flexDirection={BoxFlexDirection.Column}>
                {bankAndCard.map((paymentMethod) => (
                  <OptionRow
                    key={paymentMethod.id}
                    testID={`${OnboardingFundWalletTestIds.OPTION_PREFIX}${paymentMethod.id}`}
                    label={paymentMethod.name}
                    description={getPaymentMethodDescription(paymentMethod)}
                    onPress={() => handlePaymentMethodPress(paymentMethod)}
                    icon={
                      <RampsPaymentMethodIcon paymentMethod={paymentMethod} />
                    }
                  />
                ))}
              </Box>
            )}
          </Box>

          <Box twClassName="mt-2 border-t border-border-muted pt-4">
            <SectionHeader
              title={strings('onboarding_fund_wallet.section_crypto')}
            />
            <Box flexDirection={BoxFlexDirection.Column}>
              <OptionRow
                testID={`${OnboardingFundWalletTestIds.OPTION_PREFIX}${RECEIVE_EXTERNAL_OPTION_ID}`}
                label={strings(
                  'onboarding_fund_wallet.option_receive_external',
                )}
                description={strings(
                  'onboarding_fund_wallet.option_receive_external_description',
                )}
                onPress={handleReceivePress}
                icon={
                  <Icon
                    name={IconName.SwapHorizontal}
                    size={IconSize.Md}
                    color={IconColor.IconAlternative}
                  />
                }
              />
            </Box>
          </Box>

          <Box twClassName="mt-2 border-t border-border-muted pt-4">
            <SectionHeader
              title={strings('onboarding_fund_wallet.section_more_ways')}
            />
            <Box flexDirection={BoxFlexDirection.Column}>
              {MORE_WAYS_TO_FUND_ENTRIES.map((entry) => (
                <OptionRow
                  key={entry.id}
                  testID={`${OnboardingFundWalletTestIds.OPTION_PREFIX}${entry.id}`}
                  label={strings(entry.labelKey)}
                  description={strings(entry.descriptionKey)}
                  onPress={() => handleMoreWaysPress(entry)}
                  icon={
                    entry.image ? (
                      <Image
                        source={entry.image}
                        style={tw.style('h-6 w-6')}
                        resizeMode="contain"
                      />
                    ) : (
                      <Icon
                        name={entry.icon ?? IconName.Card}
                        size={IconSize.Md}
                        color={IconColor.IconAlternative}
                      />
                    )
                  }
                />
              ))}
            </Box>
          </Box>
        </ScrollView>

        {isMoreWaysSheetVisible ? (
          <MoreWaysToFundBottomSheet
            onClose={handleMoreWaysSheetClose}
            onSelect={handleMoreWaysSheetSelect}
          />
        ) : null}
      </SafeAreaView>
    </View>
  );
};

export default OnboardingFundWallet;
