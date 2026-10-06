import React, { useCallback, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  type RouteProp,
  useIsFocused,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import {
  AvatarTokenSize,
  BannerAlert,
  BannerAlertSeverity,
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  ButtonBase,
  ButtonBaseSize,
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
import FundingSheet from '../../components/FundingSheet';
import AttentionBanner from '../../components/AttentionBanner';
import { UsdcIcon } from '../../components/UsdcAmount';
import { USDC_DECIMALS } from '../../providers/collector-crypt/constants';
import { useAttentionOperations } from '../../providers/collector-crypt/hooks/useCollectorCryptOperation';
import { useCollectorCryptCards } from '../../providers/collector-crypt/hooks/useCollectorCryptCards';
import { useUsdcBalance } from '../../providers/collector-crypt/hooks/useUsdcBalance';
import { usePackFunding } from '../../providers/collector-crypt/hooks/usePackFunding';
import type { GachaHomeTab, GachaStackParamList } from '../../types/navigation';
import CardsTab from './CardsTab';
import PacksTab from './PacksTab';
import { getVisibleTab } from './GachaHome.utils';
import { isGachaDevEnabled } from '../../dev/revealDemo';
import DevTab from './DevTab';

/** USDC balance; integer division floors the display without losing purchase precision. */
const BalanceDisplay = ({
  baseUnits,
  onPress,
  isDisabled,
}: {
  baseUnits: bigint;
  onPress: () => void;
  isDisabled: boolean;
}) => {
  const amount = (baseUnits / 10n ** BigInt(USDC_DECIMALS)).toString();
  return (
    <ButtonBase
      size={ButtonBaseSize.Sm}
      onPress={onPress}
      isDisabled={isDisabled}
      startAccessory={<UsdcIcon size={AvatarTokenSize.Sm} />}
      twClassName="mr-2 h-9 max-w-28 px-2 gap-1.5 rounded-full border border-muted bg-muted"
      accessibilityLabel={strings('gacha.usdc_amount', { amount })}
      accessibilityHint={strings('gacha.funding.add_funds')}
      testID={GachaHomeTestIds.FUND_BUTTON}
    >
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        numberOfLines={1}
        twClassName="shrink"
        testID={GachaHomeTestIds.BALANCE}
      >
        {amount}
      </Text>
    </ButtonBase>
  );
};

/** Module home: balance, attention banner, Packs | My cards tabs. */
const GachaHome = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const isFocused = useIsFocused();
  const { params } = useRoute<RouteProp<GachaStackParamList, 'GachaHome'>>();
  const cardsState = useCollectorCryptCards();
  const { account, cards, isLoading } = cardsState;
  const balance = useUsdcBalance();
  const attentionOperations = useAttentionOperations(account?.address);
  const hasCards = cards.length > 0;
  const devEnabled = isGachaDevEnabled();
  const initialTab =
    params?.initialTab === 'dev' && !devEnabled
      ? 'packs'
      : (params?.initialTab ?? 'packs');

  const [tab, setTab] = useState<GachaHomeTab>(initialTab);
  // New params (e.g. returning from a reveal) select their tab once.
  const [lastParams, setLastParams] = useState(params);
  if (params !== lastParams) {
    setLastParams(params);
    if (params?.initialTab) {
      setTab(initialTab);
    }
  }
  const hasSyncError = cardsState.error !== undefined;
  // Derived on every render: covers the param, a press, and the last card sold.
  const visibleTab = getVisibleTab({ tab, hasCards, isLoading, hasSyncError });

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
      ...(devEnabled
        ? [
            {
              key: 'dev',
              label: strings('gacha.tabs.dev'),
              content: null,
              testID: GachaHomeTestIds.DEV_TAB,
            },
          ]
        : []),
    ],
    [devEnabled],
  );

  const handleTabPress = useCallback(
    (index: number) => {
      const nextTab = (tabs[index]?.key ?? 'packs') as GachaHomeTab;
      // A refused press must not switch tabs later when a card shows up.
      setTab(
        getVisibleTab({ tab: nextTab, hasCards, isLoading, hasSyncError }),
      );
    },
    [hasCards, isLoading, hasSyncError, tabs],
  );

  const openReveal = useCallback(
    (memo: string) => navigation.navigate(Routes.GACHA.REVEAL, { memo }),
    [navigation],
  );
  const funding = usePackFunding({
    account,
    balance,
    isFocused,
    onPurchased: openReveal,
  });
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
          account ? (
            <BalanceDisplay
              baseUnits={balance.baseUnits}
              onPress={() => funding.open()}
              isDisabled={funding.isBusy}
            />
          ) : undefined
        }
      />
      {account ? (
        <>
          {funding.phase && funding.phase !== 'editing' && (
            <BannerAlert
              severity={BannerAlertSeverity.Info}
              title={strings(`gacha.funding.${funding.phase}`)}
              description={
                funding.pendingPack
                  ? strings('gacha.funding.auto_open', {
                      name: funding.pendingPack.name,
                    })
                  : undefined
              }
              {...(funding.canCancel
                ? {
                    actionButtonLabel: strings(
                      funding.pendingPack
                        ? 'gacha.funding.cancel_opening'
                        : 'gacha.funding.dismiss',
                    ),
                    actionButtonOnPress: funding.cancel,
                  }
                : { actionButtonOnPress: undefined })}
              twClassName="mx-4 mb-3"
              testID={GachaHomeTestIds.FUNDING_STATUS}
            />
          )}
          {funding.error && (
            <BannerAlert
              severity={BannerAlertSeverity.Warning}
              description={funding.error}
              onClose={funding.dismissError}
              twClassName="mx-4 mb-3"
              testID={GachaHomeTestIds.FUNDING_ERROR}
            />
          )}
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
            activeIndex={tabs.findIndex((item) => item.key === visibleTab)}
            onTabPress={handleTabPress}
            testID={GachaHomeTestIds.TABS}
          />
          <Box twClassName="flex-1 pt-3">
            {visibleTab === 'packs' ? (
              <PacksTab
                key={account.id}
                account={account}
                balance={balance.baseUnits}
                onPurchased={openReveal}
                onFundAndOpen={funding.open}
                isBusy={funding.isBusy}
              />
            ) : visibleTab === 'dev' ? (
              <DevTab isBusy={funding.isBusy} />
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
      {funding.quickBuy && (
        <FundingSheet
          options={funding.quickBuy}
          onClose={funding.closeQuickBuy}
        />
      )}
    </SafeAreaView>
  );
};

export default GachaHome;
