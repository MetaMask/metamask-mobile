import React, { useEffect, useCallback, useMemo } from 'react';
import { ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import {
  Box,
  Text,
  TextVariant,
  BoxFlexDirection,
  Icon,
  IconName,
  IconSize,
  IconColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import {
  CardTokenAllowance,
  DelegationSettingsResponse,
  CardExternalWalletDetailsResponse,
} from '../../types';
import useSpendingLimit, {
  LINEA_CAIP_CHAIN_ID,
} from '../../hooks/useSpendingLimit';
import useSpendingLimitData from '../../hooks/useSpendingLimitData';
import { AssetCard, LimitOptionItem } from './components';

interface SpendingLimitRouteParams {
  flow?: 'manage' | 'enable' | 'onboarding';
  selectedToken?: CardTokenAllowance;
  priorityToken?: CardTokenAllowance | null;
  allTokens?: CardTokenAllowance[];
  delegationSettings?: DelegationSettingsResponse | null;
  externalWalletDetailsData?:
    | {
        walletDetails: never[];
        mappedWalletDetails: never[];
        priorityWalletDetail: null;
      }
    | {
        walletDetails: CardExternalWalletDetailsResponse;
        mappedWalletDetails: CardTokenAllowance[];
        priorityWalletDetail: CardTokenAllowance | undefined;
      }
    | null;
}

interface SpendingLimitProps {
  route?: {
    params?: SpendingLimitRouteParams;
  };
}

/**
 * SpendingLimit Screen
 *
 * Allows users to select a token and set spending limits for their card.
 * Supports three flows: onboarding, enable, and manage.
 */
const SpendingLimit: React.FC<SpendingLimitProps> = ({ route }) => {
  const navigation = useNavigation();
  const theme = useTheme();
  const tw = useTailwind();

  // Route params
  const flow = route?.params?.flow || 'manage';
  const isOnboardingFlow = flow === 'onboarding';
  const selectedTokenFromRoute = route?.params?.selectedToken;
  const priorityToken = route?.params?.priorityToken ?? null;
  const routeAllTokens = route?.params?.allTokens;
  const routeDelegationSettings = route?.params?.delegationSettings;
  const externalWalletDetailsData = route?.params?.externalWalletDetailsData;

  // Fetch data for onboarding flow (when not passed via route)
  const {
    availableTokens: hookAvailableTokens,
    delegationSettings: hookDelegationSettings,
    isLoading: isLoadingHookData,
    error: hookError,
    fetchData: fetchHookData,
  } = useSpendingLimitData();

  useEffect(() => {
    if (isOnboardingFlow && !routeAllTokens) {
      fetchHookData();
    }
  }, [isOnboardingFlow, routeAllTokens, fetchHookData]);

  // Determine data sources
  const allTokens =
    routeAllTokens ?? (isOnboardingFlow ? hookAvailableTokens : []);
  const delegationSettings =
    routeDelegationSettings !== undefined
      ? routeDelegationSettings
      : isOnboardingFlow
        ? hookDelegationSettings
        : null;

  // Simplified spending limit hook
  const {
    selectedToken,
    limitType,
    customLimit,
    quickSelectTokens,
    isOtherSelected,
    isLoading,
    handleQuickSelectToken,
    handleOtherSelect,
    setLimitType,
    setCustomLimit,
    submit,
    cancel,
    skip,
    isValid,
    isSolanaSelected,
  } = useSpendingLimit({
    flow,
    initialToken: selectedTokenFromRoute,
    priorityToken,
    allTokens,
    delegationSettings,
    externalWalletDetailsData,
    routeParams: route?.params as Record<string, unknown> | undefined,
  });

  // Prevent navigation while loading
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!isLoading) return;
      e.preventDefault();
    });
    return unsubscribe;
  }, [navigation, isLoading]);

  // Check if a quick-select token is selected
  const isQuickSelectTokenSelected = useCallback(
    (symbol: string) => {
      if (!selectedToken) return false;
      return (
        selectedToken.symbol?.toUpperCase() === symbol.toUpperCase() &&
        selectedToken.caipChainId === LINEA_CAIP_CHAIN_ID
      );
    },
    [selectedToken],
  );

  // Get the appropriate title based on flow
  const screenTitle = useMemo(() => {
    if (flow === 'onboarding') {
      return strings('card.card_spending_limit.title_onboarding');
    }

    return strings('card.card_spending_limit.restricted_limit_title');
  }, [flow]);

  // Loading state for onboarding
  if (isOnboardingFlow && isLoadingHookData) {
    return (
      <SafeAreaView
        style={tw.style('flex-1 bg-background-default')}
        edges={['bottom']}
      >
        <Box twClassName="flex-1 justify-center items-center px-6">
          <ActivityIndicator
            size="large"
            color={theme.colors.primary.default}
          />
          <Text
            variant={TextVariant.BodyMd}
            twClassName="mt-4 text-text-alternative text-center"
          >
            {strings('card.card_spending_limit.loading')}
          </Text>
        </Box>
      </SafeAreaView>
    );
  }

  // Error state for onboarding
  if (isOnboardingFlow && hookError && !delegationSettings) {
    return (
      <SafeAreaView
        style={tw.style('flex-1 bg-background-default')}
        edges={['bottom']}
      >
        <Box twClassName="flex-1 justify-center items-center px-6">
          <Icon
            name={IconName.Danger}
            size={IconSize.Xl}
            color={IconColor.ErrorDefault}
          />
          <Text
            variant={TextVariant.BodyMd}
            twClassName="mt-4 mb-6 text-text-alternative text-center"
          >
            {strings('card.card_spending_limit.load_error')}
          </Text>
          <Box twClassName="w-full gap-3">
            <Button
              variant={ButtonVariants.Primary}
              label={strings('card.card_spending_limit.retry')}
              size={ButtonSize.Md}
              onPress={fetchHookData}
              width={ButtonWidthTypes.Full}
            />
            <Button
              variant={ButtonVariants.Secondary}
              label={strings('card.card_spending_limit.skip')}
              size={ButtonSize.Md}
              onPress={skip}
              width={ButtonWidthTypes.Full}
            />
          </Box>
        </Box>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-background-default')}
      edges={['bottom']}
    >
      <KeyboardAwareScrollView
        style={tw.style('flex-1 px-4')}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={false}
        enableOnAndroid
        enableAutomaticScroll
        contentContainerStyle={tw.style('flex-grow pb-4')}
      >
        {/* Header copy */}
        <Box twClassName="mb-6">
          <Text
            variant={TextVariant.HeadingLg}
            twClassName="text-text-default py-4"
          >
            {screenTitle}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-text-alternative"
          >
            {strings('card.card_spending_limit.setup_description')}
          </Text>
        </Box>

        {/* Asset Section */}
        <Box twClassName="mb-6">
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-default mb-3 font-medium"
          >
            {strings('card.card_spending_limit.asset_label')}
          </Text>

          {/* Asset Cards Row */}
          <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-3">
            {quickSelectTokens.map(({ symbol, token }) => (
              <AssetCard
                key={symbol}
                symbol={symbol}
                tokenAddress={token?.address ?? undefined}
                stagingTokenAddress={token?.stagingTokenAddress ?? undefined}
                isSelected={isQuickSelectTokenSelected(symbol)}
                onPress={() => handleQuickSelectToken(symbol)}
                testID={`asset-card-${symbol.toLowerCase()}`}
              />
            ))}
            <AssetCard
              symbol={strings('card.card_spending_limit.other_token')}
              isSelected={isOtherSelected}
              isOther
              onPress={handleOtherSelect}
              testID="asset-card-other"
            />
          </Box>
        </Box>

        {/* Limit Section */}
        <Box twClassName="mb-6">
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-default mb-3 font-medium"
          >
            {strings('card.card_spending_limit.limit_label')}
          </Text>

          <Box twClassName="bg-background-muted rounded-xl px-4 py-1">
            <LimitOptionItem
              title={strings('card.card_spending_limit.full_access_title')}
              description={strings(
                'card.card_spending_limit.full_access_description',
              )}
              isSelected={limitType === 'full'}
              onPress={() => setLimitType('full')}
              testID="limit-option-full"
            />

            <LimitOptionItem
              title={strings('card.card_spending_limit.restricted_limit_title')}
              description={strings(
                'card.card_spending_limit.restricted_limit_description',
              )}
              isSelected={limitType === 'restricted'}
              onPress={() => setLimitType('restricted')}
              showInput
              inputValue={customLimit}
              onInputChange={setCustomLimit}
              testID="limit-option-restricted"
            />
          </Box>
        </Box>

        {/* Spacer to push buttons to bottom */}
        <Box twClassName="flex-1" />

        {/* Footer Buttons */}
        <Box twClassName="gap-3 mt-6">
          {/* Solana Warning */}
          {isSolanaSelected && (
            <Box
              flexDirection={BoxFlexDirection.Row}
              twClassName="p-3 bg-warning-muted rounded-lg items-center"
            >
              <Icon
                name={IconName.Info}
                size={IconSize.Sm}
                color={IconColor.WarningDefault}
              />
              <Text
                variant={TextVariant.BodySm}
                twClassName="flex-1 ml-2 text-warning-default"
              >
                {strings('card.card_spending_limit.solana_not_supported')}
              </Text>
            </Box>
          )}

          <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-3">
            <Box twClassName="flex-1">
              <Button
                variant={ButtonVariants.Secondary}
                label={strings('card.card_spending_limit.cancel')}
                size={ButtonSize.Lg}
                onPress={isOnboardingFlow ? skip : cancel}
                width={ButtonWidthTypes.Full}
                isDisabled={isLoading}
              />
            </Box>
            <Box twClassName="flex-1">
              <Button
                variant={ButtonVariants.Primary}
                label={strings('card.card_spending_limit.confirm_new_limit')}
                size={ButtonSize.Lg}
                onPress={submit}
                width={ButtonWidthTypes.Full}
                isDisabled={!isValid || isLoading}
                loading={isLoading}
              />
            </Box>
          </Box>
        </Box>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default SpendingLimit;
