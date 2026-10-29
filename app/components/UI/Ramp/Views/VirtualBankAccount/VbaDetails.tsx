import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  Box,
  BoxBackgroundColor,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  HeaderStandard,
  IconName,
  ListItem,
  Text,
  TextColor,
  TextVariant,
  TitleStandard,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import type { AutorampDepositInstructions } from '@metamask/ramps-controller';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import type { RootState } from '../../../../../reducers';
import { TraceName } from '../../../../../util/trace';
import { useNetworkTier } from '../../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../../util/deviceCapability';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import {
  findUsableVbaAutoramp,
  selectSelectedVbaWalletAddress,
  selectUsableVbaAutoramp,
} from '../../../../../selectors/rampsController';
import { selectGeolocationLocation } from '../../../../../selectors/geolocationController';
import {
  selectMoneyMovementNeobank,
  selectNeobankMarkets,
} from '../../../../../selectors/featureFlagController/moneyAccount';
import {
  getVbaMarketForCountry,
  isVbaSourceCurrency,
} from '../../../../../util/region/getVbaSourceCurrency';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import {
  pickLatestTransaction,
  type AutorampTransactionSummary,
} from './pickLatestTransaction';
import { isVbaDepositDebugEnabled } from './vbaDepositDebug';
import VbaDepositDebugSheet from './VbaDepositDebugSheet';
import { ensureMusdAutoramp, findUsableAutoramp } from './ensureMusdAutoramp';
import {
  getCachedDepositInstructions,
  setCachedDepositInstructions,
} from './vbaDepositInstructionsCache';
import {
  AccountCreateRegistrationError,
  ACCOUNT_CREATE_ERROR_DESTINATION,
  getAccountCreateFiatFailureResult,
  getAccountCreateFailureLogFields,
  logAccountCreateFailure,
} from './accountCreateError';
import { navigateToVbaOnboardingDestination } from './hooks/useVbaOnboardingRouting';
import VbaCreatingAccount from './VbaCreatingAccount';
import { useScreenPerformance } from '../../../../../hooks/useScreenPerformance';
import {
  VBA_SCREEN_CONTENT_STATE,
  VBA_SCREEN_ID,
  VBA_SCREEN_PERFORMANCE_CONFIG,
  type VbaScreenContentState,
} from './vbaScreenPerformance';
import {
  endVbaCufChildTrace,
  endVbaCufJourney,
  startVbaCufChildTrace,
} from './vbaCufTrace';
import { VBA_CUF_END_REASON, type VbaCufEndReason } from './vbaCufTags';

const DEFAULT_POLL_INTERVAL_MS = 10_000;
const CONSTRAINED_POLL_INTERVAL_MS = 30_000;
// Keep the Figma disclosure ready while Product finalizes the copy.
const SHOW_ACCOUNT_PROVIDER_DISCLOSURE = false;

export const VbaDetailsSelectorsIDs = {
  CONTAINER: 'vba-details-container',
  HEADER: 'vba-details-header',
  BACK_BUTTON: 'vba-details-back-button',
  TITLE: 'vba-details-title',
  COPY_BUTTON: 'vba-details-copy-button',
  PIX_CODE: 'vba-details-pix-code',
  PIX_KEY: 'vba-details-pix-key',
  ACCOUNT_HOLDER: 'vba-details-account-holder',
  ROUTING_NUMBER: 'vba-details-routing-number',
  ACCOUNT_NUMBER: 'vba-details-account-number',
  BANK_NAME: 'vba-details-bank-name',
  HELPER_TEXT: 'vba-details-helper-text',
  LOADING: 'vba-details-loading',
  LOAD_ERROR: 'vba-details-load-error',
  DEBUG_BUTTON: 'vba-details-debug-button',
  DONE_BUTTON: 'vba-details-done-button',
} as const;

interface AutorampCursor {
  id: string;
  walletAddress: string;
  status: string;
  depositRailsSummary?: { currency?: string };
}

interface DepositNeoBank {
  getDepositInstructions: (
    autorampId: string,
  ) => Promise<AutorampDepositInstructions | null>;
}

interface DetailRow {
  id: string;
  testID: string;
  label: string;
  value: string;
}

interface DepositRamps {
  state?: { autoramps?: AutorampCursor[] };
  refreshAutoramp?: (autorampId: string) => Promise<AutorampCursor>;
  refreshAutorampTransactions?: (
    autorampId: string,
  ) => Promise<AutorampTransactionSummary[]>;
}

const isTerminalStatus = (status: string): boolean =>
  status === 'Rejected' || status === 'Cancelled';

const readAutoramps = (): AutorampCursor[] =>
  (Engine.context.RampsController as DepositRamps).state?.autoramps ?? [];

const readCachedInstructions = (
  walletAddress: string | null | undefined,
  sourceCurrency: string | undefined,
): AutorampDepositInstructions | null => {
  if (!walletAddress) {
    return null;
  }
  const autoramp = findUsableAutoramp(
    readAutoramps(),
    walletAddress,
    sourceCurrency,
  );
  if (autoramp?.status !== 'Approved') {
    return null;
  }
  // An account without a stored fiat may be in another currency; refreshDeposit
  // must confirm it before its details can show for this one.
  if (
    sourceCurrency &&
    autoramp.depositRailsSummary?.currency !== sourceCurrency
  ) {
    return null;
  }
  return getCachedDepositInstructions(autoramp.id);
};

const buildDetailRows = (
  instructions: AutorampDepositInstructions | null,
): DetailRow[] => {
  if (instructions?.type === 'UsBank') {
    return [
      {
        id: 'account-holder',
        testID: VbaDetailsSelectorsIDs.ACCOUNT_HOLDER,
        label: strings('virtual_bank_account.vba_details.account_holder_label'),
        value: instructions.accountHolder,
      },
      {
        id: 'routing-number',
        testID: VbaDetailsSelectorsIDs.ROUTING_NUMBER,
        label: strings('virtual_bank_account.vba_details.routing_number_label'),
        value: instructions.routingNumber,
      },
      {
        id: 'account-number',
        testID: VbaDetailsSelectorsIDs.ACCOUNT_NUMBER,
        label: strings('virtual_bank_account.vba_details.account_number_label'),
        value: instructions.accountNumber,
      },
      {
        id: 'bank-name',
        testID: VbaDetailsSelectorsIDs.BANK_NAME,
        label: strings('virtual_bank_account.vba_details.bank_name_label'),
        value: instructions.bankName,
      },
    ];
  }
  if (instructions?.type !== 'Pix') {
    return [];
  }
  // Pix key first, Copia e Cola second (TRAM-4210).
  const rows: DetailRow[] = [];
  if (instructions.pixKey) {
    rows.push({
      id: 'pix-key',
      testID: VbaDetailsSelectorsIDs.PIX_KEY,
      label: strings('virtual_bank_account.vba_details.pix_key_label'),
      value: instructions.pixKey,
    });
  }
  rows.push({
    id: 'copia-cola',
    testID: VbaDetailsSelectorsIDs.PIX_CODE,
    label: strings('virtual_bank_account.vba_details.copia_cola_label'),
    value: instructions.brCode,
  });
  return rows;
};

/**
 * Virtual bank account screen. This is the only place that registers the
 * wallet and creates the autoramp, in the currency of the open market flag
 * listing the effective location (`moneyMovementNeobank.regionOverride` when
 * set, otherwise the IP country). An existing autoramp's currency wins, and
 * no second currency is ever created on the Money account.
 * Until the autoramp is Approved it shows the creating state. Polling stops
 * once deposit details load or the autoramp is Rejected or Cancelled; only
 * Retry creates a replacement. Pushed on the root stack
 * (`Routes.RAMP.VBA_DETAILS`) with the same horizontal transition as
 * onboarding. PIX or US bank details come from
 * `NeoBankService.getDepositInstructions`.
 */
const VbaDetails = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const walletAddress = useSelector(selectSelectedVbaWalletAddress);
  const location = useSelector(selectGeolocationLocation);
  const { isEnabled: isGateEnabled, regionOverride } = useSelector(
    selectMoneyMovementNeobank,
  );
  const markets = useSelector(selectNeobankMarkets);
  const usableAutoramp = useSelector(selectUsableVbaAutoramp);
  const existingCurrency = usableAutoramp?.depositRailsSummary?.currency;
  const newSignupCurrency = isGateEnabled
    ? getVbaMarketForCountry(markets, regionOverride ?? location)?.currency
    : undefined;
  const sourceCurrency = isVbaSourceCurrency(existingCurrency)
    ? existingCurrency
    : newSignupCurrency;
  const hardwareTier = getHardwareTier();
  const networkTier = useNetworkTier();
  const debugEnabled = isVbaDepositDebugEnabled();
  const [instructions, setInstructions] =
    useState<AutorampDepositInstructions | null>(() =>
      readCachedInstructions(walletAddress, sourceCurrency),
    );
  const [revalidateCount, setRevalidateCount] = useState(0);
  const [autorampId, setAutorampId] = useState<string | null>(null);
  const [autorampStatus, setAutorampStatus] = useState<string | null>(() =>
    walletAddress
      ? (findUsableAutoramp(readAutoramps(), walletAddress, sourceCurrency)
          ?.status ?? null)
      : null,
  );
  const [transactionStatus, setTransactionStatus] = useState<string | null>(
    null,
  );
  const [loadError, setLoadError] = useState(false);
  const [awaitingProviderApproval, setAwaitingProviderApproval] =
    useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const isMountedRef = useRef(true);
  const pollingDoneRef = useRef(false);
  const pixFetchTraceIdRef = useRef<string | null>(null);
  const pixFetchTraceSettledRef = useRef(false);
  const transactionsFetchedForRef = useRef<string | null>(null);
  const accountKey = `${walletAddress ?? ''}:${sourceCurrency ?? ''}`;
  const accountKeyRef = useRef(accountKey);
  const [stateAccountKey, setStateAccountKey] = useState(accountKey);

  const finishPixFetchTrace = useCallback(
    (
      success: boolean,
      reason?: VbaCufEndReason,
      expectedTraceId = pixFetchTraceIdRef.current,
    ) => {
      const traceId = pixFetchTraceIdRef.current;
      if (!traceId || traceId !== expectedTraceId) {
        return;
      }
      pixFetchTraceIdRef.current = null;
      pixFetchTraceSettledRef.current = true;
      if (reason) {
        endVbaCufChildTrace(traceId, success, reason);
      } else {
        endVbaCufChildTrace(traceId, success);
      }
    },
    [],
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      queueMicrotask(() => {
        if (!isMountedRef.current) {
          finishPixFetchTrace(false, VBA_CUF_END_REASON.BAILED);
        }
      });
    };
  }, [finishPixFetchTrace]);

  const refreshDeposit = useCallback(
    async (replaceTerminal = false) => {
      if (!walletAddress) {
        return;
      }
      const requestKey = `${walletAddress}:${sourceCurrency ?? ''}`;
      const stillCurrent = () =>
        isMountedRef.current && accountKeyRef.current === requestKey;
      const ramps = Engine.context.RampsController as DepositRamps;
      let autoramp = findUsableAutoramp(
        readAutoramps(),
        walletAddress,
        sourceCurrency,
      );
      // An Approved account from before currency was stored must be refreshed
      // before it can satisfy this fiat. Otherwise a BRL account is reused for USD.
      if (
        autoramp &&
        sourceCurrency &&
        autoramp.status === 'Approved' &&
        !autoramp.depositRailsSummary?.currency &&
        ramps.refreshAutoramp
      ) {
        await ramps.refreshAutoramp(autoramp.id);
        if (!stillCurrent()) {
          return;
        }
        autoramp = findUsableAutoramp(
          readAutoramps(),
          walletAddress,
          sourceCurrency,
        );
      }
      if (!autoramp) {
        const existing = findUsableVbaAutoramp(readAutoramps(), walletAddress);
        if (existing) {
          const existingFailure = getAccountCreateFiatFailureResult(
            existing.status,
          );
          if (existingFailure) {
            throw new AccountCreateRegistrationError(existingFailure);
          }
          // A refresh can set its currency, which re-keys this screen.
          if (ramps.refreshAutoramp) {
            await ramps.refreshAutoramp(existing.id);
          }
          return;
        }
        if (!sourceCurrency) {
          if (!stillCurrent()) {
            return;
          }
          pollingDoneRef.current = true;
          navigateToVbaOnboardingDestination(
            navigation,
            ACCOUNT_CREATE_ERROR_DESTINATION.generic,
          );
          return;
        }
        const outcome = await ensureMusdAutoramp(
          walletAddress,
          sourceCurrency,
          { replaceTerminal },
        );
        if (!stillCurrent()) {
          return;
        }
        if (outcome === 'failed') {
          pollingDoneRef.current = true;
          navigateToVbaOnboardingDestination(
            navigation,
            ACCOUNT_CREATE_ERROR_DESTINATION.generic,
            undefined,
            undefined,
            sourceCurrency,
            true,
          );
          return;
        }
        if (outcome === 'terminal') {
          pollingDoneRef.current = true;
          navigateToVbaOnboardingDestination(
            navigation,
            ACCOUNT_CREATE_ERROR_DESTINATION.generic,
            undefined,
            undefined,
            sourceCurrency,
          );
          return;
        }
        autoramp = findUsableAutoramp(
          readAutoramps(),
          walletAddress,
          sourceCurrency,
        );
        if (!autoramp) {
          setAwaitingProviderApproval(outcome === 'awaiting_provider');
          setAutorampId(null);
          setAutorampStatus(null);
          setInstructions(null);
          return;
        }
      }
      if (!stillCurrent()) {
        return;
      }
      setAwaitingProviderApproval(false);

      let status = autoramp.status;
      if (status !== 'Approved' && ramps.refreshAutoramp) {
        const refreshed = await ramps.refreshAutoramp(autoramp.id);
        if (!stillCurrent()) {
          return;
        }
        status = refreshed.status;
      }
      const accountCreateFailure = getAccountCreateFiatFailureResult(status);
      if (accountCreateFailure) {
        throw new AccountCreateRegistrationError(accountCreateFailure);
      }
      setAutorampId(autoramp.id);
      setAutorampStatus(status);
      const terminal = isTerminalStatus(status);
      if (terminal) {
        pollingDoneRef.current = true;
        finishPixFetchTrace(false, VBA_CUF_END_REASON.ERROR);
        setInstructions(null);
        navigateToVbaOnboardingDestination(
          navigation,
          ACCOUNT_CREATE_ERROR_DESTINATION.generic,
          undefined,
          undefined,
          sourceCurrency,
        );
        return;
      }
      if (status !== 'Approved') {
        return;
      }

      const neoBank = (
        Engine.context as unknown as { NeoBankService?: DepositNeoBank }
      ).NeoBankService;
      let depositError: unknown;
      if (neoBank) {
        // One logical trace covers all retries so polling cannot flood Sentry.
        // Deposit details stay independent of the transaction refresh.
        if (!pixFetchTraceIdRef.current && !pixFetchTraceSettledRef.current) {
          pixFetchTraceIdRef.current = startVbaCufChildTrace(
            TraceName.VbaPixFetch,
          );
        }
        const requestTraceId = pixFetchTraceIdRef.current;
        try {
          const details = await neoBank.getDepositInstructions(autoramp.id);
          if (!stillCurrent()) {
            finishPixFetchTrace(
              false,
              isMountedRef.current
                ? VBA_CUF_END_REASON.SUPERSEDED
                : VBA_CUF_END_REASON.BAILED,
              requestTraceId,
            );
            return;
          }
          // The autoramp may have been rejected, cancelled or replaced while
          // this request was in flight (for example by a background hydrate).
          // Poll again right away instead of showing details for it.
          if (
            findUsableAutoramp(readAutoramps(), walletAddress, sourceCurrency)
              ?.id !== autoramp.id
          ) {
            setRevalidateCount((count) => count + 1);
            return;
          }
          if (details) {
            finishPixFetchTrace(true, undefined, requestTraceId);
            setCachedDepositInstructions(autoramp.id, details);
            setInstructions(details);
            // Debug builds keep polling so the latest deposit stays visible.
            pollingDoneRef.current = !debugEnabled;
          }
        } catch (error) {
          if (!stillCurrent()) {
            finishPixFetchTrace(
              false,
              isMountedRef.current
                ? VBA_CUF_END_REASON.SUPERSEDED
                : VBA_CUF_END_REASON.BAILED,
              requestTraceId,
            );
            return;
          }
          Logger.error(error as Error, {
            message: 'VbaDetails: failed to load deposit instructions',
          });
          depositError = error;
        }
      }

      const shouldRefreshTransactions =
        Boolean(ramps.refreshAutorampTransactions) &&
        (debugEnabled || transactionsFetchedForRef.current !== autoramp.id);
      if (
        stillCurrent() &&
        shouldRefreshTransactions &&
        ramps.refreshAutorampTransactions
      ) {
        try {
          const transactions = await ramps.refreshAutorampTransactions(
            autoramp.id,
          );
          if (!stillCurrent()) {
            return;
          }
          if (!debugEnabled) {
            transactionsFetchedForRef.current = autoramp.id;
          }
          if (debugEnabled) {
            setTransactionStatus(
              pickLatestTransaction(transactions)?.status ?? null,
            );
          }
        } catch (error) {
          Logger.error(error as Error, {
            message: 'VbaDetails: failed to refresh autoramp transactions',
          });
        }
      }

      if (depositError) {
        throw depositError;
      }
    },
    [
      debugEnabled,
      finishPixFetchTrace,
      navigation,
      sourceCurrency,
      walletAddress,
    ],
  );

  useEffect(() => {
    const nextKey = `${walletAddress ?? ''}:${sourceCurrency ?? ''}`;
    if (accountKeyRef.current === nextKey) {
      return;
    }
    accountKeyRef.current = nextKey;
    finishPixFetchTrace(false, VBA_CUF_END_REASON.SUPERSEDED);
    pixFetchTraceSettledRef.current = false;
    setStateAccountKey(nextKey);
    // A reused route or an account switch must not keep the previous details.
    pollingDoneRef.current = false;
    transactionsFetchedForRef.current = null;
    setInstructions(readCachedInstructions(walletAddress, sourceCurrency));
    setLoadError(false);
    setAwaitingProviderApproval(false);
    setAutorampId(null);
    setAutorampStatus(
      walletAddress
        ? (findUsableAutoramp(readAutoramps(), walletAddress, sourceCurrency)
            ?.status ?? null)
        : null,
    );
  }, [finishPixFetchTrace, sourceCurrency, walletAddress]);

  // Opening from Money can skip the loading screen, so hydrate may land after
  // details are shown. When it changes the usable autoramp (Rejected,
  // Cancelled or replaced), drop the shown details and poll again so
  // refreshDeposit routes or reloads.
  const usableAutorampKey = useSelector((state: RootState) => {
    if (!walletAddress) {
      return null;
    }
    const autoramps =
      (
        state.engine?.backgroundState?.RampsController as
          | { autoramps?: AutorampCursor[] }
          | undefined
      )?.autoramps ?? [];
    const autoramp = findUsableAutoramp(
      autoramps,
      walletAddress,
      sourceCurrency,
    );
    return autoramp ? `${autoramp.id}:${autoramp.status}` : '';
  });
  const lastUsableAutorampRef = useRef({ accountKey, usableAutorampKey });

  useEffect(() => {
    const last = lastUsableAutorampRef.current;
    lastUsableAutorampRef.current = { accountKey, usableAutorampKey };
    if (
      last.accountKey !== accountKey ||
      last.usableAutorampKey === usableAutorampKey
    ) {
      return;
    }
    setInstructions(readCachedInstructions(walletAddress, sourceCurrency));
    if (pollingDoneRef.current) {
      pollingDoneRef.current = false;
      setRevalidateCount((count) => count + 1);
    }
  }, [accountKey, sourceCurrency, usableAutorampKey, walletAddress]);

  useEffect(() => {
    if (networkTier === 'NONE') {
      return;
    }

    let cancelled = false;
    let inFlight = false;
    const tick = async () => {
      const requestKey = accountKeyRef.current;
      if (cancelled || inFlight || pollingDoneRef.current) {
        return;
      }
      inFlight = true;
      try {
        await refreshDeposit();
        if (!cancelled && accountKeyRef.current === requestKey) {
          setLoadError(false);
        }
      } catch (error) {
        if (error instanceof AccountCreateRegistrationError) {
          if (cancelled || accountKeyRef.current !== requestKey) {
            return;
          }
          const destinationId = logAccountCreateFailure(error.result);
          if (!destinationId) {
            return;
          }
          pollingDoneRef.current = true;
          navigateToVbaOnboardingDestination(
            navigation,
            destinationId,
            undefined,
            getAccountCreateFailureLogFields(error.result),
            sourceCurrency,
          );
          return;
        }
        if (!cancelled && accountKeyRef.current === requestKey) {
          setLoadError(true);
        }
        Logger.error(error as Error, {
          message: 'VbaDetails: deposit refresh failed',
        });
      } finally {
        inFlight = false;
      }
    };
    tick().catch(() => undefined);
    const timer = setInterval(
      () => {
        tick().catch(() => undefined);
      },
      hardwareTier === 'LOW' || networkTier === 'SLOW_CELLULAR'
        ? CONSTRAINED_POLL_INTERVAL_MS
        : DEFAULT_POLL_INTERVAL_MS,
    );
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [
    hardwareTier,
    navigation,
    networkTier,
    refreshDeposit,
    revalidateCount,
    sourceCurrency,
  ]);

  const isApproved = autorampStatus === 'Approved';

  useEffect(() => {
    if (!loadError || !isApproved || instructions) {
      return;
    }
    AccessibilityInfo.announceForAccessibility(
      strings('virtual_bank_account.vba_details.load_error'),
    );
  }, [instructions, isApproved, loadError]);

  const handleDone = useCallback(() => {
    finishPixFetchTrace(false, VBA_CUF_END_REASON.BAILED);
    endVbaCufJourney(false, VBA_CUF_END_REASON.BAILED);
    navigation.navigate(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  }, [finishPixFetchTrace, navigation]);

  const handleBack = useCallback(() => {
    finishPixFetchTrace(false, VBA_CUF_END_REASON.BAILED);
    endVbaCufJourney(false, VBA_CUF_END_REASON.BAILED);
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    handleDone();
  }, [finishPixFetchTrace, handleDone, navigation]);

  const handleCopy = useCallback(
    (value: string, label: string) => () => {
      Clipboard.setString(value);
      AccessibilityInfo.announceForAccessibility(
        strings('virtual_bank_account.vba_details.copied_label', {
          field: label,
        }),
      );
    },
    [],
  );

  const handleOpenDebug = useCallback(() => {
    setIsDebugOpen(true);
  }, []);

  const handleCloseDebug = useCallback(() => {
    setIsDebugOpen(false);
  }, []);

  const rows = buildDetailRows(instructions);
  const hasCurrentAccountState = stateAccountKey === accountKey;
  let accountDetailsContentState: VbaScreenContentState =
    VBA_SCREEN_CONTENT_STATE.EMPTY;
  if (loadError) {
    accountDetailsContentState = VBA_SCREEN_CONTENT_STATE.ERROR;
  } else if (rows.length > 0) {
    accountDetailsContentState = VBA_SCREEN_CONTENT_STATE.POPULATED;
  }

  useScreenPerformance({
    config: VBA_SCREEN_PERFORMANCE_CONFIG,
    screenId: VBA_SCREEN_ID.ACCOUNT_DETAILS,
    resetKey: accountKey,
    enabled: isApproved && hasCurrentAccountState,
    contentReady: hasCurrentAccountState && (rows.length > 0 || loadError),
    contentState: accountDetailsContentState,
  });
  useEffect(() => {
    if (hasCurrentAccountState && rows.length > 0) {
      endVbaCufJourney(true);
    }
  }, [hasCurrentAccountState, rows.length]);
  const isBankTransfer =
    instructions?.type === 'UsBank' ||
    (!instructions && sourceCurrency === 'USD');

  const skeletonMotion = hardwareTier === 'LOW' ? { autoPlay: false } : {};
  const errorMessage = loadError
    ? strings('virtual_bank_account.vba_details.load_error')
    : null;

  if (!isApproved) {
    return (
      <VbaCreatingAccount
        onBack={handleDone}
        awaitingProviderApproval={awaitingProviderApproval}
      />
    );
  }

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderStandard
        onBack={handleBack}
        backButtonProps={{ testID: VbaDetailsSelectorsIDs.BACK_BUTTON }}
        includesTopInset
        testID={VbaDetailsSelectorsIDs.HEADER}
      />
      <ScrollView
        contentContainerStyle={tw.style('flex-grow px-4 pb-4')}
        testID={VbaDetailsSelectorsIDs.CONTAINER}
      >
        <TitleStandard
          title={strings(
            isBankTransfer
              ? 'virtual_bank_account.vba_details.bank_transfer_title'
              : 'virtual_bank_account.vba_details.title',
          )}
          bottomLabel={strings(
            isBankTransfer
              ? 'virtual_bank_account.vba_details.bank_transfer_description'
              : 'virtual_bank_account.vba_details.description',
          )}
          titleProps={{ testID: VbaDetailsSelectorsIDs.TITLE }}
        />
        {rows.length > 0 ? (
          <Box
            backgroundColor={BoxBackgroundColor.BackgroundMuted}
            marginTop={6}
            twClassName="overflow-hidden rounded-xl"
          >
            {rows.map((row) => (
              <ListItem
                key={row.id}
                testID={row.testID}
                title={row.label}
                titleProps={{
                  variant: TextVariant.BodySm,
                  fontWeight: FontWeight.Regular,
                  color: TextColor.TextAlternative,
                }}
                description={row.value}
                descriptionProps={{
                  variant: TextVariant.BodyMd,
                  color: TextColor.TextDefault,
                  numberOfLines: 1,
                }}
                endAccessory={
                  <ButtonIcon
                    iconName={IconName.Copy}
                    size={ButtonIconSize.Md}
                    onPress={handleCopy(row.value, row.label)}
                    accessibilityLabel={strings(
                      'virtual_bank_account.vba_details.copy_label',
                      { field: row.label },
                    )}
                    testID={`${VbaDetailsSelectorsIDs.COPY_BUTTON}-${row.id}`}
                  />
                }
                accessoryGap={3}
              />
            ))}
          </Box>
        ) : errorMessage ? (
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.ErrorDefault}
            twClassName="mt-6 text-center"
            testID={VbaDetailsSelectorsIDs.LOAD_ERROR}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            {errorMessage}
          </Text>
        ) : (
          <Box
            backgroundColor={BoxBackgroundColor.BackgroundMuted}
            marginTop={6}
            twClassName="overflow-hidden rounded-xl"
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={strings(
              'virtual_bank_account.vba_details.loading_details',
            )}
            testID={VbaDetailsSelectorsIDs.LOADING}
          >
            {/* Reuses ListItem so each placeholder row gets the same padding
                and min height as a loaded two-line row, so the card doesn't
                jump when the details land. Both bars sit in the title slot
                because it is the only full-width slot, so the 85% bar has a
                width to resolve against. */}
            {['pix-key', 'copia-cola'].map((id) => (
              <ListItem
                key={id}
                title={
                  <Box gap={2} twClassName="flex-1">
                    <Skeleton
                      width={96}
                      height={14}
                      twClassName="rounded"
                      {...skeletonMotion}
                    />
                    <Skeleton
                      width="85%"
                      height={18}
                      twClassName="rounded"
                      {...skeletonMotion}
                    />
                  </Box>
                }
                endAccessory={
                  // Matches the copy ButtonIcon at ButtonIconSize.Md (32px).
                  <Skeleton
                    width={32}
                    height={32}
                    twClassName="rounded"
                    {...skeletonMotion}
                  />
                }
                accessoryGap={3}
              />
            ))}
          </Box>
        )}
      </ScrollView>
      <Box gap={4} paddingHorizontal={4} paddingTop={4} paddingBottom={2}>
        {SHOW_ACCOUNT_PROVIDER_DISCLOSURE ? (
          <Text
            variant={TextVariant.BodyXs}
            color={TextColor.TextAlternative}
            twClassName="text-center"
            testID={VbaDetailsSelectorsIDs.HELPER_TEXT}
          >
            {strings('virtual_bank_account.vba_details.helper_text')}
          </Text>
        ) : null}
        {debugEnabled ? (
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={handleOpenDebug}
            testID={VbaDetailsSelectorsIDs.DEBUG_BUTTON}
          >
            {'Debug'}
          </Button>
        ) : null}
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleBack}
          testID={VbaDetailsSelectorsIDs.DONE_BUTTON}
        >
          {strings('virtual_bank_account.vba_details.button')}
        </Button>
      </Box>
      {debugEnabled && isDebugOpen ? (
        <VbaDepositDebugSheet
          autorampId={autorampId}
          autorampStatus={autorampStatus}
          transactionStatus={transactionStatus}
          loadError={loadError}
          onClose={handleCloseDebug}
          onRefresh={() => {
            refreshDeposit().catch(() => undefined);
          }}
        />
      ) : null}
    </SafeAreaView>
  );
};

export default VbaDetails;
