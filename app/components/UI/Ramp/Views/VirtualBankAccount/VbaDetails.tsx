import React, { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { selectSelectedVbaWalletAddress } from '../../../../../selectors/rampsController';
import BankDetailRow from '../../components/BankDetailRow/BankDetailRow';

const POLL_INTERVAL_MS = 10_000;

const TERMINAL_TRANSACTION_STATUSES = new Set([
  'Completed',
  'Failed',
  'Cancelled',
]);

export const VbaDetailsSelectorsIDs = {
  CONTAINER: 'vba-details-container',
  BACK_BUTTON: 'vba-details-back-button',
  DONE_BUTTON: 'vba-details-done-button',
  PIX_CODE: 'vba-details-pix-code',
  PIX_INSTRUCTIONS: 'vba-details-pix-instructions',
  PIX_KEY: 'vba-details-pix-key',
  WAITING_FOR_PIX: 'vba-details-waiting-for-pix',
  LOAD_ERROR: 'vba-details-load-error',
  TRANSACTION_STATUS: 'vba-details-transaction-status',
} as const;

interface AutorampCursor {
  id: string;
  walletAddress: string;
  status: string;
}

interface PixDepositInstructions {
  brCode: string;
  instruction: string;
  pixKey?: string;
}

interface AutorampTransactionSummary {
  id: string;
  status: string;
  sourceAmount?: string;
  createdAt?: string;
}

interface DepositNeoBank {
  getPixDepositInstructions: (
    autorampId: string,
  ) => Promise<PixDepositInstructions | null>;
  listAutorampTransactions: (
    autorampId: string,
  ) => Promise<AutorampTransactionSummary[]>;
}

interface DepositRamps {
  state?: { autoramps?: AutorampCursor[] };
  refreshAutoramp?: (autorampId: string) => Promise<AutorampCursor>;
}

const findUsableAutoramp = (
  autoramps: AutorampCursor[],
  walletAddress: string,
): AutorampCursor | undefined => {
  const normalized = walletAddress.toLowerCase();
  return autoramps.find(
    (autoramp) =>
      autoramp.walletAddress.toLowerCase() === normalized &&
      autoramp.status !== 'Rejected' &&
      autoramp.status !== 'Cancelled',
  );
};

/**
 * Prefer the newest transaction by `createdAt`. Without timestamps, prefer an
 * in-flight deposit over a terminal one so an older Completed/Failed row cannot
 * hide a newer payment.
 */
export const pickLatestTransaction = (
  transactions: AutorampTransactionSummary[],
): AutorampTransactionSummary | undefined => {
  if (transactions.length === 0) {
    return undefined;
  }

  const dated = transactions.filter(
    (transaction) =>
      typeof transaction.createdAt === 'string' &&
      !Number.isNaN(Date.parse(transaction.createdAt)),
  );
  if (dated.length > 0) {
    return [...dated].sort(
      (left, right) =>
        Date.parse(right.createdAt as string) -
        Date.parse(left.createdAt as string),
    )[0];
  }

  const inFlight = transactions.find(
    (transaction) => !TERMINAL_TRANSACTION_STATUSES.has(transaction.status),
  );
  if (inFlight) {
    return inFlight;
  }

  return transactions[transactions.length - 1];
};

/**
 * Money Account deposit screen. Shows the PIX BR Code for the BRL autoramp and
 * polls until MoonPay reports the transaction Completed. mUSD then lands on the
 * Money Account address; the account page reads that on-chain balance.
 */
const VbaDetails = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const walletAddress = useSelector(selectSelectedVbaWalletAddress);
  const [instructions, setInstructions] =
    useState<PixDepositInstructions | null>(null);
  const [autorampStatus, setAutorampStatus] = useState<string | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<string | null>(
    null,
  );
  const [loadError, setLoadError] = useState(false);

  const refreshDeposit = useCallback(async () => {
    if (!walletAddress) {
      return;
    }
    const ramps = Engine.context.RampsController as DepositRamps;
    const autoramp = findUsableAutoramp(
      ramps.state?.autoramps ?? [],
      walletAddress,
    );
    if (!autoramp) {
      setAutorampStatus(null);
      setInstructions(null);
      return;
    }

    let status = autoramp.status;
    if (status !== 'Approved' && ramps.refreshAutoramp) {
      const refreshed = await ramps.refreshAutoramp(autoramp.id);
      status = refreshed.status;
    }
    setAutorampStatus(status);

    const neoBank = (
      Engine.context as unknown as { NeoBankService?: DepositNeoBank }
    ).NeoBankService;
    if (!neoBank) {
      return;
    }

    // Fetch PIX and transactions independently so a flaky transaction poll
    // cannot skip (or clear) the BR code the user needs to pay.
    if (neoBank.getPixDepositInstructions) {
      try {
        const pix = await neoBank.getPixDepositInstructions(autoramp.id);
        if (pix) {
          setInstructions(pix);
        }
      } catch (error) {
        // Keep any previously shown PIX instructions.
        Logger.error(error as Error, {
          message: 'VbaDetails: failed to load PIX deposit instructions',
        });
      }
    }

    if (neoBank.listAutorampTransactions) {
      try {
        const transactions = await neoBank.listAutorampTransactions(
          autoramp.id,
        );
        setTransactionStatus(
          pickLatestTransaction(transactions)?.status ?? null,
        );
      } catch (error) {
        // Keep any previously shown transaction status.
        Logger.error(error as Error, {
          message: 'VbaDetails: failed to list autoramp transactions',
        });
      }
    }
  }, [walletAddress]);

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;
    const tick = async () => {
      // Skip while a previous poll is still running so a slower earlier
      // response cannot overwrite a newer PIX code or deposit status.
      if (cancelled || inFlight) {
        return;
      }
      inFlight = true;
      try {
        await refreshDeposit();
        if (!cancelled) {
          setLoadError(false);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(true);
        }
        Logger.error(error as Error, {
          message: 'VbaDetails: deposit refresh failed',
        });
      } finally {
        inFlight = false;
      }
    };
    void tick();
    const timer = setInterval(() => {
      void tick();
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [refreshDeposit]);

  // Announce async load failures so VoiceOver/TalkBack users hear them even
  // when focus is on Done or elsewhere (WCAG 4.1.3 Status Messages).
  useEffect(() => {
    if (!loadError) {
      return;
    }
    AccessibilityInfo.announceForAccessibility(
      strings('virtual_bank_account.vba_details.load_error'),
    );
  }, [loadError]);

  const transactionLabel =
    transactionStatus === 'Completed'
      ? strings('virtual_bank_account.vba_details.transaction_completed')
      : transactionStatus;
  const pixAnnouncement = instructions?.brCode
    ? instructions.instruction ||
      strings('virtual_bank_account.vba_details.br_code')
    : null;
  const transactionAnnouncement = transactionLabel
    ? strings('virtual_bank_account.vba_details.transaction_status', {
        status: transactionLabel,
      })
    : null;

  // Announce when PIX instructions appear or deposit status moves, including
  // Completed, so focus on Done does not hide the update (WCAG 4.1.3).
  useEffect(() => {
    if (!pixAnnouncement) {
      return;
    }
    AccessibilityInfo.announceForAccessibility(pixAnnouncement);
  }, [pixAnnouncement]);

  useEffect(() => {
    if (!transactionAnnouncement) {
      return;
    }
    AccessibilityInfo.announceForAccessibility(transactionAnnouncement);
  }, [transactionAnnouncement]);

  const handleDone = useCallback(() => {
    navigation.navigate(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  }, [navigation]);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderStandard
        onBack={handleBack}
        backButtonProps={{ testID: VbaDetailsSelectorsIDs.BACK_BUTTON }}
        includesTopInset
      />
      <ScrollView
        contentContainerStyle={tw.style('flex-grow px-4 pb-4')}
        testID={VbaDetailsSelectorsIDs.CONTAINER}
      >
        <Text variant={TextVariant.HeadingLg} twClassName="mt-2">
          {strings('virtual_bank_account.vba_details.title')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="mt-2"
        >
          {strings('virtual_bank_account.vba_details.description')}
        </Text>
        {autorampStatus ? (
          <Text variant={TextVariant.BodyMd} twClassName="mt-4">
            {strings('virtual_bank_account.vba_details.autoramp_status', {
              status: autorampStatus,
            })}
          </Text>
        ) : null}
        {instructions ? (
          <Box twClassName="mt-4">
            <Text
              variant={TextVariant.BodyMd}
              twClassName="mb-2"
              testID={VbaDetailsSelectorsIDs.PIX_INSTRUCTIONS}
              accessibilityLiveRegion="polite"
            >
              {pixAnnouncement}
            </Text>
            <Box testID={VbaDetailsSelectorsIDs.PIX_CODE}>
              <BankDetailRow
                label={strings('virtual_bank_account.vba_details.br_code')}
                value={instructions.brCode}
              />
            </Box>
            {instructions.pixKey ? (
              <Box testID={VbaDetailsSelectorsIDs.PIX_KEY}>
                <BankDetailRow
                  label={strings('virtual_bank_account.vba_details.pix_key')}
                  value={instructions.pixKey}
                />
              </Box>
            ) : null}
          </Box>
        ) : (
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="mt-4"
            testID={VbaDetailsSelectorsIDs.WAITING_FOR_PIX}
          >
            {strings('virtual_bank_account.vba_details.waiting_for_pix')}
          </Text>
        )}
        {transactionLabel ? (
          <Text
            variant={TextVariant.BodyMd}
            twClassName="mt-4"
            testID={VbaDetailsSelectorsIDs.TRANSACTION_STATUS}
            accessibilityLiveRegion="polite"
          >
            {transactionAnnouncement}
          </Text>
        ) : null}
        {loadError ? (
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.ErrorDefault}
            twClassName="mt-4"
            testID={VbaDetailsSelectorsIDs.LOAD_ERROR}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            {strings('virtual_bank_account.vba_details.load_error')}
          </Text>
        ) : null}
      </ScrollView>
      <Box twClassName="p-4">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleDone}
          testID={VbaDetailsSelectorsIDs.DONE_BUTTON}
        >
          {strings('virtual_bank_account.vba_details.button')}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default VbaDetails;
