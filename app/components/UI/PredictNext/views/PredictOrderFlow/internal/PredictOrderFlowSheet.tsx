import BigNumber from 'bignumber.js';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, Image, Linking } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import {
  BottomSheet,
  Box,
  Button,
  ButtonIcon,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Skeleton } from '../../../../../../component-library/components-temp/Skeleton';
import {
  PredictAmountDisplay,
  PredictKeypad,
} from '../../../components/PredictAmountEntry';
import { PredictFlowSheetHost } from '../../../components/PredictFlowSheetHost';
import { strings } from '../../../../../../../locales/i18n';
import Logger from '../../../../../../util/Logger';
import { useTheme } from '../../../../../../util/theme';
import DottedUnderline from '../../../../DottedUnderline';
import { useBalance } from '../../../hooks/useBalance';
import { useVenueStatus } from '../../../hooks/useVenueStatus';
import { usePredictImplementation } from '../../../implementation';
import { getVenueCapabilitySource } from '../../../capabilities/venueCapabilities';
import { PredictError, PredictErrorCode } from '../../../errors';
import type {
  PredictAmount,
  PredictBuyOrderPreview,
  PredictDecimal,
  PredictEntityId,
  PredictOrderPreview,
  PredictOrderPreviewParams,
  PredictOrderReceipt,
  PredictOrderReview,
  PredictOutcomeSide,
  PredictVenueId,
} from '../../../types';
import { formatCents } from '../../../utils/formatCents';
import { formatUsd } from '../../../utils/formatUsd';
import {
  isPreviewExpired,
  type PredictOrderResolution,
  type PredictOrderService,
} from '../../../services/PredictOrderService';

import { OrderApproval } from './OrderApproval';
import { OrderBreakdownSheet } from './OrderBreakdownSheet';
import { OrderQuickAmounts } from './OrderQuickAmounts';
import { OrderQuickContracts } from './OrderQuickContracts';
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
  /** Leaves for the deposit. Offered under an `insufficient_balance` quote
   * only when given, which is when deposits are ready for the Venue. */
  onAddFunds?: () => void;
}

/** The explicit Order Flow phases: enter the amount, approve the exact
 * quoted values, commit, and read the receipt-driven outcome. A buy has no
 * separate approval step: the Buy tap on the amount entry is the approval,
 * so a buy never enters 'approval'. */
type SubmitPhase = 'input' | 'approval' | 'submitting' | 'receipt';

/** The venue refused the Preview itself, not the order: the sheet offers
 * the same re-quote as for a locally expired quote, never a failure. */
const isPreviewRefusal = (code: PredictErrorCode): boolean =>
  code === PredictErrorCode.PREVIEW_EXPIRED ||
  code === PredictErrorCode.ORDER_PREVIEW_MISMATCH;

/** An amount as keypad input: whole cents, no trailing '.00'. */
const toAmountInput = (value: BigNumber): string =>
  value.toFixed(2).replace(/\.00$/u, '');

export const PredictOrderFlowSheet = ({
  intent,
  service,
  onClose,
  onAddFunds,
}: PredictOrderFlowSheetProps) => {
  const tw = useTailwind();
  const { colors } = useTheme();
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
  // Unknown submissions retain their preview and expose observe-only refresh.
  const [commitError, setCommitError] = useState<PredictError | null>(null);
  // A Commit rejected as `preview_expired` marks the quote expired even when
  // the client clock disagrees: the venue is authoritative.
  const [venueExpired, setVenueExpired] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const requestIdRef = useRef(0);
  // Unregisters this sheet as the surface showing a committed operation.
  // While registered, the operation's resolution lands here instead of in
  // the completion notification.
  const releasePresentationRef = useRef<(() => void) | null>(null);
  const [hasCommitted, setHasCommitted] = useState(false);
  // Where a Commit is approved from, and where it returns when it does not
  // settle: the approval step for a sell, the amount entry for a buy.
  const approvalPhase: SubmitPhase =
    intent.action === 'buy' ? 'input' : 'approval';

  // The sheet's Venue must still be the Active Venue. When it is not, the
  // service has already cancelled every uncommitted Preview, so the sheet
  // drops its quote and disables every action except closing.
  const implementation = usePredictImplementation();
  const isStale = !(
    implementation.status === 'ready' &&
    implementation.implementation === 'next' &&
    implementation.venueId === intent.venueId
  );

  const releasePresentation = useCallback(() => {
    releasePresentationRef.current?.();
    releasePresentationRef.current = null;
    setHasCommitted(false);
  }, []);

  useEffect(
    () => () => {
      // Closing the sheet hands a committed operation to the completion
      // notification; the service keeps observing it.
      releasePresentationRef.current?.();
      releasePresentationRef.current = null;
    },
    [],
  );

  /** The service resolved the operation this sheet shows, possibly from its
   * background observation after this sheet's own Commit call returned. */
  const handleResolution = useCallback(
    ({ outcome }: PredictOrderResolution) => {
      if (outcome.status === 'settled') {
        setCommitError(null);
        setReceipt(outcome.receipt);
        setPhase('receipt');
        return;
      }
      setPhase(approvalPhase);
      if (isPreviewRefusal(outcome.code)) {
        setCommitError(null);
        setVenueExpired(true);
      } else {
        setCommitError(PredictError.from(outcome.code));
      }
    },
    [approvalPhase],
  );

  const balanceQuery = useBalance(intent.venueId);
  const availableBalance = balanceQuery.data?.available;
  const venueStatusQuery = useVenueStatus(intent.venueId);
  const termsUrl = venueStatusQuery.data?.termsUrl;
  // The client-owned Venue display name names the venue in the buy terms
  // line; an unknown Venue keeps the generic copy.
  const venueDisplayName = getVenueCapabilitySource(
    intent.venueId,
  )?.displayName;

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
    releasePresentation();
  }, [intent, releasePresentation]);

  // Pre-submit work dies with the Venue change: the quote and an approval
  // that was never committed go back to an empty amount entry.
  useEffect(() => {
    if (!isStale || hasCommitted) {
      return;
    }
    requestIdRef.current += 1;
    setPreview(null);
    setQuoteError(null);
    setIsQuoting(false);
    setIsKeypadOpen(false);
    setIsBreakdownVisible(false);
    setPhase('input');
  }, [hasCommitted, isStale]);

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
    // While the sheet presents a Commit it never re-quotes: a buy that did
    // not settle keeps the Preview it committed until the user edits the
    // amount or refreshes.
    if (phase !== 'input' || isStale || hasCommitted) {
      setIsQuoting(false);
      return;
    }
    // The venue's expiry applied to the Preview being replaced.
    setVenueExpired(false);
    if (!isQuotable) {
      setIsQuoting(false);
      setPreview(null);
      setQuoteError(null);
      return;
    }
    const requestId = requestIdRef.current;
    const quoteAbort = new AbortController();
    setIsQuoting(true);
    setQuoteError(null);
    setCommitError(null);
    const timeout = setTimeout(() => {
      const idempotencyKey = uuidv4();
      // A buy amount is the maximum spend, fees included: the backend sizes
      // the quote so its total debit never exceeds it.
      const params: PredictOrderPreviewParams =
        intent.action === 'buy'
          ? {
              marketId: intent.marketId,
              side: intent.side,
              action: 'buy',
              amount: amount as PredictAmount,
              idempotencyKey,
            }
          : {
              marketId: intent.marketId,
              side: intent.side,
              action: 'sell',
              contracts: contracts as PredictAmount,
              idempotencyKey,
            };
      service
        .requestQuote(intent.venueId, params, { signal: quoteAbort.signal })
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
          // Every rejection, `insufficient_balance` included, is a product
          // state with a Refresh. Nothing re-requests on its own, so a
          // rejected amount (Max included) never loops.
          setPreview(null);
          setQuoteError(error);
        })
        .finally(() => {
          if (requestIdRef.current === requestId) {
            setIsQuoting(false);
          }
        });
    }, QUOTE_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeout);
      // A superseded quote is never needed again.
      quoteAbort.abort();
    };
  }, [
    amount,
    contracts,
    hasCommitted,
    intent,
    isQuotable,
    isStale,
    phase,
    quoteNonce,
    service,
  ]);

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
  const isObserving =
    commitError?.code === PredictErrorCode.ORDER_OUTCOME_UNKNOWN;
  const approvalExpired = !isObserving && isExpired;
  const canReview =
    phase === 'input' &&
    preview !== null &&
    !isQuoting &&
    !isExpired &&
    !isStale;
  // A dispatched order is observed, never re-quoted.
  const canRefresh =
    !isStale && !isObserving && (isExpired || Boolean(quoteError));

  /** Leaves the Commit the amount entry shows after a buy that did not
   * settle: the sheet stops presenting it, so the amount quotes again. */
  const leaveCommit = useCallback(() => {
    releasePresentation();
    setCommitError(null);
  }, [releasePresentation]);

  const handleRefresh = useCallback(() => {
    if (isStale) {
      return;
    }
    leaveCommit();
    setQuoteNonce((nonce) => nonce + 1);
  }, [isStale, leaveCommit]);

  /** Back to the amount entry from the approval step. A committed
   * operation this sheet showed goes on to the completion notification. */
  const handleBack = useCallback(() => {
    releasePresentation();
    setPhase('input');
  }, [releasePresentation]);

  /** A re-quote from the approval step or a receipt outcome: fresh quote
   * for the entered amount, discarding the receipt. */
  const handleRequote = useCallback(() => {
    if (isStale) {
      return;
    }
    releasePresentation();
    setReceipt(null);
    setPhase('input');
    setQuoteNonce((nonce) => nonce + 1);
  }, [isStale, releasePresentation]);

  /** The worst case the phone would sign, from the profile's invariant: the
   * figures the approval shows. Undefined while it is computed or when the
   * profile refuses the order, which keeps Confirm disabled. */
  const [signedDisplay, setSignedDisplay] = useState<PredictOrderReview>();
  useEffect(() => {
    setSignedDisplay(undefined);
    if (!preview) {
      return undefined;
    }
    let current = true;
    service
      .reviewPreview(intent.venueId, preview.previewId)
      .then((display) => {
        if (current) {
          setSignedDisplay(display);
        }
      })
      .catch((error: unknown) => {
        Logger.log('PredictNext: the signing profile refused the quote', error);
        if (current) {
          // Say why Approve stays disabled: this quote cannot be signed, and
          // a fresh quote is the way forward.
          setCommitError(PredictError.from(PredictErrorCode.QUOTE_UNAVAILABLE));
        }
      });
    return () => {
      current = false;
    };
  }, [intent.venueId, preview, service]);

  // The signed figures for the Preview on screen, never a previous quote's.
  const currentReview =
    preview !== null && signedDisplay?.previewId === preview.previewId
      ? signedDisplay
      : undefined;
  /** A buy commits straight from the amount entry, and only once the phone
   * has checked what it would sign. A dispatched order is only observed. */
  const canBuy =
    intent.action === 'buy' &&
    canReview &&
    currentReview !== undefined &&
    !isObserving;

  const handleReview = useCallback(() => {
    if (!canReview) {
      return;
    }
    setIsKeypadOpen(false);
    setPhase('approval');
  }, [canReview]);

  /** Commits the approved Preview: from the approval step for a sell, from
   * the Buy tap for a buy. The Commit sends nothing but the Preview
   * reference; the service coalesces repeated commits and observes
   * in-progress operations, so this never places a second Order. */
  const handleCommit = useCallback(async () => {
    // A stale sheet never commits, not even a re-approval of an ambiguous
    // Commit: the service keeps observing that one in the background.
    const canCommit =
      intent.action === 'buy' ? canBuy : phase === 'approval' && !isStale;
    if (!canCommit || !preview) {
      return;
    }
    if (!signedDisplay) {
      // Nothing the phone checked can be signed: Confirm stays disabled,
      // and this is the same refusal if it is reached anyway.
      setCommitError(PredictError.from(PredictErrorCode.UNKNOWN));
      return;
    }
    setIsKeypadOpen(false);
    setCommitError(null);
    setPhase('submitting');
    if (!releasePresentationRef.current) {
      // Registered before the Commit is dispatched, so its resolution can
      // never reach the completion notification while this sheet shows it.
      releasePresentationRef.current = service.presentOperation(
        preview.previewId,
        handleResolution,
      );
      setHasCommitted(true);
    }
    try {
      const committed = await service.commitPreview(
        intent.venueId,
        preview.previewId,
        { kind: 'user-approved' },
      );
      setReceipt(committed);
      setPhase('receipt');
    } catch (error) {
      // The service distinguishes an unsent first attempt from an unknown
      // outcome. Unknown attempts retain this preview for observation only.
      setPhase(approvalPhase);
      if (error instanceof PredictError && isPreviewRefusal(error.code)) {
        setCommitError(null);
        setVenueExpired(true);
      } else {
        setCommitError(
          error instanceof PredictError
            ? error
            : PredictError.from(PredictErrorCode.UNKNOWN),
        );
      }
    }
  }, [
    approvalPhase,
    canBuy,
    handleResolution,
    intent.action,
    intent.venueId,
    isStale,
    phase,
    preview,
    service,
    signedDisplay,
  ]);

  /** Observes a committed operation whose outcome is still open: an
   * unresolved receipt, or a buy Commit whose response was lost. Observing
   * never submits and never signs a Commit. */
  const handleKeepChecking = useCallback(async () => {
    const previewId =
      receipt?.previewId ?? (isObserving ? preview?.previewId : undefined);
    if (!previewId || isStale) {
      return;
    }
    setIsRechecking(true);
    try {
      // The operation is already committed: this reads its receipt.
      const observed = await service.commitPreview(intent.venueId, previewId);
      setCommitError(null);
      setReceipt(observed);
      setPhase('receipt');
    } catch {
      // Still unresolved: stay on the honest in-progress state. The outcome
      // also surfaces through History and Positions.
    } finally {
      setIsRechecking(false);
    }
  }, [intent.venueId, isObserving, isStale, preview, receipt, service]);

  // A dispatched order's amount is fixed: it can only be observed.
  const isAmountEditable = phase === 'input' && !isStale && !isObserving;

  const handleKeypadOpen = useCallback(() => {
    if (!isAmountEditable) {
      return;
    }
    setIsKeypadOpen(true);
  }, [isAmountEditable]);
  const buyPreview: PredictBuyOrderPreview | null =
    preview?.action === 'buy' ? preview : null;
  const canShowDetails = buyPreview !== null && !isQuoting;
  const handleBreakdownPress = useCallback(() => {
    if (!canShowDetails) {
      return;
    }
    setIsBreakdownVisible(true);
  }, [canShowDetails]);
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
      leaveCommit();
      setAmount((current) => {
        const next = sanitizeAmount(`${current}${key}`);
        const digitCount = next.match(/\d/gu)?.length ?? 0;
        return digitCount > 9 ? current : next;
      });
    },
    [
      intent.action,
      isAmountEditable,
      leaveCommit,
      sanitizeAmount,
      sanitizeContracts,
    ],
  );
  const handleDelete = useCallback(() => {
    if (!isAmountEditable) {
      return;
    }
    if (intent.action === 'sell') {
      setContracts((current) => current.slice(0, -1));
      return;
    }
    leaveCommit();
    setAmount((current) => sanitizeAmount(current.slice(0, -1)));
  }, [intent.action, isAmountEditable, leaveCommit, sanitizeAmount]);
  /** Sets a quick-amount chip's fraction of the balance, in whole cents. */
  const handleSetAmount = useCallback(
    (next: BigNumber) => {
      if (!isAmountEditable) {
        return;
      }
      leaveCommit();
      setAmount(sanitizeAmount(toAmountInput(next)));
    },
    [isAmountEditable, leaveCommit, sanitizeAmount],
  );
  /** Sets the whole available balance, floored to cents. The amount is the
   * maximum spend fees included, so the backend quotes a debit within it.
   * The chip is disabled below the minimum, so this never sets less. */
  const handleMaxAmount = useCallback(() => {
    if (!isAmountEditable || !availableBalance) {
      return;
    }
    const balance = new BigNumber(availableBalance).decimalPlaces(
      2,
      BigNumber.ROUND_DOWN,
    );
    leaveCommit();
    setAmount(sanitizeAmount(toAmountInput(balance)));
  }, [availableBalance, isAmountEditable, leaveCommit, sanitizeAmount]);
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
  const balanceLabel = availableBalance
    ? new BigNumber(availableBalance).toFormat(2, BigNumber.ROUND_DOWN)
    : undefined;

  const statusMessage = useMemo(() => {
    if (isStale) {
      return (
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          twClassName="text-center"
          testID={PredictOrderFlowTestIds.VENUE_CHANGED}
        >
          {strings('predict_next.order_preview.venue_changed')}
        </Text>
      );
    }
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
      const message = (
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.ErrorDefault}
          twClassName="text-center"
          testID={PredictOrderFlowTestIds.ERROR}
        >
          {quoteError.message}
        </Text>
      );
      return onAddFunds &&
        quoteError.code === PredictErrorCode.INSUFFICIENT_BALANCE ? (
        <Box twClassName="items-center">
          {message}
          <Button
            variant={ButtonVariant.Tertiary}
            size={ButtonSize.Sm}
            onPress={onAddFunds}
            testID={PredictOrderFlowTestIds.ADD_FUNDS}
          >
            {strings('predict_next.portfolio.add_funds')}
          </Button>
        </Box>
      ) : (
        message
      );
    }
    // A dispatched order outlives its quote: the expiry no longer applies.
    if (preview && isExpired && !isObserving) {
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
    isObserving,
    isOverSell,
    isQuotable,
    isQuoting,
    isStale,
    maxContracts,
    onAddFunds,
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
    if (isObserving) {
      return (
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isLoading={isRechecking}
          onPress={() => {
            handleKeepChecking().catch(() => undefined);
          }}
          isDisabled={isStale}
          testID={PredictOrderFlowTestIds.KEEP_CHECKING}
        >
          {strings('predict_next.order_receipt.keep_checking')}
        </Button>
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
    return intent.action === 'buy' ? (
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        isFullWidth
        onPress={() => {
          handleCommit().catch(() => undefined);
        }}
        isDisabled={!canBuy}
        testID={PredictOrderFlowTestIds.REVIEW}
      >
        {strings('predict_next.order_preview.buy')}
      </Button>
    ) : (
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
    <PredictFlowSheetHost onClose={onClose}>
      <BottomSheet
        ref={sheetRef}
        onClose={onClose}
        testID={PredictOrderFlowTestIds.SHEET}
      >
        <Box twClassName="flex-row items-center gap-3 px-4 pb-3 pt-1">
          {intent.action === 'buy' ? (
            // The buy sheet shows the event mark unboxed, as the
            // Kalshi x Predict design does with team logos.
            intent.eventImageUrl ? (
              <Image
                source={{ uri: intent.eventImageUrl }}
                style={tw.style('h-10 w-10')}
                resizeMode="contain"
              />
            ) : (
              <Box twClassName="h-10 w-10 rounded-full bg-muted" />
            )
          ) : intent.eventImageUrl ? (
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
            {intent.action === 'buy' ? (
              <Box
                twClassName="min-w-0 flex-row items-center gap-1"
                testID={PredictOrderFlowTestIds.OUTCOME_LABEL}
              >
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.SuccessDefault}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  twClassName="shrink"
                >
                  {intent.outcomeLabel}
                </Text>
                {/* Decorative until product decides what switching the
                 * outcome does; not a control. */}
                <Icon
                  name={IconName.SwapHorizontal}
                  size={IconSize.Sm}
                  color={IconColor.SuccessDefault}
                  testID={PredictOrderFlowTestIds.OUTCOME_SWAP_ICON}
                />
              </Box>
            ) : (
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
            )}
          </Box>
          <ButtonIcon
            iconName={IconName.Close}
            onPress={onClose}
            accessibilityLabel={strings('predict_next.order_preview.close')}
          />
        </Box>
        <Box twClassName="px-4">
          {phase === 'receipt' && receipt ? (
            <>
              {isStale ? statusMessage : null}
              <OrderReceiptOutcome
                receipt={receipt}
                outcomeLabel={intent.outcomeLabel}
                quotedPrice={preview ? formatCents(preview.averagePrice) : ''}
                isRechecking={isRechecking}
                areActionsDisabled={isStale}
                onKeepChecking={handleKeepChecking}
                onRequote={handleRequote}
                onDone={onClose}
              />
            </>
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
              {isStale ? statusMessage : null}
              <OrderApproval
                preview={preview}
                display={signedDisplay}
                isExpired={approvalExpired}
                isObserving={isObserving}
                isDisabled={isStale}
                onApprove={handleCommit}
                onBack={handleBack}
                onRefresh={handleRequote}
              />
            </Box>
          ) : (
            <>
              <Box twClassName="items-center justify-center gap-2 py-6">
                <PredictAmountDisplay
                  amount={intent.action === 'sell' ? contracts : amount}
                  isActive={isKeypadOpen}
                  isDisabled={!isAmountEditable}
                  onAmountPress={handleKeypadOpen}
                  prefix={intent.action === 'sell' ? '' : '$'}
                  accessibilityLabel={
                    intent.action === 'sell'
                      ? strings('predict_next.order_preview.contracts')
                      : strings('predict_next.order_preview.amount')
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
                    {strings('predict_next.order_preview.net_proceeds_line', {
                      amount: netProceedsLabel,
                    })}
                  </Text>
                ) : (
                  // The only entry point to the details sheet: live
                  // once a quote exists, inert while quoting or without
                  // one.
                  // The same dotted underline as Money's APY, so it renders
                  // on Android.
                  <DottedUnderline color={colors.success.default}>
                    <Text
                      variant={TextVariant.BodyLg}
                      fontWeight={FontWeight.Medium}
                      color={TextColor.SuccessDefault}
                      onPress={
                        canShowDetails ? handleBreakdownPress : undefined
                      }
                      suppressHighlighting
                      accessibilityRole={canShowDetails ? 'button' : 'text'}
                      accessibilityState={{ disabled: !canShowDetails }}
                      testID={PredictOrderFlowTestIds.TO_WIN}
                    >
                      {strings('predict_next.order_preview.to_win', {
                        amount: toWinLabel,
                      })}
                    </Text>
                  </DottedUnderline>
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
                  balance={availableBalance}
                  minimumAmount={MINIMUM_AMOUNT}
                  onSetAmount={handleSetAmount}
                  onMax={handleMaxAmount}
                  isDisabled={!isAmountEditable}
                />
              )}
              <Box twClassName="py-3">
                {intent.action === 'sell' ? null : (
                  <OrderSummaryRows
                    balance={balanceLabel}
                    maxCost={currentReview?.maxCost}
                    isMaxCostLoading={isQuoting}
                  />
                )}
              </Box>
              <Box twClassName="gap-2">
                {intent.action === 'buy' && commitError ? (
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.ErrorDefault}
                    className="text-center"
                    testID={PredictOrderFlowTestIds.ERROR}
                  >
                    {commitError.message}
                  </Text>
                ) : null}
                {statusMessage}
                {renderCta()}
                <Box twClassName="flex-row flex-wrap justify-center gap-1">
                  <Text
                    variant={TextVariant.BodyXs}
                    color={TextColor.TextAlternative}
                  >
                    {intent.action === 'buy' && venueDisplayName
                      ? strings('predict_next.order_preview.venue_terms', {
                          venue: venueDisplayName,
                        })
                      : strings('predict_next.order_preview.terms')}
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
          <PredictKeypad
            onKeyPress={handleKeyPress}
            onDelete={handleDelete}
            showsDecimalKey={intent.action !== 'sell'}
            hasFilledActionKeys={intent.action === 'buy'}
          />
        )}
      </BottomSheet>
      {isBreakdownVisible && buyPreview && (
        <OrderBreakdownSheet
          ref={breakdownSheetRef}
          preview={buyPreview}
          onClose={handleBreakdownClose}
        />
      )}
    </PredictFlowSheetHost>
  );
};
