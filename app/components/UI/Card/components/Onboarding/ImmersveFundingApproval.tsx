import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import {
  Box,
  Card,
  HelpText,
  HelpTextSeverity,
  KeyValueRow,
  Text,
  TextColor,
  TextVariant,
  IconSize,
  AvatarAccount,
  AvatarToken,
  AvatarBaseSize,
  BadgeWrapper,
  BadgeWrapperPosition,
  BadgeNetwork,
  Spinner,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { useParams } from '../../../../../util/navigation/navUtils';
import { type CardHeaderMode } from '../../hooks/useCardHeaderHandlers';
import OnboardingStep from './OnboardingStep';
import { selectImmersveFundingSourceId } from '../../../../../core/redux/slices/card';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import {
  selectCardHomeData,
  selectCardSelectedCountry,
} from '../../../../../selectors/cardController';
import { useIsImmersveMoneyAccountCountry } from '../../hooks/useImmersveFundingChannel';
import { MoneyAccountRow } from '../MoneyAccountRow/MoneyAccountRow';
import { useMoneyAccountCardLinkage } from '../../hooks/useMoneyAccountCardLinkage';
import {
  CardEntryPoint,
  CardActions,
  CardScreens,
  withCardProvider,
} from '../../util/metrics';
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
import {
  CardProviderError,
  CardProviderErrorCode,
  CardProviderIds,
} from '../../../../../core/Engine/controllers/card-controller/provider-types';
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

const getFundingApprovalDescriptionKey = (
  isMoneyAccountMode: boolean,
  isReapprove: boolean,
): string => {
  if (isMoneyAccountMode) {
    return 'card.card_onboarding.immersve_funding_approval.money_account_description';
  }
  if (isReapprove) {
    return 'card.card_onboarding.immersve_funding_approval.reapprove.description';
  }
  return 'card.card_onboarding.immersve_funding_approval.description';
};

const resolveFundingAccountGroupName = ({
  displayAccount,
  selectedAccount,
  selectedGroupName,
  accountGroupName,
}: {
  displayAccount: InternalAccount | null;
  selectedAccount: InternalAccount | null | undefined;
  selectedGroupName: string | null;
  accountGroupName: string | null;
}): string | null => {
  if (
    displayAccount &&
    selectedAccount &&
    areAddressesEqual(displayAccount.address, selectedAccount.address)
  ) {
    return selectedGroupName;
  }
  return accountGroupName;
};

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
  <KeyValueRow
    keyLabel={strings('card.card_spending_limit.account_label')}
    value={
      selectedAccount ? (accountGroupName ?? selectedAccount.metadata.name) : ''
    }
    valueStartAccessory={
      selectedAccount ? (
        <AvatarAccount
          address={selectedAccount.address}
          variant={getAvatarAccountVariant(avatarAccountType)}
          size={AvatarBaseSize.Sm}
        />
      ) : undefined
    }
    twClassName="p-4 h-auto"
    testID="immersve-funding-approval-account-row"
  />
);

const useMoneyAccountFundingApprove = ({
  isReapprove,
  confirmLinkInBackground,
  refresh,
  setIsSettling,
}: {
  isReapprove: boolean;
  confirmLinkInBackground: (options: {
    delegationAmountHuman: string;
    entrypoint: CardEntryPoint;
  }) => Promise<boolean>;
  refresh: () => Promise<unknown>;
  setIsSettling: (settling: boolean) => void;
}) => {
  const navigation = useNavigation();

  return useCallback(async () => {
    setIsSettling(true);
    try {
      const linked = await confirmLinkInBackground({
        delegationAmountHuman: BAANX_MAX_LIMIT,
        entrypoint: isReapprove
          ? CardEntryPoint.CARD_HOME_MONEY_ACCOUNT_CARD
          : CardEntryPoint.SIGN_UP,
      });
      if (!linked) {
        setIsSettling(false);
        return;
      }
      if (isReapprove) {
        try {
          await Engine.context.CardController.fetchCardHomeData({
            force: true,
          });
        } catch {
          // A failed refresh should not strand a completed reapprove.
        }
        navigation.reset({
          index: 0,
          routes: [{ name: Routes.CARD.HOME }],
        });
        return;
      }
      await refresh();
    } catch {
      setIsSettling(false);
    }
  }, [
    confirmLinkInBackground,
    isReapprove,
    navigation,
    refresh,
    setIsSettling,
  ]);
};

const ReadOnlyTokenRow = () => (
  <KeyValueRow
    keyLabel={strings('card.card_spending_limit.token_label')}
    value={strings(
      'card.card_onboarding.immersve_funding_approval.token_value',
    )}
    valueStartAccessory={
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
    }
    twClassName="p-4 h-auto"
    testID="immersve-funding-approval-token-row"
  />
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
  const headerMode: CardHeaderMode = isReapprove ? 'back' : 'close-direct';
  const { trackEvent, createEventBuilder } = useAnalytics();
  const selectedCountry = useSelector(selectCardSelectedCountry);
  const fundingCountry = countryKey ?? selectedCountry;
  const isMoneyAccountMode = useIsImmersveMoneyAccountCountry(fundingCountry);
  const { confirmLinkInBackground, isLinking } = useMoneyAccountCardLinkage();
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
  const accountGroupName = resolveFundingAccountGroupName({
    displayAccount,
    selectedAccount,
    selectedGroupName,
    accountGroupName: displayAccount
      ? (accountToGroupMap[displayAccount.id]?.metadata.name ?? null)
      : null,
  });

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
  } = useImmersveFunding({
    fundingAddress: resolvedFundingAddress,
    country: fundingCountry,
  });

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

  const goToCardHome = useCallback(async () => {
    await Engine.context.CardController.markMigrationCompleted().catch(
      () => undefined,
    );
    navigation.reset({
      index: 0,
      routes: [{ name: Routes.CARD.HOME }],
    });
  }, [navigation]);

  const handleCreateCard = useCallback(async () => {
    if (!fundingSourceId) {
      return;
    }
    if (cardHomeData?.card) {
      await goToCardHome();
      return;
    }
    hasCreatedCard.current = true;
    try {
      await createCard(fundingSourceId);
      await goToCardHome();
    } catch (createError) {
      const cardAlreadyExists =
        createError instanceof CardProviderError &&
        createError.code === CardProviderErrorCode.Conflict;
      if (!cardAlreadyExists) {
        hasCreatedCard.current = false;
        return;
      }
      // The link already created the card. A Conflict is success: refresh and
      // leave this screen instead of retrying the POST.
      await Engine.context.CardController.fetchCardHomeData({
        force: true,
      }).catch(() => undefined);
      await goToCardHome();
    }
  }, [cardHomeData?.card, createCard, fundingSourceId, goToCardHome]);

  const approveMoneyAccount = useMoneyAccountFundingApprove({
    isReapprove,
    confirmLinkInBackground,
    refresh,
    setIsSettling,
  });

  const runApprove = useCallback(() => {
    if (isMoneyAccountMode) {
      approveMoneyAccount().catch(() => undefined);
      return;
    }

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
    isMoneyAccountMode,
    approveMoneyAccount,
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

  const busy = fundingIsLoading || isSettling || isLinking;
  const displayError = fundingError;

  const titleKey = isReapprove
    ? 'card.card_onboarding.immersve_funding_approval.reapprove.title'
    : 'card.card_onboarding.immersve_funding_approval.title';
  const descriptionKey = getFundingApprovalDescriptionKey(
    isMoneyAccountMode,
    isReapprove,
  );
  const confirmButtonKey = isReapprove
    ? 'card.card_onboarding.immersve_funding_approval.reapprove.confirm_button'
    : 'card.card_onboarding.immersve_funding_approval.confirm_button';

  const isInitialLoading = !isReapprove && !nextAction && isLoading;
  const initialError = !isReapprove && !nextAction && !isLoading ? error : null;

  if (isInitialLoading) {
    return (
      <OnboardingStep
        title={strings(titleKey)}
        description={strings(descriptionKey)}
        headerMode={headerMode}
        formFields={
          <Box
            twClassName="flex-1 justify-center items-center gap-4"
            testID="immersve-funding-approval-loading"
          >
            <Spinner
              testID="immersve-funding-approval-spinner"
              spinnerIconProps={{ size: IconSize.Xl }}
            />
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              twClassName="text-center"
            >
              {strings(
                'card.card_onboarding.immersve_funding_approval.helper_text',
              )}
            </Text>
          </Box>
        }
        primaryButtonProps={{
          children: strings(confirmButtonKey),
          isDisabled: true,
          isLoading: true,
          testID: 'immersve-funding-approval-confirm-button',
        }}
      />
    );
  }

  if (initialError) {
    return (
      <OnboardingStep
        title={strings(titleKey)}
        description={strings(descriptionKey)}
        headerMode={headerMode}
        formFields={
          <HelpText
            severity={HelpTextSeverity.Danger}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            testID="immersve-funding-approval-error"
          >
            {initialError}
          </HelpText>
        }
        primaryButtonProps={{
          children: strings(
            'card.card_onboarding.immersve_funding_approval.retry_button',
          ),
          onPress: () => {
            refresh().catch(() => undefined);
          },
          testID: 'immersve-funding-approval-retry-button',
        }}
      />
    );
  }

  return (
    <OnboardingStep
      title={strings(titleKey)}
      description={strings(descriptionKey)}
      headerMode={headerMode}
      formFields={
        <>
          <Card
            testID="immersve-funding-approval-summary"
            twClassName="p-0 overflow-hidden"
          >
            {isMoneyAccountMode ? (
              <MoneyAccountRow testID="immersve-funding-approval-account-row" />
            ) : (
              <Box>
                <ReadOnlyAccountRow
                  selectedAccount={displayAccount}
                  avatarAccountType={avatarAccountType}
                  accountGroupName={accountGroupName}
                />
                <ReadOnlyTokenRow />
              </Box>
            )}
          </Card>
          {displayError ? (
            <HelpText
              severity={HelpTextSeverity.Danger}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              testID="immersve-funding-approval-error"
            >
              {displayError}
            </HelpText>
          ) : null}
        </>
      }
      primaryButtonProps={{
        children: strings(
          displayError
            ? 'card.card_onboarding.immersve_funding_approval.retry_button'
            : confirmButtonKey,
        ),
        onPress: displayError ? handleRetry : handleApprove,
        isDisabled: busy,
        isLoading: busy,
        testID: displayError
          ? 'immersve-funding-approval-retry-button'
          : 'immersve-funding-approval-confirm-button',
      }}
    />
  );
};

export default ImmersveFundingApproval;
