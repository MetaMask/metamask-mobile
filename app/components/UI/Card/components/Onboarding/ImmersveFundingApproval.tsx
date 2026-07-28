import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextVariant,
  Icon,
  IconName,
  IconSize,
  IconColor,
  HeaderStandard,
  AvatarAccount,
  AvatarToken,
  AvatarBaseSize,
  BadgeWrapper,
  BadgeWrapperPosition,
  BadgeNetwork,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { useParams } from '../../../../../util/navigation/navUtils';
import { useTheme } from '../../../../../util/theme';
import { useCardHeaderHandlers } from '../../hooks/useCardHeaderHandlers';
import { selectImmersveFundingSourceId } from '../../../../../core/redux/slices/card';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import { selectAvatarAccountType } from '../../../../../selectors/settings';
import { useAccountGroupName } from '../../../../hooks/multichainAccounts/useAccountGroupName';
import { AvatarAccountType } from '../../../../../component-library/components/Avatars/Avatar';
import { getAvatarAccountVariant } from '../../../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
import { getNetworkImageSource } from '../../../../../util/networks';
import { useImmersveSpendingPrerequisites } from '../../hooks/useImmersveSpendingPrerequisites';
import { useImmersveFunding } from '../../hooks/useImmersveFunding';
import { useImmersveOnboardingRouter } from '../../hooks/useImmersveOnboardingRouter';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { CardScreens } from '../../util/metrics';
import {
  KYC_REDIRECT_URL,
  BAANX_MAX_LIMIT,
  cardNetworkInfos,
  BASE_USDC_TOKEN_ADDRESS,
} from '../../constants';
import { buildTokenIconUrl } from '../../util/buildTokenIconUrl';
import { safeFormatChainIdToHex } from '../../util/safeFormatChainIdToHex';

const BASE_CAIP_CHAIN_ID = cardNetworkInfos.base.caipChainId;
const BASE_NETWORK_IMAGE = getNetworkImageSource({
  chainId: safeFormatChainIdToHex(BASE_CAIP_CHAIN_ID),
});
// Always the real Base-mainnet USDC address, regardless of env — the icon CDN
// doesn't index per-env testnet token addresses (e.g. Base Sepolia's USDC),
// and this is display-only (the approve call uses the real API-provided
// contract address).
const TOKEN_ICON_URL = buildTokenIconUrl(
  BASE_CAIP_CHAIN_ID,
  BASE_USDC_TOKEN_ADDRESS,
);

const ReadOnlyAccountRow = ({
  selectedAccount,
  avatarAccountType,
  accountGroupName,
}: {
  selectedAccount: InternalAccount | null;
  avatarAccountType: AvatarAccountType;
  accountGroupName: string | null;
}) => (
  <Box
    twClassName="flex-row items-center p-4"
    testID="immersve-funding-approval-account-row"
  >
    <Text
      variant={TextVariant.BodyMd}
      twClassName="flex-1 text-text-alternative"
    >
      {strings('card.card_spending_limit.account_label')}
    </Text>
    {selectedAccount && (
      <Box twClassName="flex-row items-center gap-2 shrink min-w-0">
        <AvatarAccount
          address={selectedAccount.address}
          variant={getAvatarAccountVariant(avatarAccountType)}
          size={AvatarBaseSize.Sm}
        />
        <Text
          variant={TextVariant.BodyMd}
          twClassName="text-text-default font-medium self-center shrink"
          numberOfLines={1}
        >
          {accountGroupName ?? selectedAccount.metadata.name}
        </Text>
      </Box>
    )}
  </Box>
);

const ReadOnlyTokenRow = () => (
  <Box
    twClassName="flex-row items-center p-4"
    testID="immersve-funding-approval-token-row"
  >
    <Text
      variant={TextVariant.BodyMd}
      twClassName="flex-1 text-text-alternative"
    >
      {strings('card.card_spending_limit.token_label')}
    </Text>
    <Box twClassName="flex-row items-center gap-2 shrink min-w-0">
      <BadgeWrapper
        position={BadgeWrapperPosition.BottomRight}
        badge={
          BASE_NETWORK_IMAGE ? <BadgeNetwork src={BASE_NETWORK_IMAGE} /> : null
        }
      >
        <AvatarToken
          name="USDC"
          src={{ uri: TOKEN_ICON_URL }}
          size={AvatarBaseSize.Sm}
        />
      </BadgeWrapper>
      <Text
        variant={TextVariant.BodyMd}
        twClassName="text-text-default font-medium self-center shrink"
        numberOfLines={1}
      >
        USDC on Base
      </Text>
    </Box>
  </Box>
);

/**
 * Approves the Immersve `funding` prerequisite (an on-chain smart-contract
 * write, e.g. an ERC-20 approve on Base USDC) and, once settled, creates the
 * card. Reached only via useImmersveOnboardingRouter's `funding` case.
 * Mirrors SpendingLimit.tsx's onboarding layout (header copy + read-only
 * settings card + footer button).
 */
const ImmersveFundingApproval = () => {
  const navigation = useNavigation();
  const tw = useTailwind();
  const theme = useTheme();
  const headerHandlers = useCardHeaderHandlers('close-direct');
  const { countryKey } = useParams<{ countryKey?: string }>();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const fundingSourceId = useSelector(selectImmersveFundingSourceId);
  const route = useImmersveOnboardingRouter();
  const hasCreatedCard = useRef(false);
  const [isSettling, setIsSettling] = useState(false);

  const selectAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );
  const selectedAccount = selectAccountByScope('eip155:0');
  const avatarAccountType = useSelector(selectAvatarAccountType);
  const accountGroupName = useAccountGroupName();

  const { nextAction, error, isLoading, refresh } =
    useImmersveSpendingPrerequisites({
      fundingSourceId: fundingSourceId ?? undefined,
      kycRegion: countryKey,
      kycRedirectUrl: KYC_REDIRECT_URL,
    });
  const {
    executeFunding,
    createCard,
    isLoading: fundingIsLoading,
    error: fundingError,
  } = useImmersveFunding();

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({ screen: CardScreens.FUNDING_APPROVAL })
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  // Local settlement poll: only runs after the user submits the approve tx,
  // while Immersve hasn't yet observed it on-chain. Never fires before that —
  // sitting on the confirm screen doing nothing shouldn't trigger background
  // polling (that was the source of the button/spinner flicker).
  useEffect(() => {
    if (!isSettling) {
      return undefined;
    }
    const id = setInterval(() => {
      refresh().catch(() => undefined);
    }, 5000);
    return () => clearInterval(id);
  }, [isSettling, refresh]);

  const handleCreateCard = useCallback(async () => {
    if (!fundingSourceId) {
      return;
    }
    hasCreatedCard.current = true;
    try {
      await createCard(fundingSourceId);
      navigation.reset({
        index: 0,
        routes: [{ name: Routes.CARD.HOME }],
      });
    } catch {
      hasCreatedCard.current = false;
    }
  }, [createCard, fundingSourceId, navigation]);

  const handleApprove = useCallback(() => {
    if (!nextAction || nextAction.type !== 'funding') {
      return;
    }

    setIsSettling(true);
    executeFunding(nextAction.write, BAANX_MAX_LIMIT)
      .then(() => refresh())
      .catch(() => setIsSettling(false));
  }, [nextAction, executeFunding, refresh]);

  useEffect(() => {
    if (!nextAction) {
      return;
    }
    if (nextAction.type === 'active') {
      setIsSettling(false);
      if (!hasCreatedCard.current) {
        handleCreateCard();
      }
    } else if (nextAction.type !== 'funding') {
      // Defensive fallback (resume/regression edge case) — this screen is only
      // reached via the 'funding' next-action; anything else routes normally.
      setIsSettling(false);
      route(nextAction, { countryKey });
    }
  }, [nextAction, handleCreateCard, route, countryKey]);

  // Only a real executeFunding/createCard failure surfaces as a blocking error
  // here — a transient poll-only error during the settlement background poll
  // just self-heals on the next tick, it must not flash the button into an
  // error/retry state while a submit is still legitimately in flight.
  const handleRetry = useCallback(() => {
    if (nextAction?.type === 'active') {
      handleCreateCard();
    } else {
      handleApprove();
    }
  }, [nextAction, handleCreateCard, handleApprove]);

  const busy = fundingIsLoading || isSettling;
  const displayError = fundingError;

  if (!nextAction && isLoading) {
    return (
      <SafeAreaView
        style={tw.style('flex-1 bg-background-default')}
        edges={['bottom']}
      >
        <HeaderStandard
          includesTopInset
          twClassName="bg-background-default"
          {...headerHandlers}
        />
        <Box twClassName="flex-1 justify-center items-center px-6">
          <ActivityIndicator
            testID="immersve-funding-approval-spinner"
            size="large"
            color={theme.colors.primary.default}
          />
          <Text
            variant={TextVariant.BodyMd}
            twClassName="mt-4 text-text-alternative text-center"
          >
            {strings(
              'card.card_onboarding.immersve_funding_approval.helper_text',
            )}
          </Text>
        </Box>
      </SafeAreaView>
    );
  }

  if (!nextAction && error) {
    return (
      <SafeAreaView
        style={tw.style('flex-1 bg-background-default')}
        edges={['bottom']}
      >
        <HeaderStandard
          includesTopInset
          twClassName="bg-background-default"
          {...headerHandlers}
        />
        <Box twClassName="flex-1 justify-center items-center px-6">
          <Icon
            name={IconName.Danger}
            size={IconSize.Xl}
            color={IconColor.ErrorDefault}
          />
          <Text
            variant={TextVariant.BodyMd}
            twClassName="mt-4 mb-6 text-text-alternative text-center"
            testID="immersve-funding-approval-error"
          >
            {error}
          </Text>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Md}
            onPress={() => refresh().catch(() => undefined)}
            isFullWidth
            testID="immersve-funding-approval-retry-button"
          >
            {strings(
              'card.card_onboarding.immersve_funding_approval.retry_button',
            )}
          </Button>
        </Box>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-background-default')}
      edges={['bottom']}
    >
      <HeaderStandard
        includesTopInset
        twClassName="bg-background-default"
        {...headerHandlers}
      />
      <KeyboardAwareScrollView
        style={tw.style('flex-1 px-4')}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={false}
        enableOnAndroid
        enableAutomaticScroll
        contentContainerStyle={tw.style('flex-grow pb-4')}
      >
        <Box twClassName="mb-6">
          <Text
            variant={TextVariant.HeadingLg}
            twClassName="text-text-default py-4"
          >
            {strings('card.card_onboarding.immersve_funding_approval.title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-text-alternative"
          >
            {strings(
              'card.card_onboarding.immersve_funding_approval.description',
            )}
          </Text>
        </Box>

        <Box twClassName="bg-background-muted rounded-2xl overflow-hidden mb-6">
          <ReadOnlyAccountRow
            selectedAccount={selectedAccount ?? null}
            avatarAccountType={avatarAccountType}
            accountGroupName={accountGroupName}
          />
          <ReadOnlyTokenRow />
        </Box>

        {displayError && (
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-center text-error-default px-4 mb-4"
            testID="immersve-funding-approval-error"
          >
            {displayError}
          </Text>
        )}

        <Box twClassName="flex-1" />

        <Box twClassName="gap-3 mt-6">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            isDisabled={busy}
            isLoading={busy}
            onPress={displayError ? handleRetry : handleApprove}
            testID={
              displayError
                ? 'immersve-funding-approval-retry-button'
                : 'immersve-funding-approval-confirm-button'
            }
          >
            {strings(
              displayError
                ? 'card.card_onboarding.immersve_funding_approval.retry_button'
                : 'card.card_onboarding.immersve_funding_approval.confirm_button',
            )}
          </Button>
        </Box>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default ImmersveFundingApproval;
