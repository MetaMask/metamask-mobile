import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  type RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import {
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  TabsBar,
  type TabItem,
} from '../../../../../component-library/components-temp/Tabs';
import { GachaHomeTestIds } from '../../Gacha.testIds';
import AttentionBanner from '../../components/AttentionBanner';
import { UsdcIcon } from '../../components/UsdcAmount';
import { USDC_DECIMALS } from '../../providers/collector-crypt/constants';
import { useAttentionOperations } from '../../providers/collector-crypt/hooks/useCollectorCryptOperation';
import { useCollectorCryptCards } from '../../providers/collector-crypt/hooks/useCollectorCryptCards';
import { useUsdcBalance } from '../../providers/collector-crypt/hooks/useUsdcBalance';
import type { GachaHomeTab, GachaStackParamList } from '../../types/navigation';
import CardsTab from './CardsTab';
import PacksTab from './PacksTab';
import { HOME_TABS, shouldStayOnPacks } from './GachaHome.utils';

/** USDC balance; integer division floors the display without losing purchase precision. */
const BalanceDisplay = ({ baseUnits }: { baseUnits: bigint }) => {
  const amount = (baseUnits / 10n ** BigInt(USDC_DECIMALS)).toString();
  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      paddingHorizontal={2}
      twClassName="mr-2 h-9 max-w-28 gap-1.5 rounded-full border border-muted bg-muted"
      accessible
      accessibilityLabel={strings('gacha.usdc_amount', { amount })}
    >
      <UsdcIcon size={AvatarTokenSize.Sm} />
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        numberOfLines={1}
        twClassName="shrink"
        testID={GachaHomeTestIds.BALANCE}
      >
        {amount}
      </Text>
    </Box>
  );
};

/** Module home: balance, attention banner, Packs | My cards tabs. */
const GachaHome = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const { params } = useRoute<RouteProp<GachaStackParamList, 'GachaHome'>>();
  const cardsState = useCollectorCryptCards();
  const { account, cards, isLoading } = cardsState;
  const balance = useUsdcBalance();
  const attentionOperations = useAttentionOperations(account?.address);
  const hasCards = cards.length > 0;

  const [tab, setTab] = useState<GachaHomeTab>(params?.initialTab ?? 'packs');
  // A "cards" request (param or press) resolves to Packs once the first
  // sync is done and the account has no card.
  const [isResolvingCards, setIsResolvingCards] = useState(
    params?.initialTab === 'cards',
  );

  useEffect(() => {
    const initialTab = params?.initialTab;
    if (!initialTab) {
      return;
    }
    setTab(initialTab);
    setIsResolvingCards(initialTab === 'cards');
  }, [params]);

  useEffect(() => {
    if (!isResolvingCards || isLoading) {
      return;
    }
    setIsResolvingCards(false);
    if (!hasCards) {
      setTab('packs');
    }
  }, [isResolvingCards, isLoading, hasCards]);

  const handleTabPress = useCallback(
    (index: number) => {
      const nextTab = HOME_TABS[index] ?? 'packs';
      if (nextTab === 'cards' && shouldStayOnPacks({ hasCards, isLoading })) {
        setTab('packs');
        return;
      }
      setTab(nextTab);
      setIsResolvingCards(nextTab === 'cards' && !hasCards);
    },
    [hasCards, isLoading],
  );

  const tabs = useMemo<TabItem[]>(
    () => [
      {
        key: 'packs',
        label: strings('gacha.tabs.packs'),
        content: null,
        testID: GachaHomeTestIds.PACKS_TAB,
      },
      {
        key: 'cards',
        label: strings('gacha.tabs.cards'),
        content: null,
        testID: GachaHomeTestIds.CARDS_TAB,
      },
    ],
    [],
  );

  const openReveal = useCallback(
    (memo: string) => navigation.navigate(Routes.GACHA.REVEAL, { memo }),
    [navigation],
  );
  const openCard = useCallback(
    (mint: string) => navigation.navigate(Routes.GACHA.CARD, { mint }),
    [navigation],
  );
  const showPacks = useCallback(() => setTab('packs'), []);
  const attentionOperation = attentionOperations[0];

  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={tw.style('flex-1 bg-default')}
      testID={GachaHomeTestIds.CONTAINER}
    >
      <HeaderStandard
        includesTopInset
        title={strings('gacha.title')}
        onBack={() => navigation.goBack()}
        backButtonProps={{ testID: GachaHomeTestIds.BACK_BUTTON }}
        endAccessory={
          account ? <BalanceDisplay baseUnits={balance.baseUnits} /> : undefined
        }
      />
      {account ? (
        <>
          {attentionOperation && (
            <Box twClassName="px-4 pb-3">
              <AttentionBanner
                operation={attentionOperation}
                onView={openReveal}
              />
            </Box>
          )}
          <TabsBar
            tabs={tabs}
            activeIndex={HOME_TABS.indexOf(tab)}
            onTabPress={handleTabPress}
            testID={GachaHomeTestIds.TABS}
          />
          <Box twClassName="flex-1 pt-3">
            {tab === 'packs' ? (
              <PacksTab
                account={account}
                balance={balance.baseUnits}
                onPurchased={openReveal}
              />
            ) : (
              <CardsTab
                cardsState={cardsState}
                onCardPress={openCard}
                onOpenPack={showPacks}
              />
            )}
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
            testID={GachaHomeTestIds.NO_ACCOUNT}
          >
            {strings('gacha.no_solana_account')}
          </Text>
        </Box>
      )}
    </SafeAreaView>
  );
};

export default GachaHome;
