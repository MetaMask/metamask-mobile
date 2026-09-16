import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  StyleSheet,
  View,
} from 'react-native';
// The gesture-handler ScrollView participates in the sheet's own pan
// gestures; the react-native one can refuse to scroll inside a
// gesture-handler BottomSheet on Android.
import {
  GestureHandlerRootView,
  ScrollView,
} from 'react-native-gesture-handler';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  Button,
  ButtonHero,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Skeleton } from '../../../../../../component-library/components-temp/Skeleton';
import ModalSafeAreaProvider from '../../../../../../component-library/components-temp/ModalSafeAreaProvider';
import { strings } from '../../../../../../../locales/i18n';
import { useBalance } from '../../../hooks/useBalance';
import type { PredictError } from '../../../errors';
import type {
  PredictAmount,
  PredictDecimal,
  PredictEntityId,
  PredictOrderPreview,
  PredictOutcomeSide,
  PredictVenueId,
} from '../../../types';
import { formatCents } from '../../../utils/formatCents';
import { formatUsd } from '../../../utils/formatUsd';
import type { PredictOrderPreviewService } from '../../../services/PredictOrderPreviewService';

import { OrderAmountInput } from './OrderAmountInput';
import { OrderBreakdownSheet } from './OrderBreakdownSheet';
import { OrderPreviewRows } from './OrderPreviewRows';
import { OrderSummaryRows } from './OrderSummaryRows';
import { PredictOrderFlowTestIds } from './PredictOrderFlow.testIds';

/** How long typing pauses before the changed amount is re-quoted. */
const QUOTE_DEBOUNCE_MS = 500;

/** The entered amount must be at least this many whole dollars. */
const MINIMUM_AMOUNT = 1;

// TODO(PRED): Wire the venue terms URL from the backend venue information
// once it exposes it; the blank target is intentional for now.
const TERMS_URL = '';

export interface PredictOrderFlowIntent {
  venueId: PredictVenueId;
  marketId: PredictEntityId;
  side: PredictOutcomeSide;
  outcomeLabel: string;
  /** Display snapshot: the Event the traded Market belongs to. */
  eventTitle: string;
  eventImageUrl?: string;
  /** The Outcome's last displayed ask price, shown before a quote arrives. */
  askPrice?: PredictDecimal;
}

interface PredictOrderFlowSheetProps {
  intent: PredictOrderFlowIntent;
  service: PredictOrderPreviewService;
  onClose: () => void;
}

type SubmitPhase = 'input' | 'submitting' | 'success';

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  modalHost: {
    ...StyleSheet.absoluteFill,
  },
});

/**
 * The Order Flow sheet: a big USD amount entry over a compact summary, the
 * server-authoritative quote, and the approve flow. Form input stays local
 * to React; every quoted value comes from the backend, and the full quote
 * breakdown lives behind the Total row's info affordance.
 */
export const PredictOrderFlowSheet = ({
  intent,
  service,
  onClose,
}: PredictOrderFlowSheetProps) => {
  const tw = useTailwind();
  const sheetRef = useRef<React.ComponentRef<typeof BottomSheet>>(null);
  const breakdownSheetRef =
    useRef<React.ComponentRef<typeof BottomSheet>>(null);

  const [amount, setAmount] = useState('');
  const [quoteNonce, setQuoteNonce] = useState(0);
  const [preview, setPreview] = useState<PredictOrderPreview | null>(null);
  const [quoteError, setQuoteError] = useState<PredictError | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [isBreakdownVisible, setIsBreakdownVisible] = useState(false);
  const [phase, setPhase] = useState<SubmitPhase>('input');
  const [now, setNow] = useState(() => Date.now());
  const requestIdRef = useRef(0);

  const balanceQuery = useBalance(intent.venueId);

  useEffect(() => {
    sheetRef.current?.onOpenBottomSheet();
  }, []);

  // Reset the flow whenever a new intent is opened.
  useEffect(() => {
    setAmount('');
    setQuoteNonce(0);
    setPreview(null);
    setQuoteError(null);
    setIsQuoting(false);
    setIsBreakdownVisible(false);
    setPhase('input');
    requestIdRef.current += 1;
  }, [intent]);

  // Digits with at most one dot and two decimals, at most 9 integer digits,
  // in canonical form: no leading zeros ('05' becomes '5', matching the
  // backend amount contract) and a bare leading dot gets a zero ('.5'
  // becomes '0.5').
  const sanitizeAmount = useCallback((next: string) => {
    const cleaned = next.replace(/[^0-9.]/gu, '');
    const dotIndex = cleaned.indexOf('.');
    const whole = (dotIndex === -1 ? cleaned : cleaned.slice(0, dotIndex))
      .slice(0, 9)
      .replace(/^0+(?=\d)/u, '');
    if (dotIndex === -1) {
      return whole;
    }
    const decimals = cleaned
      .slice(dotIndex + 1)
      .replace(/\./gu, '')
      .slice(0, 2);
    return `${whole.length > 0 ? whole : '0'}.${decimals}`;
  }, []);

  const isQuotable =
    /^\d{1,9}(\.\d{1,2})?$/u.test(amount) && Number(amount) >= MINIMUM_AMOUNT;

  // A dot with a zero whole part can never grow past the minimum ($0.99 at
  // best), so that input is settled below the minimum. Anything else
  // non-quotable is partial input still being typed and must not read as an
  // error.
  const isBelowMinimum = /^0\./u.test(amount);

  // Re-quote whenever the amount changes; stale responses are discarded. The
  // request id is bumped before the quotable check so an in-flight quote is
  // also discarded when the amount stops being quotable.
  useEffect(() => {
    requestIdRef.current += 1;
    if (!isQuotable) {
      setIsQuoting(false);
      setPreview(null);
      setQuoteError(null);
      return;
    }
    const requestId = requestIdRef.current;
    setIsQuoting(true);
    setQuoteError(null);
    const timeout = setTimeout(() => {
      service
        .requestQuote({
          marketId: intent.marketId,
          side: intent.side,
          amount: amount as PredictAmount,
        })
        .then((quote) => {
          if (requestIdRef.current !== requestId) {
            return;
          }
          setPreview(quote);
          setNow(Date.now());
        })
        .catch((error: PredictError) => {
          if (requestIdRef.current !== requestId) {
            return;
          }
          setPreview(null);
          setQuoteError(error);
        })
        .finally(() => {
          if (requestIdRef.current === requestId) {
            setIsQuoting(false);
          }
        });
    }, QUOTE_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [amount, intent, isQuotable, quoteNonce, service]);

  // Flip the live preview to expired the moment its expiry passes.
  useEffect(() => {
    if (!preview) {
      return;
    }
    const remaining = Date.parse(preview.expiresAt) - now;
    if (remaining <= 0) {
      return;
    }
    const timeout = setTimeout(() => setNow(Date.now()), remaining);
    return () => clearTimeout(timeout);
  }, [preview, now]);

  const isExpired = preview !== null && service.isExpired(preview, now);
  // A fresh quote loading for the changed amount hides the previous preview:
  // Approve must wait for the quote the user can actually see.
  const canApprove =
    phase === 'input' && preview !== null && !isQuoting && !isExpired;

  const handleRefresh = useCallback(() => {
    // Re-quote the unchanged intent by restarting the quote effect.
    setQuoteNonce((nonce) => nonce + 1);
  }, []);

  const handleApprove = useCallback(async () => {
    if (!preview || !canApprove) {
      return;
    }
    setPhase('submitting');
    try {
      await service.submitOrder({
        venueId: intent.venueId,
        previewId: preview.previewId,
      });
      setPhase('success');
    } catch {
      // The stub submission does not fail; re-enable the form if it ever does.
      setPhase('input');
    }
  }, [canApprove, intent.venueId, preview, service]);

  const handleBreakdownPress = useCallback(() => {
    setIsBreakdownVisible(true);
  }, []);

  const handleBreakdownClose = useCallback(() => {
    setIsBreakdownVisible(false);
  }, []);

  useEffect(() => {
    if (isBreakdownVisible) {
      breakdownSheetRef.current?.onOpenBottomSheet();
    }
  }, [isBreakdownVisible]);

  const handleTermsPress = useCallback(() => {
    if (TERMS_URL) {
      Linking.openURL(TERMS_URL);
    }
  }, []);

  // The header shows the Outcome's ask price until a quote lands, then the
  // quoted average; while a fresh quote loads the stale average is dropped.
  const displayedPrice = isQuoting
    ? intent.askPrice
    : (preview?.averagePrice ?? intent.askPrice);

  const toWinLabel = formatUsd(preview?.potentialPayout ?? '0.00');
  // Legacy parity: the Total reads as the entered amount until the quote
  // lands, then as the backend-owned total debit.
  const totalLabel =
    preview && !isQuoting
      ? formatUsd(preview.totalDebit)
      : formatUsd(Number(amount || '0').toFixed(2));
  const balanceLabel = balanceQuery.data
    ? Number(balanceQuery.data.available).toFixed(2)
    : undefined;

  const statusContent = useMemo(() => {
    if (isQuotable && isQuoting) {
      return null;
    }
    if (!isQuotable) {
      return isBelowMinimum ? (
        <Text
          variant={TextVariant.BodySm}
          twClassName="text-center text-error-default"
        >
          {strings('predict_next.order_preview.minimum_amount', {
            amount: MINIMUM_AMOUNT,
          })}
        </Text>
      ) : null;
    }
    if (quoteError) {
      return (
        <Box twClassName="items-center gap-2">
          <Text
            variant={TextVariant.BodySm}
            twClassName="text-center text-error-default"
            testID={PredictOrderFlowTestIds.ERROR}
          >
            {quoteError.message}
          </Text>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Sm}
            onPress={handleRefresh}
            testID={PredictOrderFlowTestIds.RETRY}
          >
            <Text>{strings('predict_next.order_preview.retry')}</Text>
          </Button>
        </Box>
      );
    }
    if (preview && isExpired) {
      return (
        <Box
          twClassName="items-center gap-2"
          testID={PredictOrderFlowTestIds.EXPIRED}
        >
          <Text
            variant={TextVariant.BodySm}
            twClassName="text-center text-alternative"
          >
            {strings('predict_next.order_preview.expired')}
          </Text>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Sm}
            onPress={handleRefresh}
            testID={PredictOrderFlowTestIds.REFRESH}
          >
            <Text>{strings('predict_next.order_preview.refresh')}</Text>
          </Button>
        </Box>
      );
    }
    return null;
  }, [
    handleRefresh,
    isBelowMinimum,
    isExpired,
    isQuoting,
    isQuotable,
    preview,
    quoteError,
  ]);

  return (
    <View pointerEvents="box-none" style={styles.modalHost}>
      <Modal
        visible
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <ModalSafeAreaProvider>
          <GestureHandlerRootView style={styles.gestureRoot}>
            <BottomSheet
              ref={sheetRef}
              isFullscreen
              onClose={onClose}
              testID={PredictOrderFlowTestIds.SHEET}
            >
              <BottomSheetHeader onClose={onClose}>
                <Box twClassName="min-w-0 flex-1 flex-row items-center gap-3">
                  {intent.eventImageUrl ? (
                    <Image
                      source={{ uri: intent.eventImageUrl }}
                      style={tw.style('h-12 w-12 rounded-lg')}
                    />
                  ) : (
                    <Box twClassName="h-12 w-12 rounded-lg bg-muted" />
                  )}
                  <Box twClassName="min-w-0 flex-1">
                    <Text
                      variant={TextVariant.BodySm}
                      twClassName="text-alternative"
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {intent.eventTitle}
                    </Text>
                    <Box
                      twClassName="min-w-0 flex-row items-center"
                      testID={PredictOrderFlowTestIds.OUTCOME_LABEL}
                    >
                      <Text
                        variant={TextVariant.BodySm}
                        fontWeight={FontWeight.Bold}
                        color={
                          intent.side === 'yes'
                            ? TextColor.SuccessDefault
                            : TextColor.ErrorDefault
                        }
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {intent.outcomeLabel}
                      </Text>
                      {displayedPrice ? (
                        <Text
                          variant={TextVariant.BodySm}
                          fontWeight={FontWeight.Bold}
                          color={
                            intent.side === 'yes'
                              ? TextColor.SuccessDefault
                              : TextColor.ErrorDefault
                          }
                          numberOfLines={1}
                        >
                          {` · ${formatCents(displayedPrice)}`}
                        </Text>
                      ) : null}
                    </Box>
                  </Box>
                </Box>
              </BottomSheetHeader>
              <ScrollView
                contentContainerStyle={tw.style('gap-4 px-4 pb-6 pt-2')}
              >
                {phase === 'success' ? (
                  <Box
                    twClassName="items-center justify-center gap-3 py-8"
                    testID={PredictOrderFlowTestIds.SUCCESS}
                  >
                    <Text
                      variant={TextVariant.HeadingSm}
                      fontWeight={FontWeight.Bold}
                    >
                      {strings('predict_next.order_preview.success_title')}
                    </Text>
                    <Button
                      variant={ButtonVariant.Primary}
                      size={ButtonSize.Lg}
                      onPress={onClose}
                      testID={PredictOrderFlowTestIds.DONE}
                    >
                      <Text>{strings('predict_next.order_preview.done')}</Text>
                    </Button>
                  </Box>
                ) : (
                  <>
                    <OrderAmountInput
                      amount={amount}
                      onAmountChange={(next) => setAmount(sanitizeAmount(next))}
                    />
                    <Box twClassName="items-center gap-2">
                      {isQuoting ? (
                        <Skeleton width={140} height={22} />
                      ) : (
                        <Text
                          variant={TextVariant.BodyMd}
                          fontWeight={FontWeight.Bold}
                          color={TextColor.SuccessDefault}
                          testID={PredictOrderFlowTestIds.TO_WIN}
                        >
                          {strings('predict_next.order_preview.to_win', {
                            amount: toWinLabel,
                          })}
                        </Text>
                      )}
                    </Box>
                    <OrderSummaryRows
                      balance={balanceLabel}
                      total={totalLabel}
                      canShowBreakdown={preview !== null && !isQuoting}
                      onBreakdownPress={handleBreakdownPress}
                    />
                    {statusContent}
                    {phase === 'submitting' ? (
                      <Box
                        twClassName="items-center gap-2"
                        testID={PredictOrderFlowTestIds.SUBMITTING}
                      >
                        <ActivityIndicator size="small" />
                        <Text
                          variant={TextVariant.BodySm}
                          twClassName="text-alternative"
                        >
                          {strings('predict_next.order_preview.submitting')}
                        </Text>
                      </Box>
                    ) : (
                      <ButtonHero
                        size={ButtonSize.Lg}
                        onPress={handleApprove}
                        isDisabled={!canApprove}
                        testID={PredictOrderFlowTestIds.APPROVE}
                      >
                        <Text variant={TextVariant.BodyMd}>
                          {strings('predict_next.order_preview.confirm')}
                        </Text>
                      </ButtonHero>
                    )}
                    <Box twClassName="flex-row flex-wrap justify-center gap-1">
                      <Text
                        variant={TextVariant.BodyXs}
                        twClassName="text-alternative"
                      >
                        {strings('predict_next.order_preview.terms')}
                      </Text>
                      <Text
                        variant={TextVariant.BodyXs}
                        twClassName="text-info-default"
                        onPress={handleTermsPress}
                        suppressHighlighting
                      >
                        {strings('predict_next.order_preview.learn_more')}
                      </Text>
                    </Box>
                  </>
                )}
              </ScrollView>
            </BottomSheet>
            {isBreakdownVisible && preview && (
              <OrderBreakdownSheet
                ref={breakdownSheetRef}
                preview={preview}
                onClose={handleBreakdownClose}
              />
            )}
          </GestureHandlerRootView>
        </ModalSafeAreaProvider>
      </Modal>
    </View>
  );
};
