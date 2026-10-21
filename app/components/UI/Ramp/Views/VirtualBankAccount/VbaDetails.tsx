import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
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
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { useNetworkTier } from '../../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../../util/deviceCapability';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { selectSelectedVbaWalletAddress } from '../../../../../selectors/rampsController';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import vbaPixLogo from './assets/vba-pix-logo.png';
import {
  pickLatestTransaction,
  type AutorampTransactionSummary,
} from './pickLatestTransaction';
import { isVbaDepositDebugEnabled } from './vbaDepositDebug';
import VbaDepositDebugSheet from './VbaDepositDebugSheet';
import {
  ensureBrazilMusdAutoramp,
  findUsableAutoramp,
} from './ensureBrazilMusdAutoramp';

const DEFAULT_POLL_INTERVAL_MS = 10_000;
const CONSTRAINED_POLL_INTERVAL_MS = 30_000;
// Keep the Figma disclosure ready while Product finalizes the copy.
const SHOW_ACCOUNT_PROVIDER_DISCLOSURE = false;

export const VbaDetailsSelectorsIDs = {
  CONTAINER: 'vba-details-container',
  HEADER: 'vba-details-header',
  BACK_BUTTON: 'vba-details-back-button',
  LOGO: 'vba-details-logo',
  COPY_BUTTON: 'vba-details-copy-button',
  PIX_CODE: 'vba-details-pix-code',
  PIX_KEY: 'vba-details-pix-key',
  HELPER_TEXT: 'vba-details-helper-text',
  LOADING: 'vba-details-loading',
  LOAD_ERROR: 'vba-details-load-error',
  SETUP_ERROR: 'vba-details-setup-error',
  RETRY_BUTTON: 'vba-details-retry-button',
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

/**
 * Virtual bank account screen. This is the only place that registers the
 * wallet and creates the BRL autoramp. Until a PIX rail exists, the existing
 * loading state stays on screen. Pushed on the root stack
 * (`Routes.RAMP.VBA_DETAILS`) with the same horizontal transition as
 * onboarding. PIX values come from
 * `NeoBankService.getPixDepositInstructions`.
 */
const VbaDetails = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const walletAddress = useSelector(selectSelectedVbaWalletAddress);
  const hardwareTier = getHardwareTier();
  const networkTier = useNetworkTier();
  const debugEnabled = isVbaDepositDebugEnabled();
  const [instructions, setInstructions] =
    useState<PixDepositInstructions | null>(null);
  const [autorampId, setAutorampId] = useState<string | null>(null);
  const [autorampStatus, setAutorampStatus] = useState<string | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<string | null>(
    null,
  );
  const [loadError, setLoadError] = useState(false);
  const [setupFailed, setSetupFailed] = useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refreshDeposit = useCallback(async () => {
    if (!walletAddress) {
      return;
    }
    const ramps = Engine.context.RampsController as DepositRamps;
    let autoramp = findUsableAutoramp(
      ramps.state?.autoramps ?? [],
      walletAddress,
    );
    if (!autoramp) {
      const outcome = await ensureBrazilMusdAutoramp(walletAddress);
      if (!isMountedRef.current) {
        return;
      }
      autoramp = findUsableAutoramp(
        ramps.state?.autoramps ?? [],
        walletAddress,
      );
      if (!autoramp) {
        setSetupFailed(outcome === 'failed');
        setAutorampId(null);
        setAutorampStatus(null);
        setInstructions(null);
        return;
      }
    }
    setSetupFailed(false);

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
    if (networkTier === 'NONE') {
      return;
    }

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
  }, [hardwareTier, networkTier, refreshDeposit]);

  useEffect(() => {
    if (!loadError || instructions?.brCode) {
      return;
    }
    AccessibilityInfo.announceForAccessibility(
      strings('virtual_bank_account.vba_details.load_error'),
    );
  }, [instructions?.brCode, loadError]);

  useEffect(() => {
    if (!setupFailed || instructions?.brCode) {
      return;
    }
    AccessibilityInfo.announceForAccessibility(
      strings('virtual_bank_account.vba_details.setup_error'),
    );
  }, [instructions?.brCode, setupFailed]);

  const handleRetrySetup = useCallback(() => {
    refreshDeposit().catch(() => undefined);
  }, [refreshDeposit]);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  }, [navigation]);

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

  const skeletonMotion = hardwareTier === 'LOW' ? { autoPlay: false } : {};
  const showSetupRetry = setupFailed && !instructions?.brCode;
  const errorMessage = setupFailed
    ? strings('virtual_bank_account.vba_details.setup_error')
    : loadError
      ? strings('virtual_bank_account.vba_details.load_error')
      : null;

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
        <Box alignItems={BoxAlignItems.Center} twClassName="w-full">
          <Image
            source={vbaPixLogo}
            accessibilityIgnoresInvertColors
            accessible={false}
            importantForAccessibility="no"
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
              </Box>
            ))}
          </Box>
        ) : errorMessage ? (
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.ErrorDefault}
            twClassName="mt-6 text-center"
            testID={
              setupFailed
                ? VbaDetailsSelectorsIDs.SETUP_ERROR
                : VbaDetailsSelectorsIDs.LOAD_ERROR
            }
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            {errorMessage}
          </Text>
        ) : (
          <Box
            twClassName="mt-6 overflow-hidden rounded-xl bg-muted"
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={strings(
              'virtual_bank_account.vba_details.loading',
            )}
            testID={VbaDetailsSelectorsIDs.LOADING}
          >
            {['copia-cola', 'pix-key'].map((id) => (
              <Box
                key={id}
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="gap-3 px-4 py-3"
              >
                <Skeleton
                  width={20}
                  height={20}
                  twClassName="rounded-full"
                  {...skeletonMotion}
                />
                <Box twClassName="flex-1 gap-2">
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
                <Skeleton
                  width={24}
                  height={24}
                  twClassName="rounded"
                  {...skeletonMotion}
                />
              </Box>
            ))}
          </Box>
        )}
      </ScrollView>
      <Box twClassName="gap-4 px-4 pb-2 pt-4">
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
        {showSetupRetry ? (
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={handleRetrySetup}
            testID={VbaDetailsSelectorsIDs.RETRY_BUTTON}
          >
            {strings('virtual_bank_account.vba_details.retry')}
          </Button>
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
