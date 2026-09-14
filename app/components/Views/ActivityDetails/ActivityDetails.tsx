import React, { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import { useParams } from '../../../util/navigation/navUtils';
// eslint-disable-next-line import-x/no-restricted-paths
import {
  useBridgeHistoryItemBySrcTxHash,
  findBridgeHistoryItemBySrcTxHash,
} from '../../UI/Bridge/hooks/useBridgeHistoryItemBySrcTxHash';
import { resolveActivityListItemTitle } from '../../UI/ActivityListItemRow/ActivityListItemRow';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): reuses the confirmations speed-up/cancel modal; route-isolation backlog
import { CancelSpeedupModal } from '../confirmations/components/modals/cancel-speedup-modal';
/* eslint-disable import-x/no-restricted-paths -- transient row hand-off + shared pending-action logic from the activity list; route-isolation backlog */
import {
  useUnifiedTxActions,
  type SpeedUpCancelParams,
} from '../ActivityList/useUnifiedTxActions';
/* eslint-enable import-x/no-restricted-paths */
import { PerpsConnectionProvider } from '../../UI/Perps/providers/PerpsConnectionProvider';
import { PerpsStreamProvider } from '../../UI/Perps/providers/PerpsStreamManager';
import { usePerpsDetailsItem } from './templates/Perps/usePerpsDetailsItem';
import { usePredictDetailsItem } from './templates/PredictDetails/usePredictDetailsItem';
import { ActivityDetailsSelectorsIDs } from './ActivityDetails.testIds';
import type { ActivityDetailsParams } from './ActivityDetails.types';
import { useActivityDetailsItem } from './hooks/useActivityDetailsItem';
import { useLocalTransactionMeta } from './hooks/useLocalTransactionMeta';
/* eslint-disable-next-line import-x/no-restricted-paths */
import { useTransactionsQuery } from '../ActivityList/useTransactionsQuery';
import { ActivityDetailsPendingBanner } from './components/ActivityDetailsPendingBanner';
import { TemplateLoader } from './templates/TemplateLoader';

function ActivityDetailsProviders({ children }: { children: ReactNode }) {
  return (
    <PerpsConnectionProvider suppressErrorView>
      <PerpsStreamProvider>{children}</PerpsStreamProvider>
    </PerpsConnectionProvider>
  );
}

function ActivityDetailsScreen() {
  const { chainId, txIdentifier } = useParams<ActivityDetailsParams>();
  const activityItem = useActivityDetailsItem(txIdentifier, chainId);
  const { item: perpsItem, isLoading: isPerpsLoading } = usePerpsDetailsItem(
    txIdentifier,
    chainId,
  );
  const { item: predictItem, isLoading: isPredictLoading } =
    usePredictDetailsItem(activityItem ? undefined : txIdentifier, chainId);
  const item = perpsItem ?? activityItem ?? predictItem;
  const isLoading = isPerpsLoading || isPredictLoading;
  const { data: evmTransactions, isFetching } = useTransactionsQuery();
  const waitingForApi = !item && evmTransactions === undefined && isFetching;
  const waiting = Boolean(isLoading || waitingForApi);
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const isFocused = useIsFocused();
  const { bridgeHistoryItemsBySrcTxHash } = useBridgeHistoryItemBySrcTxHash();
  const bridgeHistoryItem = findBridgeHistoryItemBySrcTxHash(
    bridgeHistoryItemsBySrcTxHash,
    item?.hash,
  );
  const title = item
    ? resolveActivityListItemTitle(item, bridgeHistoryItem)
    : waiting
      ? ''
      : strings('activity_details.not_found');

  // Pending speed-up / cancel: resolve the live local `TransactionMeta` for the
  // resolved item so the banner reflects current status/gas. Only local EVM
  // items carry a `TransactionMeta`; API / non-EVM items have none (no banner).
  const pendingTx = useLocalTransactionMeta(item?.hash);

  const {
    speedUpIsOpen,
    cancelIsOpen,
    confirmDisabled,
    existingTx,
    isLedgerAccount,
    isQRHardwareAccount,
    onSpeedUpAction,
    onCancelAction,
    onSpeedUpCancelCompleted,
    speedUpTransaction,
    cancelTransaction,
    signQRTransaction,
    signLedgerTransaction,
    cancelUnsignedQRTransaction,
  } = useUnifiedTxActions();

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const actionInitiatedRef = useRef(false);
  const wasResolvedRef = useRef(false);

  const handleSpeedUpCancelConfirm = useCallback(
    (params?: SpeedUpCancelParams) => {
      actionInitiatedRef.current = true;
      return (cancelIsOpen ? cancelTransaction : speedUpTransaction)(params);
    },
    [cancelIsOpen, cancelTransaction, speedUpTransaction],
  );

  useEffect(() => {
    const isResolved = Boolean(item);
    // The viewed tx disappeared right after the user confirmed a speed-up/cancel
    // on this screen — i.e. its replacement committed and dropped the original.
    const viewedTxWasReplaced =
      wasResolvedRef.current && !isResolved && actionInitiatedRef.current;
    // Only dismiss while this screen is on top: a background re-render (the user
    // pushed another screen after confirming) must not pop the wrong screen, and
    // `isFocused` also excludes disappearances from navigating away (e.g. an
    // account switch) that would otherwise fire the stale arm.
    if (viewedTxWasReplaced && !isQRHardwareAccount && isFocused) {
      // Disarm so a later resolved→unresolved transition can't dismiss again.
      actionInitiatedRef.current = false;
      navigation.goBack();
    }
    wasResolvedRef.current = isResolved;
  }, [item, isQRHardwareAccount, navigation, isFocused]);

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
      testID={ActivityDetailsSelectorsIDs.SCREEN}
    >
      <Box twClassName="flex-1 bg-default">
        <HeaderStandard
          testID={ActivityDetailsSelectorsIDs.HEADER}
          includesTopInset
          title={title}
          onBack={handleBack}
          backButtonProps={{
            testID: ActivityDetailsSelectorsIDs.BACK_BUTTON,
          }}
        />

        {item ? (
          <ScrollView
            style={tw.style('flex-1')}
            contentContainerStyle={tw.style('grow p-4')}
          >
            {pendingTx ? (
              <ActivityDetailsPendingBanner
                tx={pendingTx}
                isQRHardwareAccount={isQRHardwareAccount}
                isLedgerAccount={isLedgerAccount}
                onSpeedUpAction={onSpeedUpAction}
                onCancelAction={onCancelAction}
                signQRTransaction={signQRTransaction}
                signLedgerTransaction={signLedgerTransaction}
                cancelUnsignedQRTransaction={cancelUnsignedQRTransaction}
              />
            ) : null}
            <TemplateLoader item={item} />
          </ScrollView>
        ) : waiting ? null : (
          <Box twClassName="flex-1 items-center justify-center p-4">
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              testID={ActivityDetailsSelectorsIDs.NOT_FOUND}
            >
              {strings('activity_details.not_found')}
            </Text>
          </Box>
        )}

        {/*
          The confirmation sheet is driven entirely by the hook's own state
          (`existingTx` + open flags set together in `onSpeedUp/CancelAction`),
          not by the banner's `pendingTx`. Gate on `existingTx` so the modal
          only mounts once an action has been triggered.
        */}
        {existingTx ? (
          <CancelSpeedupModal
            isVisible={speedUpIsOpen || cancelIsOpen}
            isCancel={cancelIsOpen}
            tx={existingTx}
            onConfirm={handleSpeedUpCancelConfirm}
            onClose={onSpeedUpCancelCompleted}
            confirmDisabled={confirmDisabled}
          />
        ) : null}
      </Box>
    </SafeAreaView>
  );
}

const ActivityDetails = () => (
  <ActivityDetailsProviders>
    <ActivityDetailsScreen />
  </ActivityDetailsProviders>
);

export default ActivityDetails;
