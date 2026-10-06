import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { BackHandler, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  type RouteProp,
  StackActions,
  useNavigation,
  useRoute,
  useIsFocused,
} from '@react-navigation/native';
import {
  BannerAlert,
  BannerAlertSeverity,
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
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
import { GachaRevealTestIds } from '../../Gacha.testIds';
import BuybackOffer from '../../components/BuybackOffer';
import CardBackdrop from '../../components/CardBackdrop';
import { CARD_ASPECT_RATIO } from '../../components/CardImage';
import CtaButton from '../../components/CtaButton';
import FundingSheet from '../../components/FundingSheet';
import PackPurchaseSheet from '../../components/PackPurchaseSheet';
import { showErrorToast } from '../../hooks/toasts';
import { isGachaDevEnabled } from '../../dev/revealDemo';
import { canAffordPack, formatPackPrice } from '../../components/PackCard';
import GachaDemoReveal from './GachaDemoReveal';
import GachaRevealContent from './GachaRevealContent';
import { useCollectorCryptAccount } from '../../providers/collector-crypt/hooks/useCollectorCryptAccount';
import { useCollectorCryptOperation } from '../../providers/collector-crypt/hooks/useCollectorCryptOperation';
import { useCollectorCryptPacks } from '../../providers/collector-crypt/hooks/useCollectorCryptPacks';
import { usePackFunding } from '../../providers/collector-crypt/hooks/usePackFunding';
import {
  getBuybackDisplay,
  useRefreshBuyback,
} from '../../providers/collector-crypt/hooks/useRefreshBuyback';
import { useSellCard } from '../../providers/collector-crypt/hooks/useSellCard';
import { useUsdcBalance } from '../../providers/collector-crypt/hooks/useUsdcBalance';
import { toErrorState } from '../../providers/collector-crypt/services/errors';
import type {
  CollectorCryptCard,
  CollectorCryptErrorState,
  PackOperation,
} from '../../providers/collector-crypt/types';
import type { GachaHomeTab, GachaStackParamList } from '../../types/navigation';
import {
  getCollectorCryptErrorMessage,
  getErrorMessageFromUnknown,
} from '../../providers/collector-crypt/utils/errorMessages';
import { formatUsdcAmount } from '../../providers/collector-crypt/utils/format';
import {
  REVEAL_STAGE_LABEL_KEYS,
  type RevealStage,
  canAffordAnotherPack,
  getRevealState,
  getStartOverPack,
  shouldDismissOnClose,
} from './GachaReveal.utils';

type RevealAction = 'sellAndOpen' | 'buyAgain';

interface RevealSnapshot {
  operation: PackOperation | undefined;
  card: CollectorCryptCard | undefined;
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
    testID={GachaRevealTestIds.PROCESSING}
  >
    <Skeleton twClassName="w-3/5 rounded-2xl" style={PLACEHOLDER_STYLE} />
    <Box alignItems={BoxAlignItems.Center} gap={2} accessible={false}>
      <Spinner color={IconColor.IconDefault} />
      <Text
        variant={TextVariant.HeadingSm}
        twClassName="text-center"
        testID={GachaRevealTestIds.STAGE}
      >
        {strings(REVEAL_STAGE_LABEL_KEYS[stage])}
      </Text>
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        twClassName="text-center"
      >
        {strings('gacha.reveal.pending_hint')}
      </Text>
    </Box>
  </Box>
);

interface ErrorStateProps {
  error: CollectorCryptErrorState;
  canRetry: boolean;
  canStartOver: boolean;
  isStartingOver: boolean;
  /** Progress of a funding started from the purchase confirmation. */
  startOverLoadingText?: string;
  fundingError?: string;
  isCloseDisabled: boolean;
  onRetry: () => void;
  onStartOver: () => void;
  onDismissFundingError: () => void;
  onClose: () => void;
}

/** Warning, mapped message and the recovery actions. */
const ErrorState = ({
  error,
  canRetry,
  canStartOver,
  isStartingOver,
  startOverLoadingText,
  fundingError,
  isCloseDisabled,
  onRetry,
  onStartOver,
  onDismissFundingError,
  onClose,
}: ErrorStateProps) => (
  <Box twClassName="flex-1 px-4" testID={GachaRevealTestIds.ERROR}>
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
        {strings('gacha.errors.title')}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        twClassName="text-center"
        testID={GachaRevealTestIds.ERROR_MESSAGE}
      >
        {getCollectorCryptErrorMessage(error.code)}
      </Text>
    </Box>
    <Box gap={3} twClassName="pb-4">
      {fundingError && (
        <BannerAlert
          severity={BannerAlertSeverity.Warning}
          description={fundingError}
          onClose={onDismissFundingError}
          testID={GachaRevealTestIds.FUNDING_ERROR}
        />
      )}
      {canRetry && (
        <CtaButton
          label={strings('gacha.errors.retry')}
          onPress={onRetry}
          testID={GachaRevealTestIds.RETRY_BUTTON}
        />
      )}
      {canStartOver && (
        <CtaButton
          label={strings('gacha.errors.start_over')}
          isLoading={isStartingOver}
          loadingText={startOverLoadingText}
          onPress={onStartOver}
          testID={GachaRevealTestIds.START_OVER_BUTTON}
        />
      )}
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        isFullWidth
        isDisabled={isCloseDisabled}
        onPress={onClose}
        testID={GachaRevealTestIds.ERROR_CLOSE_BUTTON}
      >
        {strings('gacha.reveal.close')}
      </Button>
    </Box>
  </Box>
);

/**
 * Pack reveal (full-screen modal). Runs `completePack` once on mount, shows
 * the purchase progress, the error recovery, or the card with its actions.
 */
const PurchasedPackReveal = ({ memo }: { memo: string }) => {
  const tw = useTailwind();
  const isFocused = useIsFocused();
  const navigation = useNavigation<AppStackNavigationProp>();
  const account = useCollectorCryptAccount();
  const { operation: liveOperation, card: liveCard } =
    useCollectorCryptOperation(account?.address, memo);
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
  const [localError, setLocalError] = useState<CollectorCryptErrorState>();
  const [activeAction, setActiveAction] = useState<RevealAction>();
  const [isConfirmingStartOver, setIsConfirmingStartOver] = useState(false);
  const [hasRevealed, setHasRevealed] = useState(false);
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
      await Engine.context.GachaController.completePack({
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
  const {
    hasFailed: hasBuybackFailed,
    isChecking,
    retry,
  } = useRefreshBuyback({
    account,
    mint: revealedCard?.mint,
    shouldRefresh:
      Boolean(revealedCard) &&
      !isProcessing &&
      !isSaleCompleted &&
      (isSalePending || revealedCard?.buyback.status === 'unknown'),
  });
  const buyback = getBuybackDisplay(revealedCard?.buyback, {
    hasFailed: hasBuybackFailed,
    isChecking,
    isSalePending,
  });
  const offerAmount =
    buyback.status === 'available' ? buyback.amount : undefined;

  // Start over buys the pack at its current catalogue price, never the old one.
  const isExpired = revealState.kind === 'error' && revealState.canStartOver;
  const { packs, isLoading: isLoadingPacks } = useCollectorCryptPacks({
    enabled: isExpired,
  });
  const startOverPack = getStartOverPack(
    packs,
    isExpired ? operation : undefined,
  );

  const goHome = useCallback(
    (initialTab?: GachaHomeTab) =>
      navigation.popTo(
        Routes.GACHA.HOME,
        initialTab ? { initialTab } : undefined,
      ),
    [navigation],
  );

  const dismissOperation = useCallback(() => {
    if (account) {
      Engine.context.GachaController.dismissOperation({
        account,
        memo,
      });
    }
  }, [account, memo]);

  /** Freezes the screen, acknowledges the operation if terminal, goes home. */
  const leave = useCallback(
    (initialTab?: GachaHomeTab) => {
      setSnapshot(live);
      if (shouldDismissOnClose(live.operation)) {
        dismissOperation();
      }
      goHome(initialTab);
    },
    [live, dismissOperation, goHome],
  );

  useEffect(() => {
    // A retry can confirm a previous sale; active sale actions navigate themselves.
    if (isSaleCompleted && !activeAction && !snapshot) {
      refreshBalance().catch(() => undefined);
      leave('cards');
    }
  }, [isSaleCompleted, activeAction, snapshot, refreshBalance, leave]);

  const handleClose = useCallback(() => leave('packs'), [leave]);

  const buyAgain = useCallback(async (): Promise<string> => {
    if (!account || !operation) {
      throw new Error('CollectorCrypt: no operation to buy again');
    }
    return Engine.context.GachaController.generatePack({
      account,
      pack: {
        code: operation.packCode,
        name: operation.packName,
        price: operation.price,
      },
    });
  }, [account, operation]);

  const replaceWith = useCallback(
    (nextMemo: string) => {
      setSnapshot(live);
      dismissOperation();
      navigation.dispatch(
        StackActions.replace(Routes.GACHA.REVEAL, { memo: nextMemo }),
      );
    },
    [live, dismissOperation, navigation],
  );

  // Fund and open from the Start over confirmation, as on Packs.
  const funding = usePackFunding({
    account,
    balance,
    isFocused,
    onPurchased: replaceWith,
  });

  const handleSellAndOpen = useCallback(async () => {
    if (!revealedCard || !offerAmount || actionInFlight.current) {
      return;
    }
    actionInFlight.current = true;
    setActiveAction('sellAndOpen');
    setSnapshot(live);
    // The provider rejects the sale when the offer dropped below this amount.
    const result = await sellCard(revealedCard.mint, offerAmount);
    if (!result) {
      // Unfreeze so a changed offer refreshed by the provider is displayed.
      actionInFlight.current = false;
      setSnapshot(undefined);
      setActiveAction(undefined);
      return;
    }
    try {
      replaceWith(await buyAgain());
    } catch (error) {
      actionInFlight.current = false;
      showErrorToast(
        strings('gacha.toast.open_failed'),
        getErrorMessageFromUnknown(error),
      );
      dismissOperation();
      goHome('packs');
    }
  }, [
    revealedCard,
    offerAmount,
    live,
    sellCard,
    replaceWith,
    buyAgain,
    dismissOperation,
    goHome,
  ]);

  const handleBuyAgain = useCallback(async () => {
    if (actionInFlight.current) return;
    actionInFlight.current = true;
    setActiveAction('buyAgain');
    try {
      replaceWith(await buyAgain());
    } catch (error) {
      actionInFlight.current = false;
      showErrorToast(
        strings('gacha.toast.open_failed'),
        getErrorMessageFromUnknown(error),
      );
      setActiveAction(undefined);
    }
  }, [buyAgain, replaceWith]);

  // Same confirmation as a purchase from Packs: price, odds and balance check.
  const handleStartOver = useCallback(() => setIsConfirmingStartOver(true), []);
  const handleCloseStartOver = useCallback(
    () => setIsConfirmingStartOver(false),
    [],
  );

  const handleRetry = useCallback(() => {
    complete();
  }, [complete]);

  const isPurchasing = funding.phase === 'purchasing';
  const isBusy = activeAction !== undefined || isPurchasing;

  const canSellAndOpen =
    offerAmount !== undefined &&
    operation !== undefined &&
    canAffordAnotherPack({
      balance: balance.baseUnits,
      refund: offerAmount,
      price: operation.price,
    });

  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={tw.style('flex-1 bg-default')}
      testID={GachaRevealTestIds.CONTAINER}
    >
      {revealState.kind === 'revealed' && <CardBackdrop variant="reveal" />}
      <HeaderStandard
        includesTopInset
        onClose={handleClose}
        closeButtonProps={{
          testID: GachaRevealTestIds.CLOSE_BUTTON,
          isDisabled: isBusy,
        }}
      />
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
          isStartingOver={isLoadingPacks || funding.isBusy}
          startOverLoadingText={
            funding.phase && funding.phase !== 'editing'
              ? strings(`gacha.funding.${funding.phase}`)
              : undefined
          }
          fundingError={funding.error}
          isCloseDisabled={isPurchasing}
          onRetry={handleRetry}
          onStartOver={handleStartOver}
          onDismissFundingError={funding.dismissError}
          onClose={handleClose}
        />
      )}
      {revealState.kind === 'revealed' && operation && (
        <GachaRevealContent
          card={revealState.card}
          packCode={operation.packCode}
          packName={operation.packName}
          isActive={isFocused}
          isRevealed={hasRevealed}
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
                <CtaButton
                  label={strings('gacha.reveal.sell_and_open_amount', {
                    amount: formatUsdcAmount(offerAmount),
                  })}
                  loadingText={strings('gacha.reveal.selling')}
                  isLoading={activeAction === 'sellAndOpen'}
                  isDisabled={isBusy || !canSellAndOpen || !hasRevealed}
                  onPress={handleSellAndOpen}
                  testID={GachaRevealTestIds.SELL_AND_OPEN_BUTTON}
                />
              )}
              <Button
                variant={
                  offerAmount !== undefined
                    ? ButtonVariant.Secondary
                    : ButtonVariant.Primary
                }
                size={ButtonSize.Lg}
                isFullWidth
                isLoading={activeAction === 'buyAgain'}
                isDisabled={
                  isBusy ||
                  !hasRevealed ||
                  !canAffordPack(balance.baseUnits, operation.price)
                }
                onPress={handleBuyAgain}
                testID={GachaRevealTestIds.BUY_AGAIN_BUTTON}
              >
                {strings('gacha.reveal.buy_again', {
                  amount: formatPackPrice(operation.price),
                })}
              </Button>
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
          onFundAndOpen={funding.open}
        />
      )}
      {funding.quickBuy && (
        <FundingSheet
          options={funding.quickBuy}
          onClose={funding.closeQuickBuy}
        />
      )}
    </SafeAreaView>
  );
};

/** A preview route cannot mount the controller-driven purchase screen. */
const GachaReveal = () => {
  const { params } = useRoute<RouteProp<GachaStackParamList, 'GachaReveal'>>();
  const navigation = useNavigation<AppStackNavigationProp>();
  const unavailableDemo = params.demo === true && !isGachaDevEnabled();
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
    if (unavailableDemo) {
      navigation.popTo(Routes.GACHA.HOME, { initialTab: 'packs' });
    }
  }, [unavailableDemo, navigation]);

  if (unavailableDemo) return null;

  return (
    <ThemeContext.Provider value={REVEAL_THEME}>
      <ThemeProvider theme={Theme.Dark}>
        <StatusBar barStyle="light-content" />
        {params.demo ? (
          <GachaDemoReveal />
        ) : (
          <PurchasedPackReveal key={params.memo} memo={params.memo} />
        )}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};

export default GachaReveal;
