import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
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
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { selectSelectedVbaWalletAddress } from '../../../../../selectors/rampsController';
import BankDetailRow from '../../components/BankDetailRow/BankDetailRow';

const POLL_INTERVAL_MS = 10_000;

export const VbaDetailsSelectorsIDs = {
  CONTAINER: 'vba-details-container',
  DONE_BUTTON: 'vba-details-done-button',
  PIX_CODE: 'vba-details-pix-code',
  TRANSACTION_STATUS: 'vba-details-transaction-status',
} as const;

type AutorampCursor = {
  id: string;
  walletAddress: string;
  status: string;
};

type PixDepositInstructions = {
  brCode: string;
  instruction: string;
  pixKey?: string;
};

type AutorampTransactionSummary = {
  id: string;
  status: string;
  sourceAmount?: string;
};

type DepositNeoBank = {
  getPixDepositInstructions: (
    autorampId: string,
  ) => Promise<PixDepositInstructions | null>;
  listAutorampTransactions: (
    autorampId: string,
  ) => Promise<AutorampTransactionSummary[]>;
};

type DepositRamps = {
  state?: { autoramps?: AutorampCursor[] };
  refreshAutoramp?: (autorampId: string) => Promise<AutorampCursor>;
};

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
      Engine.context as { NeoBankService?: DepositNeoBank }
    ).NeoBankService;
    if (
      !neoBank?.getPixDepositInstructions ||
      !neoBank.listAutorampTransactions
    ) {
      return;
    }
    const [pix, transactions] = await Promise.all([
      neoBank.getPixDepositInstructions(autoramp.id),
      neoBank.listAutorampTransactions(autoramp.id),
    ]);
    setInstructions(pix);
    setTransactionStatus(transactions[0]?.status ?? null);
  }, [walletAddress]);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        await refreshDeposit();
        if (!cancelled) {
          setLoadError(false);
        }
      } catch {
        if (!cancelled) {
          setLoadError(true);
        }
      }
    };
    tick();
    const timer = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [refreshDeposit]);

  const handleDone = useCallback(() => {
    navigation.navigate(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  }, [navigation]);

  const transactionLabel =
    transactionStatus === 'Completed'
      ? strings('virtual_bank_account.vba_details.transaction_completed')
      : transactionStatus;

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderStandard includesTopInset />
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
            <Text variant={TextVariant.BodyMd} twClassName="mb-2">
              {instructions.instruction}
            </Text>
            <Box testID={VbaDetailsSelectorsIDs.PIX_CODE}>
              <BankDetailRow
                label={strings('virtual_bank_account.vba_details.br_code')}
                value={instructions.brCode}
              />
            </Box>
            {instructions.pixKey ? (
              <BankDetailRow
                label={strings('virtual_bank_account.vba_details.pix_key')}
                value={instructions.pixKey}
              />
            ) : null}
          </Box>
        ) : (
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="mt-4"
          >
            {strings('virtual_bank_account.vba_details.waiting_for_pix')}
          </Text>
        )}
        {transactionLabel ? (
          <Text
            variant={TextVariant.BodyMd}
            twClassName="mt-4"
            testID={VbaDetailsSelectorsIDs.TRANSACTION_STATUS}
          >
            {strings('virtual_bank_account.vba_details.transaction_status', {
              status: transactionLabel,
            })}
          </Text>
        ) : null}
        {loadError ? (
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.ErrorDefault}
            twClassName="mt-4"
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
