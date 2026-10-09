import React, { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  Box,
  BoxAlignItems,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  HeaderStandard,
  Icon,
  IconColor,
  IconName,
  IconSize,
  ListItem,
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
import vbaPixLogo from './assets/vba-pix-logo.png';
import {
  pickLatestTransaction,
  type AutorampTransactionSummary,
} from './pickLatestTransaction';
import { isVbaDepositDebugEnabled } from './vbaDepositDebug';
import VbaDepositDebugSheet from './VbaDepositDebugSheet';

const POLL_INTERVAL_MS = 10_000;

export const VbaDetailsSelectorsIDs = {
  CONTAINER: 'vba-details-container',
  HEADER: 'vba-details-header',
  LOGO: 'vba-details-logo',
  COPY_BUTTON: 'vba-details-copy-button',
  DONE_BUTTON: 'vba-details-done-button',
  PIX_CODE: 'vba-details-pix-code',
  PIX_KEY: 'vba-details-pix-key',
  ROW_ICON: 'vba-details-row-icon',
  WAITING_FOR_PIX: 'vba-details-waiting-for-pix',
  LOAD_ERROR: 'vba-details-load-error',
  DEBUG_BUTTON: 'vba-details-debug-button',
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
 * Completed virtual bank account screen. Reached once the Money account is
 * provisioned. Presented as a root sheet (`Routes.RAMP.VBA_DETAILS`).
 * PIX values come from `NeoBankService.getPixDepositInstructions`.
 */
const VbaDetails = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const walletAddress = useSelector(selectSelectedVbaWalletAddress);
  const debugEnabled = isVbaDepositDebugEnabled();
  const [instructions, setInstructions] =
    useState<PixDepositInstructions | null>(null);
  const [autorampId, setAutorampId] = useState<string | null>(null);
  const [autorampStatus, setAutorampStatus] = useState<string | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<string | null>(
    null,
  );
  const [loadError, setLoadError] = useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(false);

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
      setAutorampId(null);
      setAutorampStatus(null);
      setInstructions(null);
      return;
    }

    let status = autoramp.status;
    if (status !== 'Approved' && ramps.refreshAutoramp) {
      const refreshed = await ramps.refreshAutoramp(autoramp.id);
      status = refreshed.status;
    }
    setAutorampId(autoramp.id);
    setAutorampStatus(status);

    const neoBank = (
      Engine.context as unknown as { NeoBankService?: DepositNeoBank }
    ).NeoBankService;
    if (!neoBank) {
      return;
    }

    // Fetch PIX on its own so a flaky transaction poll cannot hide the code.
    if (neoBank.getPixDepositInstructions) {
      try {
        const pix = await neoBank.getPixDepositInstructions(autoramp.id);
        if (pix?.brCode) {
          setInstructions(pix);
        }
      } catch (error) {
        Logger.error(error as Error, {
          message: 'VbaDetails: failed to load PIX deposit instructions',
        });
      }
    }

    if (debugEnabled && neoBank.listAutorampTransactions) {
      try {
        const transactions = await neoBank.listAutorampTransactions(
          autoramp.id,
        );
        setTransactionStatus(
          pickLatestTransaction(transactions)?.status ?? null,
        );
      } catch (error) {
        Logger.error(error as Error, {
          message: 'VbaDetails: failed to list autoramp transactions',
        });
      }
    }
  }, [debugEnabled, walletAddress]);

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;
    const tick = async () => {
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
    tick().catch(() => undefined);
    const timer = setInterval(() => {
      tick().catch(() => undefined);
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [refreshDeposit]);

  useEffect(() => {
    if (!loadError || instructions?.brCode) {
      return;
    }
    AccessibilityInfo.announceForAccessibility(
      strings('virtual_bank_account.vba_details.load_error'),
    );
  }, [instructions?.brCode, loadError]);

  const handleDone = useCallback(() => {
    navigation.navigate(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  }, [navigation]);

  const handleCopy = useCallback(
    (value: string) => () => {
      Clipboard.setString(value);
    },
    [],
  );

  const handleOpenDebug = useCallback(() => {
    setIsDebugOpen(true);
  }, []);

  const handleCloseDebug = useCallback(() => {
    setIsDebugOpen(false);
  }, []);

  const rows = [
    instructions?.brCode
      ? {
          id: 'copia-cola',
          testID: VbaDetailsSelectorsIDs.PIX_CODE,
          label: strings('virtual_bank_account.vba_details.copia_cola_label'),
          value: instructions.brCode,
        }
      : null,
    instructions?.pixKey
      ? {
          id: 'pix-key',
          testID: VbaDetailsSelectorsIDs.PIX_KEY,
          label: strings('virtual_bank_account.vba_details.pix_key_label'),
          value: instructions.pixKey,
        }
      : null,
  ].filter((row): row is NonNullable<typeof row> => row !== null);

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderStandard includesTopInset testID={VbaDetailsSelectorsIDs.HEADER} />
      <ScrollView
        contentContainerStyle={tw.style('flex-grow px-4 pb-4')}
        testID={VbaDetailsSelectorsIDs.CONTAINER}
      >
        <Box alignItems={BoxAlignItems.Center} twClassName="w-full">
          <Image
            source={vbaPixLogo}
            accessibilityIgnoresInvertColors
            accessibilityLabel={strings(
              'virtual_bank_account.vba_details.title',
            )}
            style={tw.style('h-[88px] w-[88px]')}
            testID={VbaDetailsSelectorsIDs.LOGO}
          />
        </Box>
        <Text variant={TextVariant.HeadingLg} twClassName="mt-6 text-center">
          {strings('virtual_bank_account.vba_details.title')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="mt-2 text-center"
        >
          {strings('virtual_bank_account.vba_details.description')}
        </Text>
        {rows.length > 0 ? (
          <Box twClassName="mt-6 overflow-hidden rounded-xl bg-muted">
            {rows.map((row) => (
              <Box key={row.id} testID={row.testID}>
                <ListItem
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
                  startAccessory={
                    <Icon
                      name={IconName.Key}
                      size={IconSize.Md}
                      color={IconColor.IconAlternative}
                      testID={`${VbaDetailsSelectorsIDs.ROW_ICON}-${row.id}`}
                    />
                  }
                  endAccessory={
                    <ButtonIcon
                      iconName={IconName.Copy}
                      size={ButtonIconSize.Md}
                      onPress={handleCopy(row.value)}
                      accessibilityLabel={strings(
                        'virtual_bank_account.vba_details.copy_label',
                      )}
                      testID={`${VbaDetailsSelectorsIDs.COPY_BUTTON}-${row.id}`}
                    />
                  }
                  accessoryGap={3}
                />
              </Box>
            ))}
          </Box>
        ) : (
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="mt-6 text-center"
            testID={VbaDetailsSelectorsIDs.WAITING_FOR_PIX}
          >
            {strings('virtual_bank_account.vba_details.waiting_for_pix')}
          </Text>
        )}
        {loadError && !instructions?.brCode ? (
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.ErrorDefault}
            twClassName="mt-4 text-center"
            testID={VbaDetailsSelectorsIDs.LOAD_ERROR}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            {strings('virtual_bank_account.vba_details.load_error')}
          </Text>
        ) : null}
      </ScrollView>
      <Box twClassName="gap-4 px-4 pb-2 pt-4">
        <Text
          variant={TextVariant.BodyXs}
          color={TextColor.TextAlternative}
          twClassName="text-center"
        >
          {strings('virtual_bank_account.vba_details.legal')}
        </Text>
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
          onPress={handleDone}
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
