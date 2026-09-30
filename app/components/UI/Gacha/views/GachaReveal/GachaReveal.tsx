import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  type RouteProp,
  StackActions,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import {
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
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import type { AppStackNavigationProp } from '../../../../../core/NavigationService/types';
import { GachaRevealTestIds } from '../../Gacha.testIds';
import BuybackOffer from '../../components/BuybackOffer';
import CardDisplay from '../../components/CardDisplay';
import { CARD_ASPECT_RATIO } from '../../components/CardImage';
import CtaButton from '../../components/CtaButton';
import { showErrorToast } from '../../hooks/toasts';
import { useCollectorCryptAccount } from '../../providers/collector-crypt/hooks/useCollectorCryptAccount';
import { useCollectorCryptOperation } from '../../providers/collector-crypt/hooks/useCollectorCryptOperation';
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
  shouldDismissOnClose,
} from './GachaReveal.utils';

type RevealAction = 'sell' | 'sellAndOpen' | 'keep' | 'startOver';

interface RevealSnapshot {
  operation: PackOperation | undefined;
  card: CollectorCryptCard | undefined;
}

const PLACEHOLDER_STYLE = { aspectRatio: CARD_ASPECT_RATIO };

/** Card-shaped placeholder and the current purchase stage. */
const ProcessingState = ({ stage }: { stage: RevealStage }) => {
  const tw = useTailwind();
  return (
    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      gap={6}
      twClassName="flex-1 px-8"
      testID={GachaRevealTestIds.PROCESSING}
    >
      <Box twClassName="w-3/5">
        <Skeleton twClassName="w-full rounded-2xl" style={PLACEHOLDER_STYLE} />
      </Box>
      <Box alignItems={BoxAlignItems.Center} gap={2}>
        <ActivityIndicator color={tw.color('icon-default')} />
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
};

interface ErrorStateProps {
  error: CollectorCryptErrorState;
  canRetry: boolean;
  canStartOver: boolean;
  isStartingOver: boolean;
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
  onRetry,
  onStartOver,
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
          onPress={onStartOver}
          testID={GachaRevealTestIds.START_OVER_BUTTON}
        />
      )}
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        isFullWidth
        isDisabled={isStartingOver}
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
const GachaReveal = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppStackNavigationProp>();
  const {
    params: { memo },
  } = useRoute<RouteProp<GachaStackParamList, 'GachaReveal'>>();
  const account = useCollectorCryptAccount();
  const live = useCollectorCryptOperation(account?.address, memo);
  // Frozen while leaving so dismissing the operation does not flash a state.
  const [snapshot, setSnapshot] = useState<RevealSnapshot>();
  const { operation, card } = snapshot ?? live;
  const balance = useUsdcBalance();
  const { sellCard } = useSellCard(account);
  const [isCompleting, setIsCompleting] = useState(true);
  const [localError, setLocalError] = useState<CollectorCryptErrorState>();
  const [activeAction, setActiveAction] = useState<RevealAction>();
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

  const status = live.operation?.status;
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

  const handleKeep = useCallback(() => {
    setActiveAction('keep');
    leave('cards');
  }, [leave]);

  const handleClose = useCallback(() => {
    leave(revealState.kind === 'revealed' ? 'cards' : undefined);
  }, [leave, revealState.kind]);

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
      dismissOperation();
      navigation.dispatch(
        StackActions.replace(Routes.GACHA.REVEAL, { memo: nextMemo }),
      );
    },
    [dismissOperation, navigation],
  );

  const handleSell = useCallback(async () => {
    if (!revealedCard) {
      return;
    }
    setActiveAction('sell');
    setSnapshot(live);
    const result = await sellCard(revealedCard.mint);
    if (!result) {
      setSnapshot(undefined);
      setActiveAction(undefined);
      return;
    }
    dismissOperation();
    goHome('cards');
  }, [revealedCard, live, sellCard, dismissOperation, goHome]);

  const handleSellAndOpen = useCallback(async () => {
    if (!revealedCard) {
      return;
    }
    setActiveAction('sellAndOpen');
    setSnapshot(live);
    const result = await sellCard(revealedCard.mint);
    if (!result) {
      setSnapshot(undefined);
      setActiveAction(undefined);
      return;
    }
    try {
      replaceWith(await buyAgain());
    } catch (error) {
      showErrorToast(
        strings('gacha.toast.open_failed'),
        getErrorMessageFromUnknown(error),
      );
      dismissOperation();
      goHome('packs');
    }
  }, [
    revealedCard,
    live,
    sellCard,
    replaceWith,
    buyAgain,
    dismissOperation,
    goHome,
  ]);

  const handleStartOver = useCallback(async () => {
    setActiveAction('startOver');
    try {
      const nextMemo = await buyAgain();
      setSnapshot(live);
      replaceWith(nextMemo);
    } catch (error) {
      showErrorToast(
        strings('gacha.toast.open_failed'),
        getErrorMessageFromUnknown(error),
      );
      setActiveAction(undefined);
    }
  }, [buyAgain, live, replaceWith]);

  const handleRetry = useCallback(() => {
    complete();
  }, [complete]);

  const isBusy = activeAction !== undefined;
  const canSellAndOpen =
    buyback.status === 'available' &&
    operation !== undefined &&
    canAffordAnotherPack({
      balance: balance.baseUnits,
      refund: buyback.amount,
      price: operation.price,
    });

  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={tw.style('flex-1 bg-default')}
      testID={GachaRevealTestIds.CONTAINER}
    >
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
          canStartOver={revealState.canStartOver}
          isStartingOver={activeAction === 'startOver'}
          onRetry={handleRetry}
          onStartOver={handleStartOver}
          onClose={handleClose}
        />
      )}
      {revealState.kind === 'revealed' && (
        <>
          <ScrollView
            style={tw.style('flex-1')}
            contentContainerStyle={tw.style('items-center gap-4 px-4 pb-4')}
            testID={GachaRevealTestIds.REVEALED}
          >
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {strings('gacha.reveal.you_got')}
            </Text>
            <CardDisplay card={revealState.card} />
            <BuybackOffer
              display={buyback}
              onRetry={retry}
              isRetrying={isChecking}
            />
          </ScrollView>
          <Box gap={3} twClassName="px-4 pb-4 pt-2">
            {buyback.status === 'available' && !isSaleCompleted ? (
              <>
                <CtaButton
                  label={strings('gacha.reveal.sell_for', {
                    amount: formatUsdcAmount(buyback.amount),
                  })}
                  isLoading={activeAction === 'sell'}
                  loadingText={strings('gacha.reveal.selling')}
                  isDisabled={isBusy}
                  onPress={handleSell}
                  testID={GachaRevealTestIds.SELL_BUTTON}
                />
                <Button
                  variant={ButtonVariant.Secondary}
                  size={ButtonSize.Lg}
                  isFullWidth
                  isLoading={activeAction === 'sellAndOpen'}
                  isDisabled={isBusy || !canSellAndOpen}
                  onPress={handleSellAndOpen}
                  testID={GachaRevealTestIds.SELL_AND_OPEN_BUTTON}
                >
                  {strings('gacha.reveal.sell_and_open')}
                </Button>
                <Button
                  variant={ButtonVariant.Tertiary}
                  size={ButtonSize.Lg}
                  isFullWidth
                  isDisabled={isBusy}
                  onPress={handleKeep}
                  testID={GachaRevealTestIds.KEEP_BUTTON}
                >
                  {strings('gacha.reveal.keep')}
                </Button>
              </>
            ) : (
              <Button
                variant={ButtonVariant.Primary}
                size={ButtonSize.Lg}
                isFullWidth
                isDisabled={isBusy}
                onPress={handleKeep}
                testID={GachaRevealTestIds.KEEP_BUTTON}
              >
                {strings('gacha.reveal.keep')}
              </Button>
            )}
          </Box>
        </>
      )}
    </SafeAreaView>
  );
};

export default GachaReveal;
