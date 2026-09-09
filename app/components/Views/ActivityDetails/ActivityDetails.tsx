import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
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
/* eslint-disable import-x/no-restricted-paths -- shared pending-action logic + live perps/predict sources from the activity list; route-isolation backlog */
import {
  useUnifiedTxActions,
  type SpeedUpCancelParams,
} from '../ActivityList/useUnifiedTxActions';
import {
  INITIAL_PERPS_ACTIVITY_SOURCE_STATE,
  PerpsActivitySource,
  type PerpsActivitySourceState,
} from '../ActivityList/hooks/PerpsActivitySource';
import {
  INITIAL_PREDICT_ACTIVITY_SOURCE_STATE,
  PredictActivitySource,
  type PredictActivitySourceState,
} from '../ActivityList/hooks/PredictActivitySource';
/* eslint-enable import-x/no-restricted-paths */
import { selectPerpsEnabledFlag } from '../../UI/Perps/selectors/featureFlags';
import { selectPredictEnabledFlag } from '../../UI/Predict/selectors/featureFlags';
import { ActivityDetailsSelectorsIDs } from './ActivityDetails.testIds';
import type { ActivityDetailsParams } from './ActivityDetails.types';
import { useActivityDetailsItem } from './hooks/useActivityDetailsItem';
import { useLocalTransactionMeta } from './hooks/useLocalTransactionMeta';
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
  const navigation = useNavigation<AppNavigationProp>();
  const isFocused = useIsFocused();
  const { chainId, txIdentifier } = useParams<ActivityDetailsParams>();
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const isPredictEnabled = useSelector(selectPredictEnabledFlag);
  const [perpsSource, setPerpsSource] = useState<PerpsActivitySourceState>(
    INITIAL_PERPS_ACTIVITY_SOURCE_STATE,
  );
  const [predictSource, setPredictSource] =
    useState<PredictActivitySourceState>(INITIAL_PREDICT_ACTIVITY_SOURCE_STATE);
  const [perpsReported, setPerpsReported] = useState(false);
  const [predictReported, setPredictReported] = useState(false);

  const handlePerpsSourceChange = useCallback(
    (state: PerpsActivitySourceState) => {
      setPerpsSource(state);
      setPerpsReported(true);
    },
    [],
  );
  const handlePredictSourceChange = useCallback(
    (state: PredictActivitySourceState) => {
      setPredictSource(state);
      setPredictReported(true);
    },
    [],
  );

  const extraItems = useMemo(
    () => [
      ...(isPerpsEnabled ? perpsSource.items : []),
      ...(isPredictEnabled ? predictSource.items : []),
    ],
    [isPerpsEnabled, isPredictEnabled, perpsSource.items, predictSource.items],
  );

  const item = useActivityDetailsItem(txIdentifier, chainId, extraItems);
  const waitingOnProviderSource =
    !item &&
    ((isPerpsEnabled && !perpsReported) ||
      (isPredictEnabled && !predictReported));
  const { bridgeHistoryItemsBySrcTxHash } = useBridgeHistoryItemBySrcTxHash();
  const bridgeHistoryItem = findBridgeHistoryItemBySrcTxHash(
    bridgeHistoryItemsBySrcTxHash,
    item?.hash,
  );
  const title = item
    ? resolveActivityListItemTitle(item, bridgeHistoryItem)
    : waitingOnProviderSource
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

        {isPerpsEnabled ? (
          <PerpsActivitySource onChange={handlePerpsSourceChange} />
        ) : null}
        {isPredictEnabled ? (
          <PredictActivitySource onChange={handlePredictSourceChange} />
        ) : null}

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
        ) : waitingOnProviderSource ? null : (
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
