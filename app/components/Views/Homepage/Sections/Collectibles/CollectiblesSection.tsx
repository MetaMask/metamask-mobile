import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ScrollView, type View } from 'react-native';
import { useSelector } from 'react-redux';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxFlexDirection,
  ButtonBase,
  FontWeight,
  Icon,
  IconName,
  IconColor,
  IconSize,
  Text,
  TextColor,
  TextVariant,
  SectionDivider,
  SectionHeader,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import SectionRow from '../../components/SectionRow';
import ErrorState from '../../components/ErrorState';
import { SectionRefreshHandle } from '../../types';
import useHomeViewedEvent, {
  HomeSectionNames,
} from '../../hooks/useHomeViewedEvent';
import { useSectionPerformance } from '../../hooks/useSectionPerformance';
import { homepageSectionTitleTestId } from '../../Homepage.testIds';
import CardTileSkeleton from '../../../../UI/Collectibles/components/CardTile/CardTileSkeleton';
import PackList from '../../../../UI/Collectibles/components/PackList/PackList';
import PackPurchaseSheet from '../../../../UI/Collectibles/components/PackPurchaseSheet';
import { useUsdcBalance } from '../../../../UI/Collectibles/providers/pack-partner/hooks/useUsdcBalance';
import { usePackPartnerPacks } from '../../../../UI/Collectibles/providers/pack-partner/hooks/usePackPartnerPacks';
import { getPopularPacks } from '../../../../UI/Collectibles/views/CollectiblesHome/CollectiblesHome.utils';
import {
  usePackInsights,
  usePackSocialContext,
} from '../../../../UI/Collectibles/hooks/useCollectiblesDiscovery';
import PackSocialSummary from '../../../../UI/Collectibles/components/CollectiblesDiscovery/PackSocialSummary';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  CardTile,
  selectCollectiblesEnabledFlag,
  selectCollectiblesHasCompletedOnboarding,
} from '../../../../UI/Collectibles';
import type {
  CollectiblesPack,
  CollectiblesWalletAccount,
} from '../../../../UI/Collectibles/types';
import type {
  CollectiblesCardParams,
  CollectiblesHomeParams,
  CollectiblesEntryDestination,
} from '../../../../UI/Collectibles/types/navigation';
import { useCollectiblesCardsForHomepage } from './hooks';
import { CollectiblesSectionTestIds } from './CollectiblesSection.testIds';

const MAX_COLLECTIBLES_CARDS_DISPLAYED = 6;

interface CollectiblesSectionProps {
  sectionIndex: number;
  totalSectionsLoaded: number;
}

/**
 * Homepage discovery: pack artwork opens detail; its Open action opens confirmation, followed
 * by the selected account's collection. Visibility depends on the feature flag.
 */
const CollectiblesSection = forwardRef<
  SectionRefreshHandle,
  CollectiblesSectionProps
>(({ sectionIndex, totalSectionsLoaded }, ref) => {
  const sectionViewRef = useRef<View>(null);
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const isFocused = useIsFocused();
  const balance = useUsdcBalance();
  const isEnabled = useSelector(selectCollectiblesEnabledFlag);
  const hasCompletedOnboarding = useSelector(
    selectCollectiblesHasCompletedOnboarding,
  );
  const { account, cards, isLoading, hasError, isEmpty, refetch } =
    useCollectiblesCardsForHomepage({
      maxCards: MAX_COLLECTIBLES_CARDS_DISPLAYED,
      enabled: isEnabled,
    });
  const {
    packs,
    isLoading: packsLoading,
    error: packsError,
    refetch: refetchPacks,
  } = usePackPartnerPacks({ enabled: isEnabled });
  const packTypes = isEnabled
    ? packs.map((pack) => `pack_partner:${pack.code}`)
    : [];
  const insights = usePackInsights(packTypes);
  const featuredPacks = useMemo(
    () => getPopularPacks(packs, insights.data).slice(0, 6),
    [packs, insights.data],
  );
  const socialContext = usePackSocialContext(
    isEnabled ? featuredPacks.map((pack) => `pack_partner:${pack.code}`) : [],
  );
  const title = strings('collectibles.title');
  const [selection, setSelection] = useState<{
    pack: CollectiblesPack;
    account: CollectiblesWalletAccount;
  }>();
  if (
    selection &&
    (!isEnabled ||
      !isFocused ||
      !hasCompletedOnboarding ||
      selection.account.id !== account?.id ||
      selection.account.address !== account?.address)
  ) {
    setSelection(undefined);
  }
  const openReveal = useCallback(
    (memo: string, options?: { skipReveal?: boolean }) => {
      setSelection(undefined);
      navigation.navigate(Routes.COLLECTIBLES.ROOT, {
        state: {
          index: 1,
          routes: [
            {
              name: Routes.COLLECTIBLES.HOME,
              params: { initialTab: 'packs' } satisfies CollectiblesHomeParams,
            },
            { name: Routes.COLLECTIBLES.REVEAL, params: { memo, ...options } },
          ],
        },
      });
    },
    [navigation],
  );

  const openOnboarding = useCallback(
    (destination: CollectiblesEntryDestination) => {
      navigation.navigate(Routes.COLLECTIBLES.ROOT, {
        screen: Routes.COLLECTIBLES.ONBOARDING,
        params: { destination },
      });
    },
    [navigation],
  );

  const openHomeTab = useCallback(
    (tab: 'home' | 'packs' | 'cards') => {
      if (!hasCompletedOnboarding) {
        openOnboarding({ kind: 'home', tab });
        return;
      }
      navigation.navigate(Routes.COLLECTIBLES.ROOT, {
        screen: Routes.COLLECTIBLES.HOME,
        params: { initialTab: tab },
      });
    },
    [hasCompletedOnboarding, navigation, openOnboarding],
  );
  const handleOpenPack = useCallback(() => openHomeTab('packs'), [openHomeTab]);
  const handleOpenCollectibles = useCallback(
    () => openHomeTab('home'),
    [openHomeTab],
  );
  const handleCollectionPress = useCallback(
    () => openHomeTab('cards'),
    [openHomeTab],
  );

  const handlePackPress = useCallback(
    (pack: CollectiblesPack) => {
      if (!hasCompletedOnboarding) {
        openOnboarding({ kind: 'pack', packCode: pack.code });
        return;
      }
      navigation.navigate(Routes.COLLECTIBLES.ROOT, {
        screen: Routes.COLLECTIBLES.PACK,
        params: { packCode: pack.code },
      });
    },
    [hasCompletedOnboarding, navigation, openOnboarding],
  );

  const handlePackBuy = useCallback(
    (pack: CollectiblesPack) => {
      if (!hasCompletedOnboarding) {
        openOnboarding({ kind: 'purchase', packCode: pack.code });
        return;
      }
      if (!account) {
        handlePackPress(pack);
        return;
      }
      setSelection({ pack, account });
    },
    [account, handlePackPress, hasCompletedOnboarding, openOnboarding],
  );

  const handleCardPress = useCallback(
    (mint: string) => {
      if (!hasCompletedOnboarding) {
        openOnboarding({ kind: 'card', mint });
        return;
      }
      navigation.navigate(Routes.COLLECTIBLES.ROOT, {
        screen: Routes.COLLECTIBLES.CARD,
        params: { mint } satisfies CollectiblesCardParams,
      });
    },
    [hasCompletedOnboarding, navigation, openOnboarding],
  );

  const refresh = useCallback(async () => {
    if (!isEnabled) {
      return;
    }
    await Promise.all([refetch(), refetchPacks()]);
  }, [isEnabled, refetch, refetchPacks]);

  useImperativeHandle(ref, () => ({ refresh }), [refresh]);

  const { onLayout } = useHomeViewedEvent({
    sectionRef: isEnabled ? sectionViewRef : null,
    isLoading,
    sectionName: HomeSectionNames.COLLECTIBLES,
    sectionIndex,
    totalSectionsLoaded,
    isEmpty: isEmpty || hasError,
    itemCount: cards.length,
    fireImmediateWhenNoView: false,
  });

  useSectionPerformance({
    sectionId: HomeSectionNames.COLLECTIBLES,
    contentReady: !isLoading,
    isEmpty: isEmpty && !hasError,
    contentStateForTrace: hasError ? 'error' : undefined,
    isLoading,
    enabled: isEnabled,
  });

  if (!isEnabled) {
    return null;
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <Box
          flexDirection={BoxFlexDirection.Row}
          gap={3}
          testID={CollectiblesSectionTestIds.SKELETON}
        >
          <Box twClassName="w-32">
            <CardTileSkeleton compact />
          </Box>
          <Box twClassName="w-32">
            <CardTileSkeleton compact />
          </Box>
          <Box twClassName="w-32">
            <CardTileSkeleton compact />
          </Box>
        </Box>
      );
    }
    if (hasError) {
      return (
        <ErrorState
          title={strings('homepage.error.unable_to_load', {
            section: title,
          })}
          onRetry={refresh}
        />
      );
    }
    if (isEmpty) {
      return (
        <Box testID={CollectiblesSectionTestIds.EMPTY_STATE}>
          <ButtonBase
            onPress={handleOpenPack}
            testID={CollectiblesSectionTestIds.EMPTY_CTA}
            twClassName="h-auto rounded-xl border border-muted bg-subsection px-3 py-4"
            contentWrapperProps={{ twClassName: 'flex-1 gap-3' }}
          >
            <Icon
              name={IconName.Category}
              size={IconSize.Lg}
              color={IconColor.SuccessDefault}
            />
            <Box twClassName="flex-1" gap={1}>
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
                {strings('collectibles.home_section.first_card')}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {strings('collectibles.home_section.explore_packs')}
              </Text>
            </Box>
            <Icon name={IconName.ArrowRight} color={IconColor.SuccessDefault} />
          </ButtonBase>
        </Box>
      );
    }
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tw.style('gap-3 py-1')}
      >
        {cards.map((card) => (
          <Box key={card.mint} twClassName="w-32">
            <CardTile
              compact
              card={card}
              onPress={handleCardPress}
              testID={CollectiblesSectionTestIds.CARD_TILE(card.mint)}
            />
          </Box>
        ))}
      </ScrollView>
    );
  };

  return (
    <Box
      ref={sectionViewRef}
      onLayout={onLayout}
      testID={CollectiblesSectionTestIds.CONTAINER}
      twClassName="pb-4"
    >
      <SectionDivider />
      <SectionHeader
        title={title}
        isInteractive
        titleProps={{ fontWeight: FontWeight.Bold }}
        endAccessory={<Box />}
        onPress={handleOpenCollectibles}
        testID={homepageSectionTitleTestId(HomeSectionNames.COLLECTIBLES)}
      />
      <Box gap={4}>
        <SectionRow>
          <SectionHeader
            title={strings('collectibles.home_section.featured_packs')}
            titleProps={{
              variant: TextVariant.BodyMd,
              fontWeight: FontWeight.Bold,
            }}
            twClassName="p-0"
            endAccessory={
              <ButtonBase
                twClassName="bg-transparent px-0"
                contentWrapperProps={{ twClassName: 'gap-1' }}
                onPress={handleOpenPack}
                testID={CollectiblesSectionTestIds.VIEW_PACKS}
              >
                <Text
                  variant={TextVariant.BodySm}
                  fontWeight={FontWeight.Bold}
                  color={TextColor.SuccessDefault}
                >
                  {strings('collectibles.home_section.view_all')}
                </Text>
                <Icon
                  name={IconName.ArrowRight}
                  size={IconSize.Sm}
                  color={IconColor.SuccessDefault}
                />
              </ButtonBase>
            }
          />
        </SectionRow>
        <PackList
          packs={featuredPacks}
          isLoading={packsLoading}
          error={Boolean(packsError)}
          onRetry={refetchPacks}
          tileWidth={143}
          variant="carousel"
          onOpen={handlePackPress}
          onBuy={handlePackBuy}
          testID={CollectiblesSectionTestIds.PACKS}
          getOpenedLast7d={(pack) =>
            insights.data?.[`pack_partner:${pack.code}`]?.openedLast7d
          }
          renderSocialContext={(pack) => (
            <PackSocialSummary
              compact
              isLoading={socialContext.isPending}
              context={socialContext.data?.[`pack_partner:${pack.code}`]}
            />
          )}
        />
        <SectionRow gap={2}>
          <Box twClassName="border-t border-muted mb-2" />
          <SectionHeader
            title={strings('collectibles.home_section.your_collection')}
            isInteractive
            onPress={handleCollectionPress}
            titleProps={{
              variant: TextVariant.BodyMd,
              fontWeight: FontWeight.Bold,
            }}
            twClassName="px-0 py-1 self-start"
            testID={CollectiblesSectionTestIds.COLLECTION}
          />
          {renderContent()}
        </SectionRow>
      </Box>
      {selection && (
        <PackPurchaseSheet
          key={`${selection.account.id}:${selection.account.address}`}
          pack={selection.pack}
          account={selection.account}
          balance={balance.baseUnits}
          onClose={() => setSelection(undefined)}
          onPurchased={openReveal}
        />
      )}
    </Box>
  );
});

export default CollectiblesSection;
