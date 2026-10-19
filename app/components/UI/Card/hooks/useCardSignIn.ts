import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { selectInternalEvmAccounts } from '../../../../selectors/accountsController';
import { selectAccountGroups } from '../../../../selectors/multichainAccounts/accountTreeController';
import {
  selectInternalAccountsByGroupId,
  selectSelectedInternalAccountByScope,
} from '../../../../selectors/multichainAccounts/accounts';
import { isEvmAccountType } from '@metamask/keyring-api';
import { safeToChecksumAddress } from '../../../../util/address';
import type {
  CardSignInOption,
  CardSignInResolution,
} from '../../../../core/Engine/controllers/card-controller/provider-types';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { useImmersveResumeOnboarding } from './useImmersveResumeOnboarding';
import { CardEntryPoint } from '../util/metrics';

function useCandidateAddresses(): {
  candidateAddresses: string[];
  deviceAddresses: string[];
} {
  const selectAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );
  const selected = selectAccountByScope('eip155:0');
  const evmAccounts = useSelector(selectInternalEvmAccounts);
  const accountGroups = useSelector(selectAccountGroups);
  const accountsByGroupId = useSelector(selectInternalAccountsByGroupId);

  return useMemo(() => {
    const deviceAddresses = evmAccounts.map((a) => a.address);
    const ordered: string[] = [];
    const seen = new Set<string>();

    const push = (address: string | undefined) => {
      if (!address) return;
      const lower = address.toLowerCase();
      if (seen.has(lower)) return;
      seen.add(lower);
      ordered.push(address);
    };

    push(selected?.address);

    for (const group of accountGroups) {
      const accounts = accountsByGroupId(group.id) ?? [];
      for (const account of accounts) {
        if (isEvmAccountType(account.type)) {
          push(account.address);
        }
      }
    }

    for (const address of deviceAddresses) {
      push(address);
    }

    return {
      candidateAddresses: ordered.slice(0, 3),
      deviceAddresses,
    };
  }, [selected?.address, evmAccounts, accountGroups, accountsByGroupId]);
}

export interface UseCardSignInResult {
  resolution: CardSignInResolution | null;
  isResolving: boolean;
  retry: () => void;
  verifyAccount: (
    address: string,
    option: CardSignInOption,
  ) => Promise<'found' | 'not_found' | 'unknown'>;
  signInWithWallet: (params: {
    option: CardSignInOption;
    address: string;
    country: string;
    resumeOnboarding?: boolean;
  }) => Promise<void>;
  selectOption: (option: CardSignInOption, country: string) => void;
}

export function useCardSignIn(country: string | null): UseCardSignInResult {
  const { candidateAddresses, deviceAddresses } = useCandidateAddresses();
  const candidateAddressesRef = useRef(candidateAddresses);
  const deviceAddressesRef = useRef(deviceAddresses);
  candidateAddressesRef.current = candidateAddresses;
  deviceAddressesRef.current = deviceAddresses;
  const deviceAddressKey = useMemo(
    () =>
      deviceAddresses
        .map((address) => address.toLowerCase())
        .sort((left, right) => left.localeCompare(right))
        .join('\n'),
    [deviceAddresses],
  );
  const [resolution, setResolution] = useState<CardSignInResolution | null>(
    null,
  );
  const [isResolving, setIsResolving] = useState(false);
  const [retryEpoch, setRetryEpoch] = useState(0);
  const { trackEvent, createEventBuilder } = useAnalytics();
  const resumeImmersveOnboarding = useImmersveResumeOnboarding();
  const lastTrackedKey = useRef<string | null>(null);

  const retry = useCallback(() => {
    setRetryEpoch((epoch) => epoch + 1);
  }, []);

  useEffect(() => {
    if (!country) {
      setResolution(null);
      return;
    }

    let cancelled = false;
    setIsResolving(true);
    setResolution(null);

    const startedAt = Date.now();
    Engine.context.CardController.resolveSignIn({
      country,
      candidateAddresses: candidateAddressesRef.current,
      deviceAddresses: deviceAddressesRef.current,
    })
      .then((result) => {
        if (cancelled) return;
        setResolution(result);

        const trackKey = `${country}:${result.kind}:${retryEpoch}`;
        if (lastTrackedKey.current !== trackKey) {
          lastTrackedKey.current = trackKey;
          trackEvent(
            createEventBuilder(MetaMetricsEvents.CARD_SIGN_IN_RESOLVED)
              .addProperties({
                kind: result.kind,
                source: result.kind === 'wallet' ? result.source : undefined,
                reason:
                  result.kind === 'unresolved' ? result.reason : undefined,
                addresses_checked: candidateAddressesRef.current.length,
                duration_ms: Date.now() - startedAt,
              })
              .build(),
          );
        }
      })
      .catch(() => {
        if (cancelled) return;
        const options = Engine.context.CardController.getSignInOptions(country);
        setResolution({
          kind: 'unresolved',
          options,
          reason: 'check_failed',
        });
      })
      .finally(() => {
        if (!cancelled) {
          setIsResolving(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [country, deviceAddressKey, retryEpoch, trackEvent, createEventBuilder]);

  const verifyAccount = useCallback(
    async (address: string, option: CardSignInOption) =>
      Engine.context.CardController.verifyAccountForSignIn(address, option),
    [],
  );

  const selectOption = useCallback(
    (option: CardSignInOption, selectedCountry: string) => {
      Engine.context.CardController.selectSignInOption(option, selectedCountry);
    },
    [],
  );

  const signInWithWallet = useCallback(
    async ({
      option,
      address,
      country: signInCountry,
      resumeOnboarding = true,
    }: {
      option: CardSignInOption;
      address: string;
      country: string;
      resumeOnboarding?: boolean;
    }) => {
      const checksummed = safeToChecksumAddress(address) ?? address;
      await Engine.context.CardController.authenticateWithWallet({
        option,
        address: checksummed,
        country: signInCountry,
        autoSignup: false,
      });

      if (resumeOnboarding) {
        await resumeImmersveOnboarding({
          country: signInCountry,
          address: checksummed,
          showAccountExistsToast: false,
          navigateFromRoot: true,
          alreadyAuthenticated: true,
          entrypoint: CardEntryPoint.AUTHENTICATION,
        });
      }
    },
    [resumeImmersveOnboarding],
  );

  return {
    resolution,
    isResolving,
    retry,
    verifyAccount,
    signInWithWallet,
    selectOption,
  };
}
