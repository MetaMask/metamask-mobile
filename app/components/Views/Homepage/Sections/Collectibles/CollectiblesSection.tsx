import React, { useImperativeHandle, useRef, type Ref } from 'react';
import type { View as RNView } from 'react-native';
import {
  SectionDivider,
  SectionHeader,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { View } from '../../../../UI/primitives/View';
import { Text } from '../../../../UI/primitives/Text';
import { strings } from '../../../../../../locales/i18n';
import type { SectionRefreshHandle } from '../../types';
import useHomeViewedEvent, {
  HomeSectionNames,
} from '../../hooks/useHomeViewedEvent';
import { useSectionPerformance } from '../../hooks/useSectionPerformance';
import { homepageSectionTitleTestId } from '../../Homepage.testIds';
import { useHomePacks } from '../../../../UI/Collectibles/hooks/useHomePacks';
import {
  CollectiblesCarousel,
  CollectiblesCarouselSkeleton,
} from '../../../../UI/Collectibles/components/CollectiblesCarousel';
import { collectiblesTestIds } from '../../../../UI/Collectibles/Collectibles.testIds';

interface Props {
  ref?: Ref<SectionRefreshHandle>;
  sectionIndex: number;
  totalSectionsLoaded: number;
}

/**
 * Home "Collectibles" section: header plus a carousel of placeholder packs.
 * Homepage mounts it only while the flag is on.
 */
export function CollectiblesSection({
  ref,
  sectionIndex,
  totalSectionsLoaded,
}: Props) {
  const sectionViewRef = useRef<RNView>(null);
  const { data: packs, isPending, refetch } = useHomePacks();
  // A failed refetch keeps cached packs, so only hide when there's nothing to show.
  const isEmpty = !packs?.length;
  const isHidden = !isPending && isEmpty;

  // Pull-to-refresh on Home refetches the packs.
  useImperativeHandle(ref, () => ({
    refresh: async () => {
      await refetch();
    },
  }));

  const { onLayout } = useHomeViewedEvent({
    sectionRef: isHidden ? null : sectionViewRef,
    isLoading: isPending,
    sectionName: HomeSectionNames.COLLECTIBLES,
    sectionIndex,
    totalSectionsLoaded,
    isEmpty,
    itemCount: packs?.length ?? 0,
    fireImmediateWhenNoView: false,
  });

  useSectionPerformance({
    sectionId: HomeSectionNames.COLLECTIBLES,
    contentReady: !isPending,
    isEmpty,
    isLoading: isPending,
  });

  if (isHidden) {
    return null;
  }

  return (
    <View
      ref={sectionViewRef}
      onLayout={onLayout}
      className="pb-3"
      testID={collectiblesTestIds.homeSection}
    >
      <SectionDivider />
      {/* TODO: make the header open Collectibles once it has routes */}
      <SectionHeader
        title={strings('collectibles.title')}
        testID={homepageSectionTitleTestId(HomeSectionNames.COLLECTIBLES)}
      />
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        className="px-4"
      >
        {strings('collectibles.home_section.description')}
      </Text>
      <View className="pt-3">
        {isPending || !packs ? (
          <CollectiblesCarouselSkeleton />
        ) : (
          <CollectiblesCarousel packs={packs} />
        )}
      </View>
    </View>
  );
}
