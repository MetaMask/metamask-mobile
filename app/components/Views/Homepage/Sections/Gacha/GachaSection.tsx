import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxFlexDirection,
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
import NftSkeletonCell from '../../../../UI/NftGrid/NftSkeletonCell';
import { CollectiblesEmptyState } from '../../../../UI/CollectiblesEmptyState';
import {
  CardTile,
  selectGachaEnabledFlag,
  selectGachaHasCompletedOnboarding,
} from '../../../../UI/Gacha';
import type { CollectorCryptCard } from '../../../../UI/Gacha/providers/collector-crypt/types';
import type {
  GachaCardParams,
  GachaHomeParams,
} from '../../../../UI/Gacha/types/navigation';
import { useGachaCardsForHomepage } from './hooks';
import { GachaSectionTestIds } from './GachaSection.testIds';
import {
  GACHA_CARDS_PER_ROW,
  MAX_GACHA_CARDS_DISPLAYED,
  toRows,
} from './GachaSection.utils';

interface GachaSectionProps {
  sectionIndex: number;
  totalSectionsLoaded: number;
}

interface GachaCardRowProps {
  row: CollectorCryptCard[];
  onCardPress: (mint: string) => void;
}

/** One grid row; empty boxes keep the columns aligned on a short row. */
const GachaCardRow = ({ row, onCardPress }: GachaCardRowProps) => (
  <Box flexDirection={BoxFlexDirection.Row} gap={3}>
    {row.map((card) => (
      <Box key={card.mint} twClassName="flex-1">
        <CardTile
          card={card}
          onPress={onCardPress}
          testID={GachaSectionTestIds.CARD_TILE(card.mint)}
        />
      </Box>
    ))}
    {Array.from({ length: GACHA_CARDS_PER_ROW - row.length }, (_, i) => (
      <Box key={`filler-${i}`} twClassName="flex-1" />
    ))}
  </Box>
);

/**
 * Homepage "Gacha" section: the selected Solana account's CollectorCrypt
 * cards, or an empty state inviting to open a pack. Visibility is controlled
 * by the remote feature flag.
 */
const GachaSection = forwardRef<SectionRefreshHandle, GachaSectionProps>(
  ({ sectionIndex, totalSectionsLoaded }, ref) => {
    const sectionViewRef = useRef<View>(null);
    const navigation = useNavigation<AppNavigationProp>();
    const isEnabled = useSelector(selectGachaEnabledFlag);
    const hasCompletedOnboarding = useSelector(
      selectGachaHasCompletedOnboarding,
    );
    const { cards, isLoading, hasError, isEmpty, refetch } =
      useGachaCardsForHomepage({
        maxCards: MAX_GACHA_CARDS_DISPLAYED,
        enabled: isEnabled,
      });
    const title = strings('gacha.title');
    const rows = useMemo(() => toRows(cards, GACHA_CARDS_PER_ROW), [cards]);

    const handleOpenPack = useCallback(() => {
      if (!hasCompletedOnboarding) {
        navigation.navigate(Routes.GACHA.ROOT, {
          screen: Routes.GACHA.ONBOARDING,
        });
        return;
      }
      navigation.navigate(Routes.GACHA.ROOT, {
        screen: Routes.GACHA.HOME,
        params: { initialTab: 'packs' },
      });
    }, [navigation, hasCompletedOnboarding]);

    const handleCardPress = useCallback(
      (mint: string) => {
        if (!hasCompletedOnboarding) {
          handleOpenPack();
          return;
        }
        navigation.navigate(Routes.GACHA.ROOT, {
          state: {
            index: 1,
            routes: [
              {
                name: Routes.GACHA.HOME,
                params: { initialTab: 'cards' } satisfies GachaHomeParams,
              },
              {
                name: Routes.GACHA.CARD,
                params: { mint } satisfies GachaCardParams,
              },
            ],
          },
        });
      },
      [navigation, hasCompletedOnboarding, handleOpenPack],
    );

    const refresh = useCallback(async () => {
      if (!isEnabled) {
        return;
      }
      await refetch();
    }, [isEnabled, refetch]);

    useImperativeHandle(ref, () => ({ refresh }), [refresh]);

    const { onLayout } = useHomeViewedEvent({
      sectionRef: isEnabled ? sectionViewRef : null,
      isLoading,
      sectionName: HomeSectionNames.GACHA,
      sectionIndex,
      totalSectionsLoaded,
      isEmpty: isEmpty || hasError,
      itemCount: cards.length,
      fireImmediateWhenNoView: false,
    });

    useSectionPerformance({
      sectionId: HomeSectionNames.GACHA,
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
            testID={GachaSectionTestIds.SKELETON}
          >
            <NftSkeletonCell />
            <NftSkeletonCell />
            <NftSkeletonCell />
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
          <CollectiblesEmptyState
            description={strings('gacha.home_section.empty_description')}
            actionButtonText={strings('gacha.home_section.open_pack')}
            onAction={handleOpenPack}
            actionButtonProps={{ testID: GachaSectionTestIds.EMPTY_CTA }}
            twClassName="mx-auto"
            testID={GachaSectionTestIds.EMPTY_STATE}
          />
        );
      }
      return rows.map((row, rowIndex) => (
        <GachaCardRow
          key={`gacha-row-${rowIndex}`}
          row={row}
          onCardPress={handleCardPress}
        />
      ));
    };

    return (
      <View
        ref={sectionViewRef}
        onLayout={onLayout}
        testID={GachaSectionTestIds.CONTAINER}
      >
        <SectionDivider />
        <SectionHeader
          title={title}
          isInteractive
          onPress={handleOpenPack}
          testID={homepageSectionTitleTestId(HomeSectionNames.GACHA)}
        />
        <Box gap={3}>
          <SectionRow>{renderContent()}</SectionRow>
        </Box>
      </View>
    );
  },
);

export default GachaSection;
