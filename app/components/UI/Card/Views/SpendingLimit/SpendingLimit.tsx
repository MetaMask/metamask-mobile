import React, { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import {
  Box,
  Text,
  TextVariant,
  Icon,
  IconName,
  IconSize,
  IconColor,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import { selectAvatarAccountType } from '../../../../../selectors/settings';
import { useAccountGroupName } from '../../../../hooks/multichainAccounts/useAccountGroupName';
import { CardFundingToken } from '../../types';
import useSpendingLimit from '../../hooks/useSpendingLimit';
import { useCardHomeData } from '../../hooks/useCardHomeData';
import useSpendingLimitData from '../../hooks/useSpendingLimitData';
import { buildTokenIconUrl } from '../../util/buildTokenIconUrl';
import { mapCaipChainIdToChainName } from '../../util/mapCaipChainIdToChainName';
import { LINEA_CAIP_CHAIN_ID } from '../../util/buildTokenList';
import AccountRow from './components/AccountRow';
import TokenRow from './components/TokenRow';
import SpendAndEarnPromoCard from './components/SpendAndEarnPromoCard';
import { SpendingLimitSelectors } from './SpendingLimit.testIds';

interface SpendingLimitRouteParams {
  flow?: 'manage' | 'enable' | 'onboarding' | 'enable_card';
  selectedToken?: CardFundingToken;
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
  const selectedAccount = useSelector(selectSelectedInternalAccount);
  const avatarAccountType = useSelector(selectAvatarAccountType);
  const accountGroupName = useAccountGroupName();

  const flow = route?.params?.flow || 'manage';
  const isOnboardingFlow = flow === 'onboarding';
  const selectedTokenFromRoute = route?.params?.selectedToken;
  const {
    primaryToken,
    availableTokens: homeAvailableTokens,
    data: cardHomeData,
  } = useCardHomeData();
  const {
    availableTokens: hookAvailableTokens,
    delegationSettings: hookDelegationSettings,
    isLoading: isLoadingHookData,
    error: hookError,
    fetchData: fetchHookData,
  } = useSpendingLimitData();

  useEffect(() => {
    if (isOnboardingFlow && homeAvailableTokens.length === 0) {
      fetchHookData();
    }
  }, [isOnboardingFlow, homeAvailableTokens.length, fetchHookData]);

  const allTokens =
    homeAvailableTokens.length > 0
      ? homeAvailableTokens
      : isOnboardingFlow
        ? hookAvailableTokens
        : [];
  const delegationSettings =
    cardHomeData?.delegationSettings ??
    (isOnboardingFlow ? hookDelegationSettings : null);

  const {
    selectedToken,
    limitType,
    customLimit,
    isLoading,
    handleAccountSelect,
    handleOtherSelect,
    handleLimitSelect,
    submit,
    cancel,
    skip,
    isValid,
    isMoneyAccountSource,
    isMoneyAccountLocked,
    canShowMoneyAccountCta,
    selectMoneyAccountAsSource,
    moneyAccountTotalFiatFormatted,
    isMoneyAccountBalanceLoading,
    canLinkMoneyAccount,
    moneyAccountApyPercent,
    hasMetalCard,
  } = useSpendingLimit({
    flow,
    initialToken: selectedTokenFromRoute,
    priorityToken: primaryToken,
    allTokens,
    delegationSettings,
    routeParams: route?.params as Record<string, unknown> | undefined,
  });

  const isLoadingRef = useRef(isLoading);
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!isLoadingRef.current) return;
      e.preventDefault();
    });
    return unsubscribe;
  }, [navigation]);

  const tokenLabel = useMemo(() => {
    if (!selectedToken) return '';
    const chainId = selectedToken.caipChainId ?? LINEA_CAIP_CHAIN_ID;
    const networkName = mapCaipChainIdToChainName(chainId);
    return `${selectedToken.symbol} on ${networkName}`;
  }, [selectedToken]);

  const tokenIconUrl = useMemo(() => {
    if (!selectedToken) return null;
    const address = selectedToken.address ?? selectedToken.stagingTokenAddress;
    if (!address) return null;
    const chainId = selectedToken.caipChainId ?? LINEA_CAIP_CHAIN_ID;
    return buildTokenIconUrl(chainId, address);
  }, [selectedToken]);

  const spendingLimitLabel = useMemo(() => {
    if (limitType === 'full') {
      return strings('card.card_spending_limit.full_access_title');
    }
    return customLimit || '0';
  }, [limitType, customLimit]);

  const moneyAccountTokenDisplayLabel = useMemo(() => {
    const symbol = strings(
      'card.card_spending_limit.money_account_token_symbol',
    );
    if (moneyAccountTotalFiatFormatted) {
      return `${symbol} (${moneyAccountTotalFiatFormatted})`;
    }
    return symbol;
  }, [moneyAccountTotalFiatFormatted]);

  const shouldWaitForMoneyAccountBalance =
    (flow === 'onboarding' || flow === 'enable_card') && canLinkMoneyAccount;
  if (
    (isOnboardingFlow && isLoadingHookData) ||
    (shouldWaitForMoneyAccountBalance && isMoneyAccountBalanceLoading)
  ) {
    return (
      <SafeAreaView
        style={tw.style('flex-1 bg-background-default')}
        edges={['bottom']}
      >
        <Box twClassName="flex-1 justify-center items-center px-6">
          <ActivityIndicator
            testID={SpendingLimitSelectors.LOADING_INDICATOR}
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
              variant={ButtonVariant.Primary}
              size={ButtonSize.Md}
              onPress={fetchHookData}
              isFullWidth
            >
              {strings('card.card_spending_limit.retry')}
            </Button>
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Md}
              onPress={skip}
              isFullWidth
            >
              {strings('card.card_spending_limit.skip')}
            </Button>
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
            {strings('card.card_spending_limit.setup_title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-text-alternative"
          >
            {strings('card.card_spending_limit.setup_description')}
          </Text>
        </Box>

        {/* Settings card */}
        <Box twClassName="bg-background-muted rounded-2xl overflow-hidden mb-6">
          <AccountRow
            isMoneyAccountLocked={isMoneyAccountLocked}
            isMoneyAccountSource={isMoneyAccountSource}
            selectedAccount={selectedAccount ?? null}
            avatarAccountType={avatarAccountType}
            accountGroupName={accountGroupName ?? null}
            onPress={handleAccountSelect}
          />
          <TokenRow
            isMoneyAccountLocked={isMoneyAccountLocked}
            isMoneyAccountSource={isMoneyAccountSource}
            selectedToken={selectedToken}
            tokenIconUrl={tokenIconUrl}
            tokenLabel={tokenLabel}
            moneyAccountTokenDisplayLabel={moneyAccountTokenDisplayLabel}
            onPress={handleOtherSelect}
          />

          {/* Spending limit row */}
          <TouchableOpacity
            onPress={handleLimitSelect}
            activeOpacity={0.7}
            testID={SpendingLimitSelectors.SPENDING_LIMIT_ROW}
          >
            <Box twClassName="flex-row items-center p-4">
              <Text
                variant={TextVariant.BodyMd}
                twClassName="flex-1 text-text-alternative"
              >
                {strings('card.card_spending_limit.restricted_limit_title')}
              </Text>
              <Box twClassName="flex-row items-center gap-2 shrink min-w-0">
                <Text
                  variant={TextVariant.BodyMd}
                  twClassName="text-text-default font-medium self-center shrink"
                  numberOfLines={1}
                >
                  {spendingLimitLabel}
                </Text>
                <Icon
                  name={IconName.ArrowDown}
                  size={IconSize.Md}
                  color={IconColor.IconDefault}
                  style={tw.style('self-center shrink-0')}
                />
              </Box>
            </Box>
          </TouchableOpacity>
        </Box>

        {canShowMoneyAccountCta && (
          <SpendAndEarnPromoCard
            apyPercent={moneyAccountApyPercent}
            cashbackPercent={hasMetalCard ? 3 : 1}
            onPress={selectMoneyAccountAsSource}
          />
        )}

        {/* Spacer to push buttons to bottom */}
        <Box twClassName="flex-1" />

        {/* Footer Buttons */}
        <Box twClassName="gap-3 mt-6">
          <Box twClassName="flex-row gap-3">
            <Box twClassName="flex-1">
              <Button
                variant={ButtonVariant.Secondary}
                size={ButtonSize.Lg}
                onPress={isOnboardingFlow ? skip : cancel}
                isFullWidth
                isDisabled={isLoading}
              >
                {strings('card.card_spending_limit.cancel')}
              </Button>
            </Box>
            <Box twClassName="flex-1">
              <Button
                variant={ButtonVariant.Primary}
                size={ButtonSize.Lg}
                onPress={submit}
                isFullWidth
                isDisabled={!isValid || isLoading}
                isLoading={isLoading}
              >
                {strings('card.card_spending_limit.confirm_new_limit')}
              </Button>
            </Box>
          </Box>
        </Box>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default SpendingLimit;
