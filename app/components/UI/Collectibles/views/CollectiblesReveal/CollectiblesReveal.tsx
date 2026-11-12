import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { BackHandler, StatusBar, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  type RouteProp,
  StackActions,
  useNavigation,
  useRoute,
  useIsFocused,
} from '@react-navigation/native';
import {
  Box,
  BannerAlert,
  BannerAlertSeverity,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonIcon,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Skeleton,
  Spinner,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  Theme,
  ThemeProvider,
  useTailwind,
} from '@metamask/design-system-twrnc-preset';
import { brandColor, darkTheme } from '@metamask/design-tokens';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import type { AppStackNavigationProp } from '../../../../../core/NavigationService/types';
import { ThemeContext } from '../../../../../util/theme';
import { AppThemeKey } from '../../../../../util/theme/models';
import { CollectiblesRevealTestIds } from '../../Collectibles.testIds';
import BuybackOffer, {
  BuybackConfirmation,
} from '../../components/BuybackOffer';
import { CARD_ASPECT_RATIO } from '../../components/CardImage';
import CtaButton from '../../components/CtaButton';
import ReplitSaleWallet from '../../components/CollectiblesMotion/ReplitSaleWallet';
import ReplitBuybackCelebration from '../../components/CollectiblesMotion/ReplitBuybackCelebration';
import { useReplitBuybackFeedback } from '../../components/CollectiblesMotion/useReplitBuybackFeedback';
import {
  measureTransferSources,
  useCollectionTransfer,
} from '../../components/CollectionTransfer/CollectionTransferProvider';
import PackPurchaseSheet, {
  type PurchaseRevealOptions,
} from '../../components/PackPurchaseSheet';
import { formatPurchaseAmount } from '../../components/PackPurchaseSheet/packPurchaseAmounts';
import { useCollectiblesShare } from '../../hooks/useCollectiblesShare';
import { useCollectiblesPresentation } from '../../hooks/useCollectiblesPresentation';
import CollectiblesCardPreview from './CollectiblesCardPreview';
import CollectiblesRevealContent from './CollectiblesRevealContent';
import CollectiblesBatchReveal from './CollectiblesBatchReveal';
import { CollectiblesRevealResultTestIds } from './CollectiblesReveal.testIds';
import { usePackPartnerAccount } from '../../providers/pack-partner/hooks/usePackPartnerAccount';
import { usePackPartnerOperation } from '../../providers/pack-partner/hooks/usePackPartnerOperation';
import { usePackPartnerPacks } from '../../providers/pack-partner/hooks/usePackPartnerPacks';
import {
  getBuybackDisplay,
  useBuybackOffer,
} from '../../providers/pack-partner/hooks/useBuybackOffer';
import { useSellCard } from '../../providers/pack-partner/hooks/useSellCard';
import { useUsdcBalance } from '../../providers/pack-partner/hooks/useUsdcBalance';
import { toErrorState } from '../../providers/pack-partner/services/errors';
import type {
  CollectiblesCard,
  CollectiblesErrorState,
  CollectiblesPackOperation,
} from '../../types';
import type {
  CollectiblesHomeTab,
  CollectiblesStackParamList,
} from '../../types/navigation';
import { getPackPartnerErrorMessage } from '../../providers/pack-partner/utils/errorMessages';
import { formatUsdcAmount } from '../../providers/pack-partner/utils/format';
import {
  REVEAL_STAGE_LABEL_KEYS,
  type RevealStage,
  getRevealState,
  getStartOverPack,
  shouldDismissOnClose,
} from './CollectiblesReveal.utils';

type RevealAction = 'sell';

interface RevealSnapshot {
  operation: CollectiblesPackOperation | undefined;
  card: CollectiblesCard | undefined;
}

const PLACEHOLDER_STYLE = { aspectRatio: CARD_ASPECT_RATIO };
const REVEAL_THEME = {
  ...darkTheme,
  brandColors: brandColor,
  themeAppearance: AppThemeKey.dark,
};

/** Card-shaped placeholder and the current purchase stage. */
const ProcessingState = ({ stage }: { stage: RevealStage }) => (
  <Box
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Center}
    gap={6}
    twClassName="flex-1 px-8"
    accessible={false}
    testID={CollectiblesRevealTestIds.PROCESSING}
  >
    <Skeleton twClassName="w-3/5 rounded-2xl" style={PLACEHOLDER_STYLE} />
    <Box alignItems={BoxAlignItems.Center} gap={2} accessible={false}>
      <Spinner color={IconColor.IconDefault} />
      <Text
        variant={TextVariant.HeadingSm}
        twClassName="text-center"
        testID={CollectiblesRevealTestIds.STAGE}
      >
        {strings(REVEAL_STAGE_LABEL_KEYS[stage])}
      </Text>
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        twClassName="text-center"
      >
        {strings('collectibles.reveal.pending_hint')}
      </Text>
    </Box>
  </Box>
);

interface ErrorStateProps {
  error: CollectiblesErrorState;
  canRetry: boolean;
  canStartOver: boolean;
  isStartingOver: boolean;
  isCloseDisabled: boolean;
  onRetry: () => void;
  onStartOver: () => void;
  onClose: () => void;
}

/** Warning, mapped message and the recovery actions. */
const ErrorState = ({
  error,
  canRetry,
  canStartOver,
  isStartingOver,
  isCloseDisabled,
  onRetry,
  onStartOver,
  onClose,
}: ErrorStateProps) => (
  <Box twClassName="flex-1 px-4" testID={CollectiblesRevealTestIds.ERROR}>
    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      gap={3}
      twClassName="flex-1 px-4"
    >
      <Icon
        name={IconName.Warning}
        size={IconSize.Xl}
        color={IconColor.WarningDefault}
      />
      <Text variant={TextVariant.HeadingMd} twClassName="text-center">
        {strings('collectibles.errors.title')}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        twClassName="text-center"
        testID={CollectiblesRevealTestIds.ERROR_MESSAGE}
      >
        {getPackPartnerErrorMessage(error.code)}
      </Text>
    </Box>
    <Box gap={3} twClassName="pb-4">
      {canRetry && (
        <CtaButton
          label={strings('collectibles.errors.retry')}
          onPress={onRetry}
          testID={CollectiblesRevealTestIds.RETRY_BUTTON}
        />
      )}
      {canStartOver && (
        <CtaButton
          label={strings('collectibles.errors.start_over')}
          isLoading={isStartingOver}
          onPress={onStartOver}
          testID={CollectiblesRevealTestIds.START_OVER_BUTTON}
        />
      )}
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        isFullWidth
        isDisabled={isCloseDisabled}
        onPress={onClose}
        testID={CollectiblesRevealTestIds.ERROR_CLOSE_BUTTON}
      >
        {strings('collectibles.reveal.close')}
      </Button>
    </Box>
  </Box>
);

/**
 * Pack reveal (full-screen modal). Runs `completePack` once on mount, shows
 * the purchase progress, the error recovery, or the card with its actions.
 */
const PurchasedPackReveal = ({
  memo,
  skipReveal = false,
}: {
  memo: string;
  skipReveal?: boolean;
}) => {
  const share = useCollectiblesShare();
  const feedback = useReplitBuybackFeedback();
  const { beginTransfers } = useCollectionTransfer();
  const cardSource = useRef<View>(null);
  const keeping = useRef(false);
  const tw = useTailwind();
  const isFocused = useIsFocused();
  const navigation = useNavigation<AppStackNavigationProp>();
  const selectedAccount = usePackPartnerAccount();
  const [owner] = useState(selectedAccount);
  const account =
    owner?.id === selectedAccount?.id &&
    owner?.address === selectedAccount?.address
      ? owner
      : undefined;
  const { online } = useCollectiblesPresentation();
  const { operation: liveOperation, card: liveCard } = usePackPartnerOperation(
    owner?.address,
    memo,
  );
  // The hook returns a new object per render; keep one per operation/card.
  const live = useMemo<RevealSnapshot>(
    () => ({ operation: liveOperation, card: liveCard }),
    [liveOperation, liveCard],
  );
  // Frozen while leaving so dismissing the operation does not flash a state.
  const [snapshot, setSnapshot] = useState<RevealSnapshot>();
  const { operation, card } = snapshot ?? live;
  const balance = useUsdcBalance();
  const { sellCard } = useSellCard(account);
  const [isCompleting, setIsCompleting] = useState(true);
  const [localError, setLocalError] = useState<CollectiblesErrorState>();
  const [activeAction, setActiveAction] = useState<RevealAction>();
  const [isConfirmingStartOver, setIsConfirmingStartOver] = useState(false);
  const [isConfirmingSale, setIsConfirmingSale] = useState(false);
  const [hasRevealed, setHasRevealed] = useState(skipReveal);
  const actionInFlight = useRef(false);
  const handleRevealed = useCallback(() => setHasRevealed(true), []);
  const hasStartedRef = useRef(false);
  const hasRefreshedBalanceRef = useRef(false);
  const isProcessing = isCompleting && Boolean(account);

  const complete = useCallback(async () => {
    if (!account) {
      return;
    }
    setIsCompleting(true);
    setLocalError(undefined);
    try {
      await Engine.context.CollectiblesController.completePack({
        account,
        memo,
      });
    } catch (error) {
      // The controller also stores the error on the operation.
      setLocalError(toErrorState(error));
    } finally {
      setIsCompleting(false);
    }
  }, [account, memo]);

  useEffect(() => {
    if (!account || hasStartedRef.current) {
      return;
    }
    hasStartedRef.current = true;
    complete();
  }, [account, complete]);

  const status = liveOperation?.status;
  const { refresh: refreshBalance } = balance;
  useEffect(() => {
    if (status !== 'opened' || hasRefreshedBalanceRef.current) {
      return;
    }
    hasRefreshedBalanceRef.current = true;
    refreshBalance().catch(() => undefined);
  }, [status, refreshBalance]);

  const revealState = getRevealState({
    operation,
    card,
    isCompleting: isProcessing,
    localError,
  });
  const revealedCard =
    revealState.kind === 'revealed' ? revealState.card : undefined;
  const isSalePending = revealedCard?.sale?.status === 'pending';
  const isSaleCompleted = revealedCard?.sale?.status === 'completed';
  useEffect(() => {
    if (isSaleCompleted) refreshBalance().catch(() => undefined);
  }, [isSaleCompleted, refreshBalance]);
  const {
    offer,
    hasFailed: hasBuybackFailed,
    isChecking,
    retry,
  } = useBuybackOffer({
    account,
    mint: revealedCard?.mint,
    enabled: Boolean(revealedCard) && !isProcessing && !isSaleCompleted,
    isSalePending,
  });
  // The opening returns an offer, shown until the fresher read arrives.
  const hasOpeningOffer = revealedCard?.buyback.status === 'available';
  const buyback = getBuybackDisplay(offer ?? revealedCard?.buyback, {
    hasFailed: hasBuybackFailed && (isSalePending || !hasOpeningOffer),
    isChecking: isChecking && !hasOpeningOffer,
    isSalePending,
  });
  const offerAmount =
    buyback.status === 'available' ? buyback.amount : undefined;

  // Start over buys the pack at its current catalogue price, never the old one.
  const isExpired = revealState.kind === 'error' && revealState.canStartOver;
  const { packs, isLoading: isLoadingPacks } = usePackPartnerPacks({
    enabled: isExpired,
  });
  const startOverPack = getStartOverPack(
    packs,
    isExpired ? operation : undefined,
  );

  const goHome = useCallback(
    (initialTab?: CollectiblesHomeTab) =>
      navigation.popTo(
        Routes.COLLECTIBLES.HOME,
        initialTab ? { initialTab } : undefined,
      ),
    [navigation],
  );

  const dismissOperation = useCallback(() => {
    if (account) {
      Engine.context.CollectiblesController.dismissOperation({
        account,
        memo,
      });
    }
  }, [account, memo]);

  /** Freezes the screen, acknowledges the operation if terminal, goes home. */
  const leave = useCallback(
    (initialTab?: CollectiblesHomeTab) => {
      setSnapshot(live);
      if (shouldDismissOnClose(live.operation)) {
        dismissOperation();
      }
      goHome(initialTab);
    },
    [live, dismissOperation, goHome],
  );

  const handleClose = useCallback(() => leave('packs'), [leave]);
  const keepCard = async () => {
    if (keeping.current) return;
    if (!account || !revealedCard || isSaleCompleted) {
      leave('packs');
      return;
    }
    keeping.current = true;
    beginTransfers(
      await measureTransferSources([
        { card: revealedCard, view: cardSource.current },
      ]),
    );
    leave('cards');
  };

  const replaceWith = useCallback(
    (nextMemo: string, options?: PurchaseRevealOptions) => {
      setSnapshot(live);
      dismissOperation();
      navigation.dispatch(
        StackActions.replace(Routes.COLLECTIBLES.REVEAL, {
          memo: nextMemo,
          skipReveal: options?.skipReveal,
        }),
      );
    },
    [live, dismissOperation, navigation],
  );

  const handleSell = useCallback(async () => {
    if (
      !account ||
      !online ||
      !revealedCard ||
      !offerAmount ||
      actionInFlight.current
    )
      return;
    actionInFlight.current = true;
    setActiveAction('sell');
    const result = await sellCard(
      revealedCard.mint,
      offerAmount,
      revealedCard.nftStandard,
    );
    if (result) {
      // Retain the confirmed receipt even if the sold card leaves the owned-card index.
      setSnapshot({
        operation,
        card: {
          ...revealedCard,
          sale: {
            status: 'completed',
            amount: result.amount,
            signature: result.signature,
            updatedAt: Date.now(),
          },
        },
      });
      setIsConfirmingSale(false);
      feedback.complete();
    }
    actionInFlight.current = false;
    setActiveAction(undefined);
  }, [
    revealedCard,
    offerAmount,
    sellCard,
    operation,
    feedback,
    account,
    online,
  ]);

  // Same confirmation as a purchase from Packs: price, odds and balance check.
  const handleStartOver = useCallback(() => setIsConfirmingStartOver(true), []);
  const handleCloseStartOver = useCallback(
    () => setIsConfirmingStartOver(false),
    [],
  );

  const handleRetry = useCallback(() => {
    complete();
  }, [complete]);

  const isBusy = activeAction !== undefined;

  const isAnimating = revealState.kind === 'revealed' && !hasRevealed;

  return (
    <SafeAreaView
      ref={feedback.rootRef}
      edges={isAnimating ? ['top', 'left', 'right'] : ['left', 'right']}
      style={tw.style('flex-1 bg-default')}
      testID={CollectiblesRevealTestIds.CONTAINER}
    >
      {!isAnimating && (
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
                  onPress={handleClose}
                  isDisabled={isBusy}
                  testID={CollectiblesRevealTestIds.CLOSE_BUTTON}
                />
              </Box>
            ) : undefined
          }
          startAccessory={
            hasRevealed && revealedCard ? (
              <ButtonIcon
                iconName={IconName.Share}
                accessibilityLabel={strings('collectibles.card.share')}
                onPress={() => share.open([revealedCard])}
                isDisabled={isBusy}
              />
            ) : undefined
          }
          onClose={handleClose}
          closeButtonProps={{
            testID: CollectiblesRevealTestIds.CLOSE_BUTTON,
            isDisabled: isBusy,
          }}
        />
      )}
      {!account && (
        <BannerAlert
          severity={BannerAlertSeverity.Warning}
          description={strings('collectibles.batch.account_changed')}
        />
      )}
      {revealState.kind === 'processing' && (
        <ProcessingState stage={revealState.stage} />
      )}
      {revealState.kind === 'error' && (
        <ErrorState
          error={revealState.error}
          canRetry={revealState.canRetry}
          canStartOver={
            revealState.canStartOver &&
            (isLoadingPacks || startOverPack !== undefined)
          }
          isStartingOver={isLoadingPacks}
          isCloseDisabled={isBusy}
          onRetry={handleRetry}
          onStartOver={handleStartOver}
          onClose={handleClose}
        />
      )}
      {revealState.kind === 'revealed' && operation && (
        <CollectiblesRevealContent
          cardSourceRef={cardSource}
          card={revealState.card}
          isActive={
            isFocused &&
            !isConfirmingSale &&
            !isConfirmingStartOver &&
            !share.composer
          }
          isRevealed={hasRevealed}
          initiallyRevealed={skipReveal}
          onRevealed={handleRevealed}
          details={
            buyback.status !== 'available' ? (
              <BuybackOffer
                display={buyback}
                onRetry={retry}
                isRetrying={isChecking}
              />
            ) : undefined
          }
          footer={
            <>
              {offerAmount !== undefined && !isSaleCompleted && (
                <View ref={feedback.sourceRef} collapsable={false}>
                  <CtaButton
                    label={strings('collectibles.reveal.accept_buyback', {
                      amount: formatPurchaseAmount(BigInt(offerAmount)),
                    })}
                    isLoading={activeAction === 'sell'}
                    isDisabled={isBusy || !hasRevealed || !account || !online}
                    onPress={() => {
                      feedback.startCapture(
                        Number(balance.baseUnits) / 1_000_000,
                      );
                      setIsConfirmingSale(true);
                    }}
                    testID={CollectiblesRevealResultTestIds.SELL_BACK_BUTTON}
                  />
                </View>
              )}
              <Button
                variant={
                  isSaleCompleted || offerAmount === undefined
                    ? ButtonVariant.Primary
                    : ButtonVariant.Secondary
                }
                size={ButtonSize.Lg}
                isFullWidth
                isDisabled={isBusy || !hasRevealed}
                onPress={keepCard}
                testID={CollectiblesRevealResultTestIds.KEEP_BUTTON}
              >
                {strings(
                  isSaleCompleted
                    ? 'collectibles.reveal.done'
                    : 'collectibles.reveal.keep_card',
                )}
              </Button>
              {share.composer}
            </>
          }
        />
      )}
      {isConfirmingStartOver && startOverPack && account && (
        <PackPurchaseSheet
          pack={startOverPack}
          account={account}
          balance={balance.baseUnits}
          onClose={handleCloseStartOver}
          onPurchased={replaceWith}
        />
      )}
      {isConfirmingSale && revealedCard && offerAmount && (
        <BuybackConfirmation
          card={revealedCard}
          amount={offerAmount}
          isSelling={activeAction === 'sell'}
          isDisabled={!account || !online}
          onConfirm={handleSell}
          onClose={() => setIsConfirmingSale(false)}
        />
      )}
      {feedback.flight && account && (
        <ReplitBuybackCelebration
          {...feedback.flight}
          onComplete={feedback.finish}
          isActive={isFocused}
        />
      )}
    </SafeAreaView>
  );
};

const PurchaseReveal = ({
  memo,
  skipReveal,
}: {
  memo: string;
  skipReveal?: boolean;
}) => {
  const account = usePackPartnerAccount();
  const { operation } = usePackPartnerOperation(account?.address, memo);
  const [isBatch] = useState(Boolean(operation?.batchMemos));
  return isBatch ? (
    <CollectiblesBatchReveal memo={memo} skipReveal={skipReveal} />
  ) : (
    <PurchasedPackReveal memo={memo} skipReveal={skipReveal} />
  );
};

/** A preview route cannot mount the controller-driven purchase screen. */
const CollectiblesReveal = () => {
  const { params } =
    useRoute<RouteProp<CollectiblesStackParamList, 'CollectiblesReveal'>>();
  const navigation = useNavigation<AppStackNavigationProp>();
  const unavailableRoute = !params?.previewMint && !params?.memo;
  const isFocused = useIsFocused();

  useEffect(() => {
    if (!isFocused) return;
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => true,
    );
    return () => subscription.remove();
  }, [isFocused]);

  useEffect(() => {
    if (unavailableRoute) {
      navigation.popTo(Routes.COLLECTIBLES.HOME, { initialTab: 'packs' });
    }
  }, [unavailableRoute, navigation]);

  if (unavailableRoute) return null;

  return (
    <ThemeContext.Provider value={REVEAL_THEME}>
      <ThemeProvider theme={Theme.Dark}>
        <StatusBar barStyle="light-content" />
        {params.previewMint !== undefined ? (
          <CollectiblesCardPreview mint={params.previewMint} />
        ) : (
          <PurchaseReveal
            key={params.memo}
            memo={params.memo}
            skipReveal={params.skipReveal}
          />
        )}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};

export default CollectiblesReveal;
