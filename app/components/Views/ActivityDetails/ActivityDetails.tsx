import React, { useCallback, useEffect, useRef } from 'react';
import { ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation } from '@react-navigation/native';
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
import { selectTransactionMetadataById } from '../../../selectors/transactionController';
import type { RootState } from '../../../reducers';
import { resolveActivityListItemTitle } from '../../UI/ActivityListItemRow/ActivityListItemRow';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): reuses the confirmations speed-up/cancel modal; route-isolation backlog
import { CancelSpeedupModal } from '../confirmations/components/modals/cancel-speedup-modal';
/* eslint-disable import-x/no-restricted-paths -- transient row hand-off + shared pending-action logic from the activity list; route-isolation backlog */
import { getPreloadedActivityItem } from '../ActivityList/preloadedActivityItemStore';
import {
  useUnifiedTxActions,
  type SpeedUpCancelParams,
} from '../ActivityList/useUnifiedTxActions';
/* eslint-enable import-x/no-restricted-paths */
import { ActivityDetailsSelectorsIDs } from './ActivityDetails.testIds';
import type { ActivityDetailsParams } from './ActivityDetails.types';
import { useActivityDetailsItem } from './hooks/useActivityDetailsItem';
import { ActivityDetailsPendingBanner } from './components/ActivityDetailsPendingBanner';
import { TemplateLoader } from './templates/TemplateLoader';

/**
 * Redesigned activity details screen. Re-resolves the {@link ActivityListItem}
 * from the `{ chainId, txIdentifier }` route params (mirroring the extension's
 * `ui/pages/details` flow), then dispatches to a per-type template via
 * `TemplateLoader`. Gated behind `selectIsTransactionsRedesignEnabled` at the
 * navigation call site.
 */
const ActivityDetails = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { chainId, txIdentifier, preloadKey } =
    useParams<ActivityDetailsParams>();
  // Provider-backed rows (Perps / Predict) are handed off via a transient store
  // keyed by `preloadKey` (params stay serializable). Capture the row once per
  // key and hold it, so a later store eviction can't blank a still-mounted
  // screen on re-render; re-read only when the key changes (the screen is reused
  // across navigations).
  const preloadedRef = useRef<{
    key?: string;
    item: ReturnType<typeof getPreloadedActivityItem>;
  }>({ item: undefined });
  if (preloadedRef.current.key !== preloadKey) {
    preloadedRef.current = {
      key: preloadKey,
      item: getPreloadedActivityItem(preloadKey),
    };
  }
  const preloadedItem = preloadedRef.current.item;

  const item = useActivityDetailsItem(txIdentifier, chainId, preloadedItem);
  const title = item
    ? resolveActivityListItemTitle(item)
    : strings('activity_details.not_found');

  // Pending speed-up / cancel: resolve the live local `TransactionMeta` for the
  // resolved item so the banner reflects current status/gas. Only local EVM
  // items carry a `TransactionMeta`; API / non-EVM items have none (no banner).
  const localTxId =
    item?.raw?.type === 'localTransaction'
      ? item.raw.data.primaryTransaction?.id
      : undefined;
  const pendingTx = useSelector((state: RootState) =>
    localTxId ? selectTransactionMetadataById(state, localTxId) : undefined,
  );

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
        ) : (
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
};

export default ActivityDetails;
