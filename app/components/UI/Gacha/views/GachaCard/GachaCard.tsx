import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
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
import type { RootState } from '../../../../../reducers';
import { GachaCardViewTestIds } from '../../Gacha.testIds';
import BuybackOffer from '../../components/BuybackOffer';
import CardDisplay from '../../components/CardDisplay';
import CardBackdrop from '../../components/CardBackdrop';
import CtaButton from '../../components/CtaButton';
import { getCollectorCryptCardUrl } from '../../providers/collector-crypt/constants';
import { useCollectorCryptAccount } from '../../providers/collector-crypt/hooks/useCollectorCryptAccount';
import {
  getBuybackDisplay,
  useRefreshBuyback,
} from '../../providers/collector-crypt/hooks/useRefreshBuyback';
import { useSellCard } from '../../providers/collector-crypt/hooks/useSellCard';
import { useUsdcBalance } from '../../providers/collector-crypt/hooks/useUsdcBalance';
import { selectCollectorCryptCard } from '../../providers/collector-crypt/selectors/collectorCrypt';
import type { CollectorCryptCard } from '../../providers/collector-crypt/types';
import type { GachaStackParamList } from '../../types/navigation';
import { formatUsdcAmount } from '../../providers/collector-crypt/utils/format';

/** Card detail: card info, buyback offer, sell and Collector Crypt link. */
const GachaCardView = () => {
  const tw = useTailwind();
  const isFocused = useIsFocused();
  const navigation = useNavigation<AppNavigationProp>();
  const {
    params: { mint },
  } = useRoute<RouteProp<GachaStackParamList, 'GachaCard'>>();
  const account = useCollectorCryptAccount();
  const liveCard = useSelector((state: RootState) =>
    selectCollectorCryptCard(state, account?.address, mint),
  );
  // Keep the offer stable during a sale until navigation finishes.
  const [frozenCard, setFrozenCard] = useState<CollectorCryptCard>();
  const card = frozenCard ?? liveCard;
  const { sellCard, isSelling } = useSellCard(account);
  const { refresh: refreshBalance } = useUsdcBalance();
  const isSaleCompleted = liveCard?.sale?.status === 'completed';
  const { hasFailed, isChecking, retry } = useRefreshBuyback({
    account,
    mint: card?.mint,
    shouldRefresh: Boolean(card) && !isSaleCompleted,
  });
  const isSalePending = card?.sale?.status === 'pending';
  const buyback = getBuybackDisplay(card?.buyback, {
    hasFailed,
    isChecking,
    isSalePending,
  });

  const offerAmount =
    buyback.status === 'available' ? buyback.amount : undefined;

  useEffect(() => {
    // A status check can finish a previous sale without running handleSell.
    // Only the focused card screen may pop itself, never the screen on top.
    if (isSaleCompleted && !frozenCard && isFocused) {
      refreshBalance().catch(() => undefined);
      navigation.goBack();
    }
  }, [isSaleCompleted, frozenCard, isFocused, refreshBalance, navigation]);

  const handleSell = useCallback(async () => {
    if (!card || !offerAmount) {
      return;
    }
    setFrozenCard(card);
    // The provider rejects the sale when the offer dropped below this amount.
    const result = await sellCard(card.mint, offerAmount);
    if (!result) {
      // Unfreeze so a changed offer refreshed by the provider is displayed.
      setFrozenCard(undefined);
      return;
    }
    // The user may have left during the sale: never pop another screen.
    if (navigation.isFocused()) {
      navigation.goBack();
    }
  }, [card, offerAmount, sellCard, navigation]);

  const handleOpenCollectorCrypt = useCallback(() => {
    navigation.navigate(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params: {
        newTabUrl: getCollectorCryptCardUrl(mint),
        linkType: EXTERNAL_LINK_TYPE,
        timestamp: Date.now(),
      },
    });
  }, [navigation, mint]);

  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={tw.style('flex-1 bg-default')}
      testID={GachaCardViewTestIds.CONTAINER}
    >
      <CardBackdrop />
      <HeaderStandard
        includesTopInset
        title={strings('gacha.card.title')}
        onBack={() => navigation.goBack()}
        backButtonProps={{ testID: GachaCardViewTestIds.BACK_BUTTON }}
      />
      {card ? (
        <>
          <ScrollView
            style={tw.style('flex-1')}
            contentContainerStyle={tw.style(
              'items-center gap-4 px-4 pb-6 pt-4',
            )}
            showsVerticalScrollIndicator={false}
          >
            <CardDisplay
              card={card}
              isActive={isFocused}
              owner={account?.address}
            />
            <BuybackOffer
              display={buyback}
              onRetry={retry}
              isRetrying={isChecking}
            />
          </ScrollView>
          <Box
            gap={3}
            paddingHorizontal={4}
            paddingVertical={4}
            twClassName="border-t border-muted"
          >
            {buyback.status === 'available' && !isSaleCompleted && (
              <CtaButton
                label={strings('gacha.card.sell_for', {
                  amount: formatUsdcAmount(buyback.amount),
                })}
                isLoading={isSelling}
                loadingText={strings('gacha.reveal.selling')}
                onPress={handleSell}
                testID={GachaCardViewTestIds.SELL_BUTTON}
              />
            )}
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              isFullWidth
              endIconName={IconName.Export}
              isDisabled={isSelling}
              onPress={handleOpenCollectorCrypt}
              testID={GachaCardViewTestIds.VIEW_ON_CC_BUTTON}
            >
              {strings('gacha.card.view_on_collector_crypt')}
            </Button>
          </Box>
        </>
      ) : (
        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="flex-1 px-8"
        >
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="text-center"
            testID={GachaCardViewTestIds.NOT_FOUND}
          >
            {strings('gacha.card.not_found')}
          </Text>
        </Box>
      )}
    </SafeAreaView>
  );
};

export default GachaCardView;
