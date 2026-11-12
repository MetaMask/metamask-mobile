import { useCollectiblesShare } from '../../hooks/useCollectiblesShare';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, Share, View, useWindowDimensions } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  type RouteProp,
  useNavigation,
  useRoute,
  useIsFocused,
} from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { EXTERNAL_LINK_TYPE } from '../../../../../constants/browser';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { CollectiblesCardViewTestIds } from '../../Collectibles.testIds';
import BuybackOffer, {
  BuybackConfirmation,
} from '../../components/BuybackOffer';
import CardDisplay from '../../components/CardDisplay';
import CardInformation from '../../components/CardDisplay/CardInformation';
import CardActionSheet from '../../components/CardDisplay/CardActionSheet';
import OwnedCardState from '../../components/CardDisplay/OwnedCardState';
import { getCardTitle } from '../../components/CardDisplay/cardLabels';
import { showErrorToast } from '../../hooks/toasts';
import { useCollectiblesPresentation } from '../../hooks/useCollectiblesPresentation';
import CollectiblesRevealContent from '../CollectiblesReveal/CollectiblesRevealContent';
import { CARD_ASPECT_RATIO } from '../../components/CardImage';
import CtaButton from '../../components/CtaButton';
import ReplitSaleWallet from '../../components/CollectiblesMotion/ReplitSaleWallet';
import ReplitBuybackCelebration from '../../components/CollectiblesMotion/ReplitBuybackCelebration';
import { useReplitBuybackFeedback } from '../../components/CollectiblesMotion/useReplitBuybackFeedback';
import { getPackPartnerCardUrl } from '../../providers/pack-partner/constants';
import { usePackPartnerAccount } from '../../providers/pack-partner/hooks/usePackPartnerAccount';
import {
  getBuybackDisplay,
  useBuybackOffer,
} from '../../providers/pack-partner/hooks/useBuybackOffer';
import { useSellCard } from '../../providers/pack-partner/hooks/useSellCard';
import { useUsdcBalance } from '../../providers/pack-partner/hooks/useUsdcBalance';
import { usePackPartnerCard } from '../../providers/pack-partner/hooks/usePackPartnerCards';
import type { CollectiblesCard } from '../../types';
import type { CollectiblesStackParamList } from '../../types/navigation';
import { formatUsdcAmount } from '../../providers/pack-partner/utils/format';

/** Card detail: card info, buyback offer, sell and Pack Partner link. */
const CollectiblesCardContent = ({
  account,
  mint,
}: {
  account: ReturnType<typeof usePackPartnerAccount>;
  mint: string;
}) => {
  const tw = useTailwind();
  const share = useCollectiblesShare();
  const feedback = useReplitBuybackFeedback();
  const isFocused = useIsFocused();
  const { online } = useCollectiblesPresentation();
  const [isConfirmingSale, setIsConfirmingSale] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const imageMaxWidth = Math.min(
    width * 0.8,
    Math.max(
      130,
      (height - insets.top - insets.bottom - 300) * CARD_ASPECT_RATIO,
    ),
  );
  const navigation = useNavigation<AppNavigationProp>();
  const {
    card: liveCard,
    isLoading: isLoadingCard,
    error: cardError,
    refetch: refetchCards,
  } = usePackPartnerCard(mint);
  // Keep the reviewed offer stable, then retain the confirmed sold result.
  const [frozenCard, setFrozenCard] = useState<CollectiblesCard>();
  const sourceCard = frozenCard ?? liveCard;
  const { sellCard, isSelling } = useSellCard(account);
  const { refresh: refreshBalance, baseUnits: usdcBalance } = useUsdcBalance();
  const isSaleCompleted = sourceCard?.sale?.status === 'completed';
  const isSalePending = sourceCard?.sale?.status === 'pending';
  const { offer, hasFailed, isChecking, retry } = useBuybackOffer({
    account,
    mint: sourceCard?.mint,
    enabled: Boolean(sourceCard) && !isSaleCompleted,
    isSalePending,
  });
  // Detail owns one offer read; apply it to metadata as well as the sale CTA.
  const card = useMemo(
    () =>
      sourceCard && !frozenCard && offer
        ? { ...sourceCard, buyback: offer }
        : sourceCard,
    [sourceCard, frozenCard, offer],
  );
  // A reviewed offer stays frozen while the sale runs.
  const buyback = getBuybackDisplay(frozenCard ? card?.buyback : offer, {
    hasFailed,
    isChecking: isChecking && !frozenCard,
    isSalePending,
  });

  const offerAmount =
    buyback.status === 'available' ? buyback.amount : undefined;

  useEffect(() => {
    // A status check can finish a previous sale without running handleSell.
    // Update only the focused result, without navigating another screen away.
    if (isSaleCompleted && !frozenCard && isFocused) {
      refreshBalance().catch(() => undefined);
      setFrozenCard(liveCard);
    }
  }, [isSaleCompleted, frozenCard, isFocused, refreshBalance, liveCard]);

  const handleSell = useCallback(async () => {
    if (!card || !offerAmount || !online) {
      return;
    }
    setFrozenCard({
      ...card,
      buyback: { status: 'available', amount: offerAmount },
    });
    // The provider rejects the sale when the offer dropped below this amount.
    const result = await sellCard(card.mint, offerAmount, card.nftStandard);
    if (!result) {
      // Unfreeze so a changed offer refreshed by the provider is displayed.
      setFrozenCard(undefined);
      setIsConfirmingSale(false);
      return;
    }
    setFrozenCard({
      ...card,
      sale: {
        status: 'completed',
        amount: result.amount,
        signature: result.signature,
        updatedAt: Date.now(),
      },
    });
    setIsConfirmingSale(false);
    feedback.complete();
    refreshBalance().catch(() => undefined);
  }, [card, offerAmount, sellCard, feedback, refreshBalance, online]);

  const handleOpenPackPartner = useCallback(() => {
    const url = getPackPartnerCardUrl(mint);
    if (!url) {
      showErrorToast(strings('collectibles.errors.configuration_error'));
      return;
    }
    navigation.navigate(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params: {
        newTabUrl: url,
        linkType: EXTERNAL_LINK_TYPE,
        timestamp: Date.now(),
      },
    });
  }, [navigation, mint]);

  const handleShare = () => {
    if (card) return share.open([card]);
  };

  const handleShareExternally = async () => {
    if (!card) return;
    try {
      const url = getPackPartnerCardUrl(card.mint);
      await Share.share({
        message: [getCardTitle(card), url].filter(Boolean).join('\n'),
      });
    } catch {
      showErrorToast(strings('collectibles.card.share_error'));
    }
  };

  const handleReplay = () => {
    if (card)
      navigation.navigate(Routes.COLLECTIBLES.REVEAL, {
        previewMint: card.mint,
      });
  };

  return (
    <SafeAreaView
      ref={feedback.rootRef}
      edges={['left', 'right']}
      style={tw.style('flex-1 bg-default')}
      testID={CollectiblesCardViewTestIds.CONTAINER}
    >
      <HeaderStandard
        includesTopInset
        endAccessory={
          feedback.walletVisible ? (
            <ReplitSaleWallet
              value={usdcBalance}
              from={feedback.previousBalance}
              targetRef={feedback.targetRef}
              onLayout={feedback.onTargetLayout}
              isActive={isFocused}
            />
          ) : undefined
        }
        onBack={() => navigation.goBack()}
        endButtonIconProps={
          card && card.sale?.status !== 'completed'
            ? [
                {
                  iconName: IconName.Share,
                  accessibilityLabel: strings(
                    'collectibles_discovery.share_externally',
                  ),
                  onPress: handleShareExternally,
                  testID: 'collectibles-card-share-externally',
                },
                {
                  iconName: IconName.Edit,
                  accessibilityLabel: strings(
                    'collectibles_discovery.create_post',
                  ),
                  onPress: handleShare,
                  testID: CollectiblesCardViewTestIds.SHARE_BUTTON,
                },
                {
                  iconName: IconName.MoreHorizontal,
                  accessibilityLabel: strings(
                    'collectibles_discovery.card_actions',
                  ),
                  onPress: () => setShowActions(true),
                  testID: 'collectibles-card-more',
                },
              ]
            : undefined
        }
        backButtonProps={{
          testID: CollectiblesCardViewTestIds.BACK_BUTTON,
          accessibilityLabel: strings('navigation.back'),
        }}
      />
      {card?.sale?.status === 'completed' ? (
        <CollectiblesRevealContent
          card={card}
          isActive={isFocused}
          isRevealed
          initiallyRevealed
          onRevealed={() => undefined}
          footer={
            <CtaButton
              label={strings('collectibles.reveal.close')}
              onPress={() => navigation.goBack()}
            />
          }
        />
      ) : card ? (
        <>
          {isConfirmingSale && offerAmount && (
            <BuybackConfirmation
              card={card}
              amount={offerAmount}
              isSelling={isSelling}
              isDisabled={!online}
              onConfirm={handleSell}
              onClose={() => setIsConfirmingSale(false)}
            />
          )}
          <ScrollView
            style={tw.style('flex-1')}
            contentContainerStyle={tw.style(
              'items-center gap-6 px-4 pb-4 pt-2',
            )}
            showsVerticalScrollIndicator={false}
          >
            <CardDisplay
              card={card}
              isActive={
                isFocused &&
                !isConfirmingSale &&
                !showActions &&
                !share.composer
              }
              imageMaxWidth={imageMaxWidth}
              owner={account?.address}
            />
            <Box twClassName="w-full border-t border-muted pt-6">
              <CardInformation card={card} owner={account?.address} inline />
            </Box>
            {buyback.status !== 'available' && (
              <BuybackOffer
                display={buyback}
                onRetry={retry}
                isRetrying={isChecking}
              />
            )}
          </ScrollView>
          <SafeAreaView
            edges={{ bottom: 'maximum' }}
            style={tw.style(
              'flex-row gap-3 border-t border-muted bg-default px-4 pt-2 pb-4',
            )}
          >
            {buyback.status === 'available' && !isSaleCompleted && (
              <View
                ref={feedback.sourceRef}
                collapsable={false}
                style={tw.style('flex-1')}
              >
                <Button
                  variant={ButtonVariant.Primary}
                  size={ButtonSize.Lg}
                  twClassName="flex-1"
                  isLoading={isSelling}
                  isDisabled={!online}
                  loadingText={strings('collectibles.reveal.selling')}
                  onPress={() => {
                    feedback.startCapture(Number(usdcBalance) / 1_000_000);
                    setIsConfirmingSale(true);
                  }}
                  testID={CollectiblesCardViewTestIds.SELL_BUTTON}
                >
                  {strings('collectibles_discovery.buyback_for', {
                    amount: formatUsdcAmount(buyback.amount),
                  })}
                </Button>
              </View>
            )}
            <Button
              variant={
                buyback.status === 'available'
                  ? ButtonVariant.Secondary
                  : ButtonVariant.Primary
              }
              size={ButtonSize.Lg}
              startIconName={IconName.Refresh}
              onPress={handleReplay}
              isDisabled={isSelling}
              twClassName="flex-1"
              testID={CollectiblesCardViewTestIds.REPLAY_BUTTON}
            >
              {strings('collectibles.card.replay_reveal')}
            </Button>
          </SafeAreaView>
        </>
      ) : (
        <OwnedCardState
          isLoading={isLoadingCard}
          error={cardError}
          onRetry={() => {
            refetchCards().catch(() => undefined);
          }}
        />
      )}
      {showActions && card && (
        <CardActionSheet
          owned={card.sale?.status !== 'completed'}
          canOpenPartner={Boolean(getPackPartnerCardUrl(card.mint))}
          onClose={() => setShowActions(false)}
          onSelect={(action) => {
            if (action === 'redeem' || action === 'marketplace') {
              handleOpenPackPartner();
            }
          }}
        />
      )}
      {share.composer}
      {feedback.flight && (
        <ReplitBuybackCelebration
          {...feedback.flight}
          onComplete={feedback.finish}
          isActive={isFocused}
        />
      )}
    </SafeAreaView>
  );
};

/** A reviewed card/offer must never survive a switch to another account. */
const CollectiblesCardView = () => {
  const account = usePackPartnerAccount();
  const {
    params: { mint },
  } = useRoute<RouteProp<CollectiblesStackParamList, 'CollectiblesCard'>>();
  return (
    <CollectiblesCardContent
      key={`${account?.id ?? ''}:${account?.address ?? ''}:${mint}`}
      account={account}
      mint={mint}
    />
  );
};

export default CollectiblesCardView;
