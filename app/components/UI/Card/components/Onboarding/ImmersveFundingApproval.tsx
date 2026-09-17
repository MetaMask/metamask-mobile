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
import { selectCardHomeData } from '../../../../../selectors/cardController';
import { selectAvatarAccountType } from '../../../../../selectors/settings';
import { getMemoizedInternalAccountByAddress } from '../../../../../selectors/accountsController';
import { selectAccountToGroupMap } from '../../../../../selectors/multichainAccounts/accountTreeController';
import type { RootState } from '../../../../../reducers';
import { useAccountGroupName } from '../../../../hooks/multichainAccounts/useAccountGroupName';
import { AvatarAccountType } from '../../../../../component-library/components/Avatars/Avatar';
import { getAvatarAccountVariant } from '../../../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
import { getNetworkImageSource } from '../../../../../util/networks';
import { areAddressesEqual } from '../../../../../util/address';
import Engine from '../../../../../core/Engine';
import { useImmersveSpendingPrerequisites } from '../../hooks/useImmersveSpendingPrerequisites';
import { useImmersveFunding } from '../../hooks/useImmersveFunding';
import { useImmersveOnboardingRouter } from '../../hooks/useImmersveOnboardingRouter';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { CardActions, CardScreens, withCardProvider } from '../../util/metrics';
import { CardProviderIds } from '../../../../../core/Engine/controllers/card-controller/provider-types';
import { resolveCardFundingAddress } from '../../util/resolveCardFundingAddress';
import {
  KYC_REDIRECT_URL,
  BAANX_MAX_LIMIT,
  cardNetworkInfos,
  BASE_USDC_TOKEN_ADDRESS,
} from '../../constants';
import { buildTokenIconUrl } from '../../util/buildTokenIconUrl';
import { safeFormatChainIdToHex } from '../../util/safeFormatChainIdToHex';

type FundingApprovalMode = 'onboarding' | 'reapprove';

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
 * Approves Immersve funding (an on-chain ERC-20 approve on Base USDC).
 *
 * Two modes share this screen:
 * - `onboarding` (default): derives the write from spending prerequisites,
 * settles via poll, then creates the card. Reached via the `funding`
 * next-action from useImmersveOnboardingRouter.
 * - `reapprove`: builds the approve locally (prerequisites still report
 * everything ok after a revoke) and returns to Card Home. No createCard.
 */
const ImmersveFundingApproval = () => {
  const navigation = useNavigation();
  const tw = useTailwind();
  const theme = useTheme();
  const {
    countryKey,
    mode = 'onboarding',
    fundingAddress,
  } = useParams<{
    countryKey?: string;
    mode?: FundingApprovalMode;
    fundingAddress?: string;
  }>();
  const isReapprove = mode === 'reapprove';
  const headerHandlers = useCardHeaderHandlers(
    isReapprove ? 'back' : 'close-direct',
  );
  const { trackEvent, createEventBuilder } = useAnalytics();
  const fundingSourceId = useSelector(selectImmersveFundingSourceId);
  const route = useImmersveOnboardingRouter();
  const hasCreatedCard = useRef(false);
  const [isSettling, setIsSettling] = useState(false);

  const selectAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );
  const selectedAccount = selectAccountByScope('eip155:0');
  const cardHomeData = useSelector(selectCardHomeData);
  const resolvedFundingAddress = resolveCardFundingAddress({
    preferredAddress: fundingAddress,
    primaryFundingWalletAddress:
      cardHomeData?.primaryFundingAsset?.walletAddress,
    selectedEvmAddress: selectedAccount?.address,
  });
  const fundingAccount = useSelector((state: RootState) =>
    resolvedFundingAddress
      ? getMemoizedInternalAccountByAddress(state, resolvedFundingAddress)
      : undefined,
  );
  const accountToGroupMap = useSelector(selectAccountToGroupMap);
  const displayAccount = fundingAccount ?? selectedAccount ?? null;
  const avatarAccountType = useSelector(selectAvatarAccountType);
  const selectedGroupName = useAccountGroupName();
  const accountGroupName =
    displayAccount &&
    selectedAccount &&
    areAddressesEqual(displayAccount.address, selectedAccount.address)
      ? selectedGroupName
      : ((displayAccount
          ? accountToGroupMap[displayAccount.id]?.metadata.name
          : null) ?? null);

  const { nextAction, error, isLoading, refresh } =
    useImmersveSpendingPrerequisites({
      fundingSourceId: fundingSourceId ?? undefined,
      kycRegion: countryKey,
      kycRedirectUrl: KYC_REDIRECT_URL,
    });
  const {
    executeFunding,
    createCard,
    buildApproveWrite,
    isLoading: fundingIsLoading,
    error: fundingError,
  } = useImmersveFunding({ fundingAddress: resolvedFundingAddress });

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties(
          withCardProvider(CardProviderIds.Immersve, {
            screen: CardScreens.FUNDING_APPROVAL,
            mode,
          }),
        )
        .build(),
    );
  }, [trackEvent, createEventBuilder, mode]);

  useEffect(() => {
    if (isReapprove) {
      return;
    }
    refresh().catch(() => undefined);
  }, [refresh, isReapprove]);

  // Local settlement poll: only runs after the user submits the approve tx,
  // while Immersve hasn't yet observed it on-chain. Never fires before that —
  // sitting on the confirm screen doing nothing shouldn't trigger background
  // polling (that was the source of the button/spinner flicker).
  // Reapprove skips this: the card already exists, so there is nothing for
  // Immersve to observe before we can return to Card Home.
  useEffect(() => {
    if (isReapprove || !isSettling) {
      return undefined;
    }
    const id = setInterval(() => {
      refresh().catch(() => undefined);
    }, 5000);
    return () => clearInterval(id);
  }, [isSettling, refresh, isReapprove]);

  const handleCreateCard = useCallback(async () => {
    if (!fundingSourceId) {
      return;
    }
    if (cardHomeData?.card) {
      navigation.reset({
        index: 0,
        routes: [{ name: Routes.CARD.HOME }],
      });
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
  }, [cardHomeData?.card, createCard, fundingSourceId, navigation]);

  const runApprove = useCallback(() => {
    if (isReapprove) {
      try {
        const write = buildApproveWrite(BAANX_MAX_LIMIT);
        setIsSettling(true);
        executeFunding(write, BAANX_MAX_LIMIT)
          .then(async () => {
            await Engine.context.CardController.fetchCardHomeData({
              force: true,
            }).catch(() => undefined);
            navigation.reset({
              index: 0,
              routes: [{ name: Routes.CARD.HOME }],
            });
          })
          .catch(() => setIsSettling(false));
      } catch {
        return;
      }
      return;
    }

    if (!nextAction || nextAction.type !== 'funding') {
      return;
    }

    setIsSettling(true);
    executeFunding(nextAction.write, BAANX_MAX_LIMIT)
      .then(() => refresh())
      .catch(() => setIsSettling(false));
  }, [
    isReapprove,
    buildApproveWrite,
    nextAction,
    executeFunding,
    refresh,
    navigation,
  ]);

  const handleApprove = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties(
          withCardProvider(CardProviderIds.Immersve, {
            action: CardActions.FUNDING_APPROVAL_CONFIRM,
            mode,
          }),
        )
        .build(),
    );
    runApprove();
  }, [runApprove, trackEvent, createEventBuilder, mode]);

  useEffect(() => {
    if (isReapprove || !nextAction) {
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
  }, [nextAction, handleCreateCard, route, countryKey, isReapprove]);

  // Only a real executeFunding/createCard failure surfaces as a blocking error
  // here — a transient poll-only error during the settlement background poll
  // just self-heals on the next tick, it must not flash the button into an
  // error/retry state while a submit is still legitimately in flight.
  const handleRetry = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties(
          withCardProvider(CardProviderIds.Immersve, {
            action: CardActions.FUNDING_APPROVAL_RETRY,
            next_action: nextAction?.type,
            mode,
          }),
        )
        .build(),
    );
    if (!isReapprove && nextAction?.type === 'active') {
      handleCreateCard();
    } else {
      runApprove();
    }
  }, [
    nextAction,
    handleCreateCard,
    runApprove,
    trackEvent,
    createEventBuilder,
    isReapprove,
    mode,
  ]);

  const busy = fundingIsLoading || isSettling;
  const displayError = fundingError;

  const titleKey = isReapprove
    ? 'card.card_onboarding.immersve_funding_approval.reapprove.title'
    : 'card.card_onboarding.immersve_funding_approval.title';
  const descriptionKey = isReapprove
    ? 'card.card_onboarding.immersve_funding_approval.reapprove.description'
    : 'card.card_onboarding.immersve_funding_approval.description';
  const confirmButtonKey = isReapprove
    ? 'card.card_onboarding.immersve_funding_approval.reapprove.confirm_button'
    : 'card.card_onboarding.immersve_funding_approval.confirm_button';

  if (!isReapprove && !nextAction && isLoading) {
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

  if (!isReapprove && !nextAction && error) {
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
            {strings(titleKey)}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-text-alternative"
          >
            {strings(descriptionKey)}
          </Text>
        </Box>

        <Box twClassName="bg-background-muted rounded-2xl overflow-hidden mb-6">
          <ReadOnlyAccountRow
            selectedAccount={displayAccount}
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
                : confirmButtonKey,
            )}
          </Button>
        </Box>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default ImmersveFundingApproval;
