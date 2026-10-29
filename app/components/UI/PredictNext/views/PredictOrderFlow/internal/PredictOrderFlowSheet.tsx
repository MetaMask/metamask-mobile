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
import {
  BottomSheet,
  Box,
  Button,
  ButtonIcon,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Skeleton } from '../../../../../../component-library/components-temp/Skeleton';
import ModalSafeAreaProvider from '../../../../../../component-library/components-temp/ModalSafeAreaProvider';
import { strings } from '../../../../../../../locales/i18n';
import Logger from '../../../../../../util/Logger';
import { useBalance } from '../../../hooks/useBalance';
import { useVenueStatus } from '../../../hooks/useVenueStatus';
import { PredictError, PredictErrorCode } from '../../../errors';
import type {
  PredictAmount,
  PredictDecimal,
  PredictEntityId,
  PredictOrderPreview,
  PredictOrderPreviewParams,
  PredictOrderReceipt,
  PredictOutcomeSide,
  PredictVenueId,
} from '../../../types';
import { formatCents } from '../../../utils/formatCents';
import { formatUsd } from '../../../utils/formatUsd';
import {
  isPreviewExpired,
  type PredictOrderService,
} from '../../../services/PredictOrderService';

import { OrderAmountInput } from './OrderAmountInput';
import { OrderApproval } from './OrderApproval';
import { OrderBreakdownSheet } from './OrderBreakdownSheet';
import { OrderKeypad } from './OrderKeypad';
import { OrderQuickAmounts } from './OrderQuickAmounts';
import { OrderQuickContracts } from './OrderQuickContracts';
import { OrderPreviewRows } from './OrderPreviewRows';
import { OrderReceiptOutcome } from './OrderReceiptOutcome';
import { OrderSummaryRows } from './OrderSummaryRows';
import { PredictOrderFlowTestIds } from './PredictOrderFlow.testIds';

const QUOTE_DEBOUNCE_MS = 500;
const MINIMUM_AMOUNT = 1;
/** Contract counts are whole numbers only, so no fraction is valid. */
const MINIMUM_CONTRACTS = 1;
const MAX_INPUT_DIGITS = 9;

/** The user's Order intent, discriminated by the Order Action (ADR-0001):
 * a buy spends USD on an Outcome; a sell — a Cash Out — offers whole
 * contracts of one held Position, bounded by `maxContracts`. */
export type PredictOrderFlowIntent =
  | {
      action: 'buy';
      /** Canonical identity of the Event the Order sheet was opened from:
       * every buy entry point renders within one Event. */
      eventId: PredictEntityId;
      venueId: PredictVenueId;
      marketId: PredictEntityId;
      side: PredictOutcomeSide;
      outcomeLabel: string;
      eventTitle: string;
      eventImageUrl?: string;
      askPrice?: PredictDecimal;
    }
  | {
      action: 'sell';
      /** Canonical identity of the Position's Event, when the Position's
       * catalog context is available. */
      eventId?: PredictEntityId;
      venueId: PredictVenueId;
      marketId: PredictEntityId;
      side: PredictOutcomeSide;
      outcomeLabel: string;
      eventTitle: string;
      eventImageUrl?: string;
      /** Display context: the highest current Bid for the Outcome. */
      bidPrice?: PredictDecimal;
      /** The whole-contract size of the held Position: an over-sell never
       * leaves this sheet. */
      maxContracts: number;
    };

interface PredictOrderFlowSheetProps {
  intent: PredictOrderFlowIntent;
  service: PredictOrderService;
  onClose: () => void;
}

/** The explicit Order Flow phases: enter the amount, approve the exact
 * quoted values, commit, and read the receipt-driven outcome. */
type SubmitPhase = 'input' | 'approval' | 'submitting' | 'receipt';

const styles = StyleSheet.create({
  modalHost: { ...StyleSheet.absoluteFill },
});

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
  const [contracts, setContracts] = useState('');
  const [quoteNonce, setQuoteNonce] = useState(0);
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);
  const [preview, setPreview] = useState<PredictOrderPreview | null>(null);
  const [quoteError, setQuoteError] = useState<PredictError | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [isBreakdownVisible, setIsBreakdownVisible] = useState(false);
  const [phase, setPhase] = useState<SubmitPhase>('input');
  const [receipt, setReceipt] = useState<PredictOrderReceipt | null>(null);
  const [isRechecking, setIsRechecking] = useState(false);
  // A Commit failure that returned no Receipt: the operation may or may not
  // exist, so the approval step stays and keeps this Preview for observation
  // even after local expiry. Re-approval re-POSTs the same idempotent
  // Preview reference. A fresh quote is the sole next step only when the
  // venue confirms `preview_expired` before creating an operation.
  const [commitError, setCommitError] = useState<PredictError | null>(null);
  // A Commit rejected as `preview_expired` marks the quote expired even when
  // the client clock disagrees: the venue is authoritative.
  const [venueExpired, setVenueExpired] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const requestIdRef = useRef(0);

  const balanceQuery = useBalance(intent.venueId);
  const venueStatusQuery = useVenueStatus(intent.venueId);
  const termsUrl = venueStatusQuery.data?.termsUrl;

  useEffect(() => {
    sheetRef.current?.onOpenBottomSheet();
  }, []);

  useEffect(() => {
    setAmount('');
    setContracts('');
    setQuoteNonce(0);
    setIsKeypadOpen(false);
    setPreview(null);
    setQuoteError(null);
    setIsQuoting(false);
    setIsBreakdownVisible(false);
    setPhase('input');
    setReceipt(null);
    setIsRechecking(false);
    setCommitError(null);
    setVenueExpired(false);
    requestIdRef.current += 1;
  }, [intent]);

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

  /** Integer-only contract entry: digits, no leading zeros, bounded length. */
  const sanitizeContracts = useCallback(
    (next: string) =>
      next
        .replace(/[^0-9]/gu, '')
        .replace(/^0+(?=\d)/u, '')
        .slice(0, MAX_INPUT_DIGITS),
    [],
  );

  const maxContracts = intent.action === 'sell' ? intent.maxContracts : 0;
  const contractCount = Number(contracts || '0');
  const isOverSell = intent.action === 'sell' && contractCount > maxContracts;
  const isEnteredContracts = intent.action === 'sell' && contracts.length > 0;

  const isQuotable =
    intent.action === 'buy'
      ? /^\d{1,9}(\.\d{1,2})?$/u.test(amount) &&
        Number(amount) >= MINIMUM_AMOUNT
      : /^\d+$/u.test(contracts) &&
        contractCount >= MINIMUM_CONTRACTS &&
        !isOverSell;
  const isBelowMinimum = intent.action === 'buy' && /^0\./u.test(amount);

  useEffect(() => {
    requestIdRef.current += 1;
    if (phase !== 'input') {
      setIsQuoting(false);
      return;
    }
    if (!isQuotable) {
      setIsQuoting(false);
      setPreview(null);
      setQuoteError(null);
      return;
    }
    const requestId = requestIdRef.current;
    setIsQuoting(true);
    setQuoteError(null);
    setCommitError(null);
    const timeout = setTimeout(() => {
      const params: PredictOrderPreviewParams =
        intent.action === 'buy'
          ? {
              marketId: intent.marketId,
              side: intent.side,
              action: 'buy',
              amount: amount as PredictAmount,
            }
          : {
              marketId: intent.marketId,
              side: intent.side,
              action: 'sell',
              contracts: contracts as PredictAmount,
            };
      service
        .requestQuote(intent.venueId, params)
        .then((quote) => {
          if (requestIdRef.current !== requestId) {
            return;
          }
          setPreview(quote);
          setVenueExpired(false);
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
  }, [amount, contracts, intent, isQuotable, phase, quoteNonce, service]);

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

  const isExpired =
    venueExpired || (preview !== null && isPreviewExpired(preview, now));
  // After an attempted Commit, keep the original Preview for observation
  // even if the quote has expired locally. Only a venue `preview_expired`
  // (commitError stays unset) makes a fresh quote the sole next step.
  const approvalExpired = commitError === null && isExpired;
  const canReview =
    phase === 'input' && preview !== null && !isQuoting && !isExpired;
  const canRefresh = isExpired || Boolean(quoteError);

  const handleRefresh = useCallback(() => {
    setQuoteNonce((nonce) => nonce + 1);
  }, []);

  /** Back to the amount entry from the approval step. */
  const handleBack = useCallback(() => {
    setPhase('input');
  }, []);

  /** A re-quote from the approval step or a receipt outcome: fresh quote
   * for the entered amount, discarding the receipt. */
  const handleRequote = useCallback(() => {
    setReceipt(null);
    setPhase('input');
    setQuoteNonce((nonce) => nonce + 1);
  }, []);

  const handleReview = useCallback(() => {
    if (!canReview) {
      return;
    }
    setIsKeypadOpen(false);
    setPhase('approval');
  }, [canReview]);

  /** Commits the approved Preview. The Commit sends nothing but the Preview
   * reference; the service coalesces repeated commits and observes
   * in-progress operations, so this never places a second Order. */
  const handleCommit = useCallback(async () => {
    if (phase !== 'approval' || !preview) {
      return;
    }
    setCommitError(null);
    setPhase('submitting');
    try {
      const committed = await service.commitPreview(
        intent.venueId,
        preview.previewId,
      );
      setReceipt(committed);
      setPhase('receipt');
    } catch (error) {
      // The Commit failed before a Receipt existed, so the operation may or
      // may not exist. The approval step stays and keeps this Preview for
      // observation even after local expiry: re-approving re-POSTs the same
      // idempotent Preview reference. Never a second Order.
      setPhase('approval');
      if (
        error instanceof PredictError &&
        error.code === PredictErrorCode.PREVIEW_EXPIRED
      ) {
        // The venue revalidated the Preview as expired: degrade to the same
        // re-quote affordance as a locally expired quote — never a failure.
        setVenueExpired(true);
      } else {
        setCommitError(
          error instanceof PredictError
            ? error
            : PredictError.from(PredictErrorCode.UNKNOWN),
        );
      }
    }
  }, [intent.venueId, phase, preview, service]);

  /** Observes an unresolved receipt by committing the same Preview again —
   * idempotent by Preview reference, so it never places a second Order. */
  const handleKeepChecking = useCallback(async () => {
    if (!receipt) {
      return;
    }
    setIsRechecking(true);
    try {
      setReceipt(
        await service.commitPreview(intent.venueId, receipt.previewId),
      );
    } catch {
      // Still unresolved: stay on the honest in-progress state. The outcome
      // also surfaces through History and Positions.
    } finally {
      setIsRechecking(false);
    }
  }, [intent.venueId, receipt, service]);

  const isAmountEditable = phase === 'input';

  const handleKeypadOpen = useCallback(() => {
    if (!isAmountEditable) {
      return;
    }
    setIsKeypadOpen(true);
  }, [isAmountEditable]);
  const handleBreakdownPress = useCallback(
    () => setIsBreakdownVisible(true),
    [],
  );
  const handleBreakdownClose = useCallback(
    () => setIsBreakdownVisible(false),
    [],
  );
  const handleKeyPress = useCallback(
    (key: string) => {
      if (!isAmountEditable) {
        return;
      }
      if (intent.action === 'sell') {
        setContracts((current) => sanitizeContracts(`${current}${key}`));
        return;
      }
      setAmount((current) => {
        const next = sanitizeAmount(`${current}${key}`);
        const digitCount = next.match(/\d/gu)?.length ?? 0;
        return digitCount > 9 ? current : next;
      });
    },
    [intent.action, isAmountEditable, sanitizeAmount, sanitizeContracts],
  );
  const handleDelete = useCallback(() => {
    if (!isAmountEditable) {
      return;
    }
    if (intent.action === 'sell') {
      setContracts((current) => current.slice(0, -1));
      return;
    }
    setAmount((current) => sanitizeAmount(current.slice(0, -1)));
  }, [intent.action, isAmountEditable, sanitizeAmount]);
  /** Adds a quick-amount chip's increment, in exact cents. */
  const handleAddAmount = useCallback(
    (increment: number) => {
      if (!isAmountEditable) {
        return;
      }
      setAmount((current) => {
        const cents =
          Math.round(Number(current || '0') * 100) + increment * 100;
        return sanitizeAmount((cents / 100).toFixed(2).replace(/\.00$/u, ''));
      });
    },
    [isAmountEditable, sanitizeAmount],
  );
  /** Sets a quick-contract chip's whole-contract count. */
  const handleSetContracts = useCallback(
    (next: number) => {
      if (!isAmountEditable) {
        return;
      }
      setContracts(sanitizeContracts(String(next)));
    },
    [isAmountEditable, sanitizeContracts],
  );

  useEffect(() => {
    if (isBreakdownVisible) {
      breakdownSheetRef.current?.onOpenBottomSheet();
    }
  }, [isBreakdownVisible]);

  const handleTermsPress = useCallback(() => {
    if (!termsUrl) {
      return;
    }
    Linking.openURL(termsUrl).catch((error: Error) => {
      // Opening the terms page must never break the Order flow; the link is
      // informational, so a failure is only logged.
      Logger.error(error, 'PredictNext: failed to open the terms URL');
    });
  }, [termsUrl]);

  const contextPrice =
    intent.action === 'buy' ? intent.askPrice : intent.bidPrice;
  const displayedPrice = isQuoting
    ? contextPrice
    : (preview?.averagePrice ?? contextPrice);
  const toWinLabel = formatUsd(
    preview?.action === 'buy' ? preview.potentialPayout : '0.00',
  );
  const netProceedsLabel = formatUsd(
    preview?.action === 'sell' && !isQuoting
      ? preview.estimatedNetProceeds
      : '0.00',
  );
  const totalLabel =
    preview && !isQuoting && preview.action === 'buy'
      ? formatUsd(preview.totalDebit)
      : formatUsd(Number(amount || '0').toFixed(2));
  const balanceLabel = balanceQuery.data
    ? Number(balanceQuery.data.available).toFixed(2)
    : undefined;

  const statusMessage = useMemo(() => {
    // Sell-mode input validation runs first: an over-sell or a zero count
    // never reaches the quote, so its message outranks quote states.
    if (intent.action === 'sell') {
      if (isOverSell) {
        return (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.ErrorDefault}
            twClassName="text-center"
            testID={PredictOrderFlowTestIds.CONTRACTS_INPUT_ERROR}
          >
            {strings('predict_next.order_preview.over_sell', {
              contracts: maxContracts,
            })}
          </Text>
        );
      }
      if (isEnteredContracts && contractCount < MINIMUM_CONTRACTS) {
        return (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.ErrorDefault}
            twClassName="text-center"
            testID={PredictOrderFlowTestIds.CONTRACTS_INPUT_ERROR}
          >
            {strings('predict_next.order_preview.minimum_contracts')}
          </Text>
        );
      }
    } else if (!isQuotable) {
      return isBelowMinimum ? (
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.ErrorDefault}
          twClassName="text-center"
        >
          {strings('predict_next.order_preview.minimum_amount', {
            amount: MINIMUM_AMOUNT,
          })}
        </Text>
      ) : null;
    }
    if (isQuoting) {
      return null;
    }
    if (quoteError) {
      return (
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.ErrorDefault}
          twClassName="text-center"
          testID={PredictOrderFlowTestIds.ERROR}
        >
          {quoteError.message}
        </Text>
      );
    }
    if (preview && isExpired) {
      return (
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          twClassName="text-center"
          testID={PredictOrderFlowTestIds.EXPIRED}
        >
          {strings('predict_next.order_preview.expired')}
        </Text>
      );
    }
    return null;
  }, [
    contractCount,
    intent.action,
    isBelowMinimum,
    isEnteredContracts,
    isExpired,
    isOverSell,
    isQuotable,
    isQuoting,
    maxContracts,
    preview,
    quoteError,
  ]);

  const renderCta = () => {
    if (phase === 'submitting') {
      return (
        <Box
          twClassName="h-12 flex-row items-center justify-center gap-2"
          testID={PredictOrderFlowTestIds.SUBMITTING}
        >
          <ActivityIndicator size="small" />
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('predict_next.order_preview.submitting')}
          </Text>
        </Box>
      );
    }
    if (canRefresh) {
      return (
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleRefresh}
          testID={PredictOrderFlowTestIds.REFRESH}
        >
          {strings('predict_next.order_preview.refresh')}
        </Button>
      );
    }
    return (
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        isFullWidth
        onPress={handleReview}
        isDisabled={!canReview}
        testID={PredictOrderFlowTestIds.REVIEW}
      >
        {strings('predict_next.order_preview.review')}
      </Button>
    );
  };

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
          <BottomSheet
            ref={sheetRef}
            onClose={onClose}
            testID={PredictOrderFlowTestIds.SHEET}
          >
            <Box twClassName="flex-row items-center gap-3 px-4 pb-3 pt-1">
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
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
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
                    variant={TextVariant.BodyLg}
                    fontWeight={FontWeight.Bold}
                    color={TextColor.TextDefault}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {intent.outcomeLabel}
                  </Text>
                  {displayedPrice ? (
                    <Text
                      variant={TextVariant.BodyLg}
                      fontWeight={FontWeight.Bold}
                      color={TextColor.TextDefault}
                      numberOfLines={1}
                    >
                      {` · ${formatCents(displayedPrice)}`}
                    </Text>
                  ) : null}
                </Box>
              </Box>
              <ButtonIcon
                iconName={IconName.Close}
                onPress={onClose}
                accessibilityLabel={strings('predict_next.order_preview.close')}
              />
            </Box>
            <Box twClassName="px-4">
              {phase === 'receipt' && receipt ? (
                <OrderReceiptOutcome
                  receipt={receipt}
                  outcomeLabel={intent.outcomeLabel}
                  quotedPrice={preview ? formatCents(preview.averagePrice) : ''}
                  isRechecking={isRechecking}
                  onKeepChecking={handleKeepChecking}
                  onRequote={handleRequote}
                  onDone={onClose}
                />
              ) : phase === 'approval' && preview ? (
                <Box twClassName="gap-2 py-3">
                  {commitError ? (
                    <Text
                      variant={TextVariant.BodySm}
                      color={TextColor.ErrorDefault}
                      twClassName="text-center"
                      testID={PredictOrderFlowTestIds.ERROR}
                    >
                      {commitError.message}
                    </Text>
                  ) : null}
                  <OrderApproval
                    preview={preview}
                    isExpired={approvalExpired}
                    onApprove={handleCommit}
                    onBack={handleBack}
                    onRefresh={handleRequote}
                  />
                </Box>
              ) : (
                <>
                  <Box twClassName="items-center justify-center gap-2 py-6">
                    <OrderAmountInput
                      amount={intent.action === 'sell' ? contracts : amount}
                      isActive={isKeypadOpen}
                      isDisabled={!isAmountEditable}
                      onAmountPress={handleKeypadOpen}
                      prefix={intent.action === 'sell' ? '' : '$'}
                      accessibilityLabel={
                        intent.action === 'sell'
                          ? strings('predict_next.order_preview.contracts')
                          : undefined
                      }
                    />
                    {isQuoting ? (
                      <Skeleton width={140} height={24} />
                    ) : intent.action === 'sell' ? (
                      <Text
                        variant={TextVariant.BodyLg}
                        fontWeight={FontWeight.Medium}
                        color={TextColor.SuccessDefault}
                        testID={PredictOrderFlowTestIds.NET_PROCEEDS_LINE}
                      >
                        {strings(
                          'predict_next.order_preview.net_proceeds_line',
                          {
                            amount: netProceedsLabel,
                          },
                        )}
                      </Text>
                    ) : (
                      <Text
                        variant={TextVariant.BodyLg}
                        fontWeight={FontWeight.Medium}
                        color={TextColor.SuccessDefault}
                        testID={PredictOrderFlowTestIds.TO_WIN}
                      >
                        {strings('predict_next.order_preview.to_win', {
                          amount: toWinLabel,
                        })}
                      </Text>
                    )}
                    {intent.action === 'sell' ? (
                      <Text
                        variant={TextVariant.BodySm}
                        color={TextColor.TextAlternative}
                        twClassName="text-center"
                        testID={PredictOrderFlowTestIds.HELD_CONTRACTS}
                      >
                        {strings('predict_next.order_preview.held_contracts', {
                          contracts: maxContracts,
                        })}
                      </Text>
                    ) : null}
                  </Box>
                  {intent.action === 'sell' ? (
                    <OrderQuickContracts
                      maxContracts={maxContracts}
                      onSetContracts={handleSetContracts}
                      isDisabled={!isAmountEditable}
                    />
                  ) : (
                    <OrderQuickAmounts
                      onAddAmount={handleAddAmount}
                      isDisabled={!isAmountEditable}
                    />
                  )}
                  <Box twClassName="py-3">
                    {intent.action === 'sell' ? null : (
                      <OrderSummaryRows
                        balance={balanceLabel}
                        total={totalLabel}
                        canShowBreakdown={preview !== null && !isQuoting}
                        onBreakdownPress={handleBreakdownPress}
                      />
                    )}
                  </Box>
                  <Box twClassName="gap-2">
                    {statusMessage}
                    {renderCta()}
                    <Box twClassName="flex-row flex-wrap justify-center gap-1">
                      <Text
                        variant={TextVariant.BodyXs}
                        color={TextColor.TextAlternative}
                      >
                        {strings('predict_next.order_preview.terms')}
                      </Text>
                      {termsUrl ? (
                        <Text
                          variant={TextVariant.BodyXs}
                          color={TextColor.InfoDefault}
                          onPress={handleTermsPress}
                          suppressHighlighting
                        >
                          {strings('predict_next.order_preview.learn_more')}
                        </Text>
                      ) : null}
                    </Box>
                  </Box>
                </>
              )}
            </Box>
            {isKeypadOpen && phase === 'input' && (
              <OrderKeypad
                onKeyPress={handleKeyPress}
                onDelete={handleDelete}
                showsDecimalKey={intent.action !== 'sell'}
              />
            )}
          </BottomSheet>
          {isBreakdownVisible && preview && (
            <OrderBreakdownSheet
              ref={breakdownSheetRef}
              preview={preview}
              onClose={handleBreakdownClose}
            />
          )}
        </ModalSafeAreaProvider>
      </Modal>
    </View>
  );
};
