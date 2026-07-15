import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextVariant,
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
import { KYC_REDIRECT_URL, cardNetworkInfos } from '../../constants';
import { buildTokenIconUrl } from '../../util/buildTokenIconUrl';
import { safeFormatChainIdToHex } from '../../util/safeFormatChainIdToHex';
import OnboardingStep from './OnboardingStep';
import AnimatedSpinner from '../../../AnimatedSpinner';

const BASE_CAIP_CHAIN_ID = cardNetworkInfos.base.caipChainId;
const BASE_NETWORK_IMAGE = getNetworkImageSource({
  chainId: safeFormatChainIdToHex(BASE_CAIP_CHAIN_ID),
});

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

const ReadOnlyTokenRow = ({ tokenIconUrl }: { tokenIconUrl: string }) => (
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
      {tokenIconUrl && (
        <BadgeWrapper
          position={BadgeWrapperPosition.BottomRight}
          badge={
            BASE_NETWORK_IMAGE ? (
              <BadgeNetwork src={BASE_NETWORK_IMAGE} />
            ) : null
          }
        >
          <AvatarToken
            name="USDC"
            src={{ uri: tokenIconUrl }}
            size={AvatarBaseSize.Sm}
          />
        </BadgeWrapper>
      )}
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
 */
const ImmersveFundingApproval = () => {
  const navigation = useNavigation();
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

  // Retained so the settings card doesn't blank the token row the instant the
  // prerequisite flips from 'funding' to 'active' (createCard is still in flight).
  const lastContractAddressRef = useRef<string | null>(null);
  if (nextAction?.type === 'funding') {
    lastContractAddressRef.current = nextAction.write.contractAddress;
  }

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
    executeFunding(nextAction.write)
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
      <OnboardingStep
        title={strings('card.card_onboarding.immersve_funding_approval.title')}
        description={strings(
          'card.card_onboarding.immersve_funding_approval.description',
        )}
        formFields={
          <Box twClassName="flex-1 items-center justify-center">
            <AnimatedSpinner testID="immersve-funding-approval-spinner" />
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-center text-text-alternative mt-4 px-4"
            >
              {strings(
                'card.card_onboarding.immersve_funding_approval.helper_text',
              )}
            </Text>
          </Box>
        }
        actions={null}
        headerMode="close-direct"
      />
    );
  }

  if (!nextAction && error) {
    return (
      <OnboardingStep
        title={strings('card.card_onboarding.immersve_funding_approval.title')}
        description={strings(
          'card.card_onboarding.immersve_funding_approval.description',
        )}
        formFields={
          <Box twClassName="flex-1 items-center justify-center">
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-center text-error-default px-4 mb-4"
              testID="immersve-funding-approval-error"
            >
              {error}
            </Text>
          </Box>
        }
        actions={
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={() => refresh().catch(() => undefined)}
            testID="immersve-funding-approval-retry-button"
          >
            {strings(
              'card.card_onboarding.immersve_funding_approval.retry_button',
            )}
          </Button>
        }
        headerMode="close-direct"
      />
    );
  }

  const tokenIconUrl = buildTokenIconUrl(
    BASE_CAIP_CHAIN_ID,
    lastContractAddressRef.current ?? undefined,
  );

  return (
    <OnboardingStep
      title={strings('card.card_onboarding.immersve_funding_approval.title')}
      description={strings(
        'card.card_onboarding.immersve_funding_approval.description',
      )}
      formFields={
        <>
          <Box twClassName="bg-background-muted rounded-2xl overflow-hidden mb-6">
            <ReadOnlyAccountRow
              selectedAccount={selectedAccount ?? null}
              avatarAccountType={avatarAccountType}
              accountGroupName={accountGroupName}
            />
            <ReadOnlyTokenRow tokenIconUrl={tokenIconUrl} />
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
        </>
      }
      actions={
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
      }
      headerMode="close-direct"
    />
  );
};

export default ImmersveFundingApproval;
