import { useCollectiblesShare } from '../../hooks/useCollectiblesShare';
import { formatPurchaseAmount } from '../../components/PackPurchaseSheet/packPurchaseAmounts';
import { getCardTitle } from '../../components/CardDisplay/cardLabels';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import {
  StackActions,
  useIsFocused,
  useNavigation,
} from '@react-navigation/native';
import {
  BannerAlert,
  BannerAlertSeverity,
  Box,
  Button,
  ButtonIcon,
  IconName,
  ButtonVariant,
  HeaderStandard,
  Spinner,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppStackNavigationProp } from '../../../../../core/NavigationService/types';
import CtaButton from '../../components/CtaButton';
import ReplitSaleWallet from '../../components/CollectiblesMotion/ReplitSaleWallet';
import ReplitBuybackCelebration from '../../components/CollectiblesMotion/ReplitBuybackCelebration';
import { useReplitBuybackFeedback } from '../../components/CollectiblesMotion/useReplitBuybackFeedback';
import {
  measureTransferSources,
  useCollectionTransfer,
} from '../../components/CollectionTransfer/CollectionTransferProvider';
import { BuybackConfirmation } from '../../components/BuybackOffer';
import { useCollectiblesPresentation } from '../../hooks/useCollectiblesPresentation';
import PackPurchaseSheet, {
  type PurchaseRevealOptions,
} from '../../components/PackPurchaseSheet';
import { MAX_MULTIPACK_COUNT } from '../../providers/pack-partner/constants';
import { usePackPartnerAccount } from '../../providers/pack-partner/hooks/usePackPartnerAccount';
import { usePackPartnerPacks } from '../../providers/pack-partner/hooks/usePackPartnerPacks';
import { useUsdcBalance } from '../../providers/pack-partner/hooks/useUsdcBalance';
import { useBuybackOffers } from '../../providers/pack-partner/hooks/useBuybackOffer';
import { withCardSales } from '../../providers/pack-partner/utils/operations';
import { selectPackPartnerState } from '../../providers/pack-partner/selectors/packPartner';
import type { CollectiblesCard, CollectiblesPackOperation } from '../../types';
import { formatUsdcAmount } from '../../providers/pack-partner/utils/format';
import { getErrorMessageFromUnknown } from '../../providers/pack-partner/utils/errorMessages';
import CollectiblesRevealContent from './CollectiblesRevealContent';
import CollectiblesBatchResults, {
  getSaleAmount,
} from './CollectiblesBatchResults';

/** Final purchase statuses: nothing will change them any more. */
const SETTLED_STATUSES: readonly CollectiblesPackOperation['status'][] = [
  'opened',
  'expired',
  'failed',
];

/** One result at a time; remounting resets presentation without repeating a purchase. */
function BatchCardResult({
  card,
  index,
  total,
  onNext,
  onSell,
  revealed,
  onRevealed,
  saleDisabled,
  saleSourceRef,
  cardSourceRef,
  isCovered,
}: {
  card: CollectiblesCard;
  index: number;
  total: number;
  onNext: () => void;
  onSell: () => void;
  revealed: boolean;
  onRevealed: () => void;
  saleDisabled: boolean;
  saleSourceRef: RefObject<View | null>;
  cardSourceRef: RefObject<View | null>;
  isCovered: boolean;
}) {
  const focused = useIsFocused();
  const sold = card.sale?.status === 'completed';
  return (
    <CollectiblesRevealContent
      cardSourceRef={cardSourceRef}
      card={card}
      isActive={focused && !isCovered}
      isRevealed={revealed}
      onRevealed={onRevealed}
      initiallyRevealed={revealed}
      current={index + 1}
      total={total}
      footer={
        <>
          {getSaleAmount(card) && (
            <View ref={saleSourceRef} collapsable={false}>
              <CtaButton
                label={strings('collectibles.reveal.accept_buyback', {
                  amount: formatPurchaseAmount(
                    BigInt(getSaleAmount(card) ?? '0'),
                  ),
                })}
                onPress={onSell}
                isDisabled={saleDisabled}
                testID="collectibles-batch-sell-card"
              />
            </View>
          )}
          <Button
            isFullWidth
            variant={sold ? ButtonVariant.Primary : ButtonVariant.Secondary}
            onPress={onNext}
            testID="collectibles-batch-next"
          >
            {strings(
              !sold
                ? 'collectibles.reveal.keep_card'
                : index + 1 < total
                  ? 'collectibles.batch.next'
                  : 'collectibles.reveal.done',
            )}
          </Button>
        </>
      }
    />
  );
}

/** A batch uses persisted per-pack operations; no new purchase is generated by retry/reveal/skip. */
export default function CollectiblesBatchReveal({
  memo,
  skipReveal = false,
}: {
  memo: string;
  skipReveal?: boolean;
}) {
  const share = useCollectiblesShare();
  const feedback = useReplitBuybackFeedback();
  const { beginTransfers } = useCollectionTransfer();
  const currentCardSource = useRef<View>(null);
  const summaryCardSources = useRef(new Map<string, View>());
  const keeping = useRef(false);
  const isFocused = useIsFocused();
  const saleAnimationMints = useRef<string[]>([]);
  const tw = useTailwind();
  const { online } = useCollectiblesPresentation();
  const navigation = useNavigation<AppStackNavigationProp>();
  const selectedAccount = usePackPartnerAccount();
  const [owner] = useState(selectedAccount);
  const account =
    owner?.address === selectedAccount?.address &&
    owner?.id === selectedAccount?.id
      ? owner
      : undefined;
  const state = useSelector(selectPackPartnerState);
  const operations = owner ? state.operations[owner.address] : undefined;
  const sales = owner ? state.sales[owner.address] : undefined;
  const operation = operations?.[memo];
  const memos = useMemo(
    () => operation?.batchMemos ?? [memo],
    [operation?.batchMemos, memo],
  );
  // Each opened pack keeps its awarded card as its result, so a sold card stays
  // in the summary after it leaves the wallet.
  const results = useMemo(
    () =>
      memos.flatMap((item) => {
        const result = operations?.[item]?.result;
        return owner && result ? [result] : [];
      }),
    [memos, operations, owner],
  );
  const resultMints = useMemo(
    () => results.map((result) => result.mint),
    [results],
  );
  const offers = useBuybackOffers(resultMints, Boolean(account));
  const cards = useMemo(
    () =>
      withCardSales(results, sales).map((card) =>
        !card.sale && offers[card.mint]
          ? { ...card, buyback: offers[card.mint] }
          : card,
      ),
    [results, sales, offers],
  );
  // Every pack reached a final status. Expired packs were never charged and
  // failed ones were refunded, so the opened cards can be shown without them.
  const settled = memos.every((item) =>
    SETTLED_STATUSES.includes(operations?.[item]?.status ?? 'generated'),
  );
  const unopenedCount = memos.filter((item) => {
    const status = operations?.[item]?.status;
    return status === 'expired' || status === 'failed';
  }).length;
  const allOpened = settled && cards.length > 0;
  const hasPendingSale = cards.some((item) => item.sale?.status === 'pending');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string>();
  const [saleError, setSaleError] = useState(false);
  const [checkingSales, setCheckingSales] = useState(false);
  const [index, setIndex] = useState(() => {
    const first = memos.findIndex(
      (item) => !operations?.[item]?.revealCompleted,
    );
    return Math.max(first, 0);
  });
  const [revealedMints, setRevealedMints] = useState<string[]>([]);
  const [summary, setSummary] = useState(() =>
    memos.every((item) => operations?.[item]?.revealCompleted),
  );
  const [selectedMints, setSelectedMints] = useState<string[]>([]);
  const showSummary = summary || (skipReveal && memos.length > 1);
  const [saleReview, setSaleReview] = useState<CollectiblesCard[]>();
  const [buyAgain, setBuyAgain] = useState(false);
  const [quantity] = useState(Math.min(MAX_MULTIPACK_COUNT, memos.length));
  const inFlight = useRef(false);
  const started = useRef(false);
  const skipped = useRef(false);
  const balance = useUsdcBalance();
  const {
    packs,
    isLoading: packsLoading,
    error: packsError,
    refetch: refetchPacks,
  } = usePackPartnerPacks();
  const pack = packs.find((item) => item.code === operation?.packCode);
  const finishSaleFeedback = feedback.complete;
  useEffect(() => {
    if (!account) {
      saleAnimationMints.current = [];
      return;
    }
    if (busy || !saleAnimationMints.current.length) return;
    if (
      cards.some(
        (item) =>
          item.sale?.status === 'completed' &&
          saleAnimationMints.current.includes(item.mint),
      )
    ) {
      saleAnimationMints.current = [];
      finishSaleFeedback();
    }
  }, [busy, cards, finishSaleFeedback, account]);
  const replace = (nextMemo: string, options?: PurchaseRevealOptions) => {
    // A new reviewed purchase replaces this finished summary, so acknowledge it locally.
    if (account && allOpened)
      memos.forEach((item) =>
        Engine.context.CollectiblesController.dismissOperation({
          account,
          memo: item,
        }),
      );
    navigation.dispatch(
      StackActions.replace(Routes.COLLECTIBLES.REVEAL, {
        memo: nextMemo,
        skipReveal: options?.skipReveal,
      }),
    );
  };
  const refreshBalance = balance.refresh;

  const complete = useCallback(async () => {
    if (!account || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(undefined);
    setSaleError(false);
    try {
      // Pending sales are checked by memo, without signing again and without
      // waiting on unrelated purchases.
      await Promise.all([
        Engine.context.CollectiblesController.completePacks({ account, memo }),
        Engine.context.CollectiblesController.checkSales({
          address: account.address,
        }),
      ]);
    } catch (failure) {
      setError(getErrorMessageFromUnknown(failure));
    } finally {
      inFlight.current = false;
      setBusy(false);
      refreshBalance().catch(() => undefined);
    }
  }, [account, memo, refreshBalance]);

  useEffect(() => {
    if (!account || started.current) return;
    started.current = true;
    complete();
  }, [account, complete]);

  useEffect(() => {
    if (!skipReveal || !allOpened || busy || !account || skipped.current)
      return;
    skipped.current = true;
    // Only local presentation bookkeeping: pack opening already completed above.
    memos.forEach((item) =>
      Engine.context.CollectiblesController.markPackRevealed({
        account,
        memo: item,
        completed: memos.length > 1,
      }),
    );
  }, [skipReveal, allOpened, busy, account, memos]);

  const close = (keepCards = false) => {
    if (inFlight.current && saleReview) return;
    // Keep interrupted batches discoverable from the recovery banner.
    if (
      (showSummary || memos.length === 1 || !allOpened) &&
      account &&
      settled
    ) {
      memos.forEach((item) =>
        Engine.context.CollectiblesController.dismissOperation({
          account,
          memo: item,
        }),
      );
    }
    navigation.popTo(Routes.COLLECTIBLES.HOME, {
      initialTab: keepCards ? 'cards' : 'packs',
    });
  };
  const selected = cards.filter(
    (card) => getSaleAmount(card) && selectedMints.includes(card.mint),
  );
  const keepAndClose = async () => {
    if (keeping.current) return;
    if (!account) {
      close();
      return;
    }
    const kept = cards.filter((item) => !item.sale);
    if (!kept.length) {
      close();
      return;
    }
    keeping.current = true;
    beginTransfers(
      await measureTransferSources(
        kept.map((item) => ({
          card: item,
          view: showSummary
            ? (summaryCardSources.current.get(item.mint) ?? null)
            : currentCardSource.current,
        })),
      ),
    );
    close(true);
  };
  const reviewTotal = (saleReview ?? []).reduce(
    (sum, card) => sum + BigInt(getSaleAmount(card) ?? '0'),
    0n,
  );
  const confirmSale = async () => {
    if (!account || !saleReview || !online || inFlight.current) return;
    inFlight.current = true;
    saleAnimationMints.current = saleReview.map((item) => item.mint);
    setBusy(true);
    setError(undefined);
    setSaleError(true);
    try {
      await Engine.context.CollectiblesController.sellCards({
        account,
        cards: saleReview.map((card) => ({
          mint: card.mint,
          expectedAmount: getSaleAmount(card) ?? '0',
          ...(card.nftStandard ? { nftStandard: card.nftStandard } : {}),
        })),
      });
    } catch (failure) {
      setError(getErrorMessageFromUnknown(failure));
    } finally {
      inFlight.current = false;
      setBusy(false);
      setSaleReview(undefined);
      refreshBalance().catch(() => undefined);
    }
  };
  const checkSales = async () => {
    if (!account || !online || inFlight.current) return;
    inFlight.current = true;
    setCheckingSales(true);
    setError(undefined);
    try {
      // Resolves pending sales by memo; offers refresh through their reads.
      await Engine.context.CollectiblesController.checkSales({
        address: account.address,
      });
    } catch (failure) {
      setError(getErrorMessageFromUnknown(failure));
    } finally {
      inFlight.current = false;
      setCheckingSales(false);
      refreshBalance().catch(() => undefined);
    }
  };
  const singleSale = saleReview?.length === 1 ? saleReview[0] : undefined;
  const card = cards[Math.min(index, cards.length - 1)];
  return (
    <SafeAreaView
      ref={feedback.rootRef}
      edges={['left', 'right']}
      style={tw.style('flex-1 bg-default')}
      testID="collectibles-batch-reveal"
    >
      <HeaderStandard
        includesTopInset
        endAccessory={
          feedback.walletVisible && account ? (
            <Box twClassName="flex-row items-center gap-2">
              <ReplitSaleWallet
                value={balance.baseUnits}
                from={feedback.previousBalance}
                targetRef={feedback.targetRef}
                onLayout={feedback.onTargetLayout}
                isActive={isFocused}
              />
              <ButtonIcon
                iconName={IconName.Close}
                accessibilityLabel={strings('collectibles.reveal.close')}
                onPress={() => close()}
                isDisabled={busy && Boolean(saleReview)}
              />
            </Box>
          ) : undefined
        }
        startAccessory={
          allOpened &&
          !busy &&
          !saleReview &&
          !showSummary &&
          card &&
          (skipReveal ||
            revealedMints.includes(card.memo ?? card.mint) ||
            operations?.[card.memo ?? '']?.revealed) ? (
            <ButtonIcon
              iconName={IconName.Share}
              accessibilityLabel={strings('collectibles.card.share')}
              onPress={() => share.open([card])}
            />
          ) : undefined
        }
        title={
          saleReview && !singleSale
            ? strings('collectibles.card.confirm_sale')
            : undefined
        }
        onClose={() => close()}
        closeButtonProps={{ isDisabled: busy && Boolean(saleReview) }}
      />
      {!account && (
        <BannerAlert
          severity={BannerAlertSeverity.Warning}
          description={strings('collectibles.batch.account_changed')}
        />
      )}
      {error && !(settled && !allOpened) && (
        <Box padding={4} gap={3}>
          <BannerAlert
            severity={BannerAlertSeverity.Danger}
            description={error}
          />
          <Button
            isDisabled={busy || checkingSales || !account || !online}
            onPress={saleError ? checkSales : complete}
            testID="collectibles-batch-retry"
          >
            {strings('collectibles.errors.retry')}
          </Button>
        </Box>
      )}
      {settled && unopenedCount > 0 && !saleReview && (
        <Box padding={4}>
          <BannerAlert
            severity={BannerAlertSeverity.Warning}
            description={strings('collectibles.batch.not_opened', {
              count: unopenedCount,
              total: memos.length,
            })}
            testID="collectibles-batch-not-opened"
          />
        </Box>
      )}
      {hasPendingSale && !saleReview && (
        <Box padding={4} gap={3} testID="collectibles-batch-sale-pending">
          <BannerAlert
            severity={BannerAlertSeverity.Warning}
            description={strings('collectibles.errors.sale_pending')}
          />
          <Button
            isDisabled={checkingSales || !account || !online}
            isLoading={checkingSales}
            onPress={checkSales}
            testID="collectibles-batch-check-sales"
          >
            {strings('collectibles.card.check_sale_status')}
          </Button>
        </Box>
      )}
      {saleReview && !singleSale ? (
        <FlatList
          data={saleReview}
          keyExtractor={(item) => item.mint}
          contentContainerStyle={tw.style('p-5 gap-5')}
          ListHeaderComponent={
            <Box gap={4} paddingBottom={4}>
              <Text variant={TextVariant.HeadingMd}>
                {strings('collectibles.batch.confirm_count', {
                  count: saleReview.length,
                })}
              </Text>
              <Text color={TextColor.TextAlternative}>
                {strings('collectibles.batch.confirm_description')}
              </Text>
            </Box>
          }
          renderItem={({ item }) => (
            <Box twClassName="flex-row justify-between gap-3">
              <Text twClassName="flex-1">{getCardTitle(item)}</Text>
              <Text>{formatUsdcAmount(getSaleAmount(item) ?? '0')} USDC</Text>
            </Box>
          )}
          ListFooterComponent={
            <Box gap={3} paddingTop={6}>
              <Text variant={TextVariant.HeadingMd}>
                {strings('collectibles.batch.total', {
                  amount: formatUsdcAmount(reviewTotal),
                })}
              </Text>
              <CtaButton
                label={strings('collectibles.card.confirm_sale')}
                onPress={confirmSale}
                isLoading={busy}
                isDisabled={!account || !online}
                testID="collectibles-batch-confirm-sale"
              />
              <Button
                isDisabled={busy}
                onPress={() => setSaleReview(undefined)}
              >
                {strings('collectibles.batch.cancel')}
              </Button>
            </Box>
          }
        />
      ) : settled && !allOpened ? (
        <Box
          twClassName="flex-1 items-center justify-center px-8 gap-4"
          testID="collectibles-batch-unopened"
        >
          <Text variant={TextVariant.HeadingLg} twClassName="text-center">
            {strings('collectibles.batch.interrupted')}
          </Text>
          <Button onPress={() => close()} testID="collectibles-batch-close">
            {strings('collectibles.reveal.close')}
          </Button>
        </Box>
      ) : (busy && !singleSale) || !allOpened ? (
        <Box
          twClassName="flex-1 items-center justify-center px-8 gap-4"
          testID="collectibles-batch-loading"
        >
          {!error && <Spinner />}
          <Text variant={TextVariant.HeadingLg} twClassName="text-center">
            {strings(
              error
                ? 'collectibles.batch.interrupted'
                : 'collectibles.batch.preparing',
            )}
          </Text>
          <Text color={TextColor.TextAlternative} twClassName="text-center">
            {strings('collectibles.batch.preparing_description')}
          </Text>
          <Text accessibilityLiveRegion="polite">
            {strings('collectibles.batch.processing', {
              count: cards.length,
              total: memos.length,
            })}
          </Text>
        </Box>
      ) : showSummary ? (
        <CollectiblesBatchResults
          cards={cards}
          pack={pack}
          packs={packs}
          packsLoading={packsLoading}
          packsError={Boolean(packsError)}
          onRetryPacks={refetchPacks}
          selectedMints={selected.map((item) => item.mint)}
          actionsDisabled={!account || !online || checkingSales}
          isActive={isFocused && !buyAgain && !saleReview && !share.composer}
          saleSourceRef={feedback.sourceRef}
          registerCardSource={(mint, view) => {
            if (view) summaryCardSources.current.set(mint, view);
            else summaryCardSources.current.delete(mint);
          }}
          onToggle={(mint) =>
            setSelectedMints((previous) =>
              previous.includes(mint)
                ? previous.filter((item) => item !== mint)
                : [...previous, mint],
            )
          }
          onSell={() => {
            if (!account || !selected.length) return;
            feedback.startCapture(Number(balance.baseUnits) / 1_000_000);
            setSaleReview(selected);
          }}
          onDone={keepAndClose}
          onBuyAgain={() => account && setBuyAgain(true)}
          onDiscover={(item) =>
            navigation.navigate(Routes.COLLECTIBLES.PACK, {
              packCode: item.code,
            })
          }
          spent={memos.reduce((sum, item) => {
            const packOperation = operations?.[item];
            return (
              sum +
              (packOperation?.status === 'opened' ||
              packOperation?.status === 'paid'
                ? packOperation.price
                : 0)
            );
          }, 0)}
        />
      ) : (
        allOpened &&
        card && (
          <BatchCardResult
            key={card.memo ?? card.mint}
            card={card}
            index={index}
            total={cards.length}
            saleDisabled={!account || !online || checkingSales}
            saleSourceRef={feedback.sourceRef}
            cardSourceRef={currentCardSource}
            isCovered={Boolean(saleReview || buyAgain || share.composer)}
            revealed={
              skipReveal ||
              Boolean(operations?.[card.memo ?? '']?.revealed) ||
              revealedMints.includes(card.memo ?? card.mint)
            }
            onRevealed={() => {
              if (account && card.memo)
                Engine.context.CollectiblesController.markPackRevealed({
                  account,
                  memo: card.memo,
                });
              setRevealedMints((previous) => [
                ...previous,
                card.memo ?? card.mint,
              ]);
            }}
            onNext={() => {
              if (account && card.memo)
                Engine.context.CollectiblesController.markPackRevealed({
                  account,
                  memo: card.memo,
                  completed: true,
                });
              if (cards.length === 1) keepAndClose();
              else if (index + 1 < cards.length) setIndex(index + 1);
              else setSummary(true);
            }}
            onSell={() => {
              if (!account) return;
              feedback.startCapture(Number(balance.baseUnits) / 1_000_000);
              setSaleReview([card]);
            }}
          />
        )
      )}
      {singleSale && (
        <BuybackConfirmation
          card={singleSale}
          amount={getSaleAmount(singleSale) ?? '0'}
          isSelling={busy}
          isDisabled={!account || !online}
          onConfirm={confirmSale}
          onClose={() => setSaleReview(undefined)}
          confirmTestID="collectibles-batch-confirm-sale"
        />
      )}
      {share.composer}
      {feedback.flight && account && (
        <ReplitBuybackCelebration
          {...feedback.flight}
          onComplete={feedback.finish}
          isActive={isFocused}
        />
      )}
      {buyAgain && pack && account && (
        <PackPurchaseSheet
          pack={pack}
          account={account}
          balance={balance.baseUnits}
          initialOptions={{ quantity, turbo: operation?.turbo ?? false }}
          onClose={() => setBuyAgain(false)}
          onPurchased={replace}
        />
      )}
    </SafeAreaView>
  );
}
