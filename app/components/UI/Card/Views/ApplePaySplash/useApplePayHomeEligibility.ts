import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../../core/Engine';
import { CardProviderIds } from '../../../../../core/Engine/controllers/card-controller/provider-types';
import {
  selectApplePayHomeBannerDismissed,
  selectApplePayHomeSplashSeen,
} from '../../../../../core/redux/slices/card';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import {
  selectCardActiveProviderId,
  selectCardHomeData,
  selectCardHomeDataStatus,
  selectCardSignInLink,
  selectIsCardAuthenticated,
} from '../../../../../selectors/cardController';
import { selectPushProvisioningEnabled } from '../../../../../selectors/featureFlagController/card';
import { usePushProvisioning } from '../../pushProvisioning';
import {
  resolveApplePayHomePrompt,
  type ApplePayHomePromptMode,
} from './resolveApplePayHomePrompt';

export interface ApplePayHomeEligibility {
  mode: ApplePayHomePromptMode;
  showSplash: boolean;
  showBanner: boolean;
  showRegionLine: boolean;
}

const HIDDEN: ApplePayHomeEligibility = {
  mode: 'none',
  showSplash: false,
  showBanner: false,
  showRegionLine: false,
};

export function useApplePayHomeEligibility(): ApplePayHomeEligibility {
  const isIos = Platform.OS === 'ios';
  const provisioningEnabled = useSelector(
    (state: Parameters<typeof selectPushProvisioningEnabled>[0]) =>
      selectPushProvisioningEnabled(
        state,
        CardProviderIds.Immersve,
        'apple_wallet',
      ),
  );
  const isAuthenticated = useSelector(selectIsCardAuthenticated);
  const activeProviderId = useSelector(selectCardActiveProviderId);
  const cardHomeStatus = useSelector(selectCardHomeDataStatus);
  const cardHomeData = useSelector(selectCardHomeData);
  const signInLink = useSelector(selectCardSignInLink);
  const splashSeen = useSelector(selectApplePayHomeSplashSeen);
  const bannerDismissed = useSelector(selectApplePayHomeBannerDismissed);
  const selectAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );
  const selectedAddress = selectAccountByScope('eip155:0')?.address;

  // This test branch simulates an Australian user and does not check IP country.
  const inProvisioningCountry = true;
  const linkMatchesAccount =
    (signInLink?.status === 'linked' || signInLink?.status === 'completed') &&
    Boolean(selectedAddress) &&
    signInLink.address.toLowerCase() === selectedAddress?.toLowerCase();

  const [lookupFound, setLookupFound] = useState(false);

  const shouldLookup =
    isIos &&
    provisioningEnabled &&
    !isAuthenticated &&
    inProvisioningCountry &&
    !linkMatchesAccount &&
    Boolean(selectedAddress);

  useEffect(() => {
    if (!shouldLookup || !selectedAddress) {
      setLookupFound(false);
      return undefined;
    }

    let cancelled = false;
    Engine.context.CardController.verifyAccountForSignIn(selectedAddress, {
      providerId: CardProviderIds.Immersve,
      method: 'siwe',
    })
      .then((result) => {
        if (!cancelled) {
          setLookupFound(result === 'found');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLookupFound(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [shouldLookup, selectedAddress]);

  const checkWallet = isIos && isAuthenticated;
  const { canAddToWallet, hideProvisioningUi } = usePushProvisioning({
    cardId: checkWallet ? cardHomeData?.card?.id : undefined,
    walletProvisioning: checkWallet
      ? (cardHomeData?.walletProvisioning ?? null)
      : null,
  });

  if (!isIos || hideProvisioningUi) {
    return HIDDEN;
  }

  const mode = resolveApplePayHomePrompt({
    isIos,
    provisioningEnabled,
    isAuthenticated,
    isImmersveSession: activeProviderId === CardProviderIds.Immersve,
    cardHomeReady: cardHomeStatus === 'success',
    canAddToWallet,
    inProvisioningCountry,
    knownAccount: linkMatchesAccount || lookupFound,
  });

  if (mode === 'none') {
    return HIDDEN;
  }

  return {
    mode,
    showSplash: !splashSeen,
    showBanner: !bannerDismissed,
    showRegionLine: mode === 'sign_in',
  };
}
