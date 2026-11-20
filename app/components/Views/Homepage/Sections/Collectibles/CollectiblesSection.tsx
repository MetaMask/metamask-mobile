import React, {
  ComponentRef,
  useImperativeHandle,
  useRef,
  type Ref,
} from 'react';
import {
  SectionDivider,
  SectionHeader,
} from '@metamask/design-system-react-native';
import { View } from '../../../../UI/primitives/View';
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
  const sectionViewRef = useRef<ComponentRef<typeof View>>(null);
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
    demandStarted: isPending || Boolean(packs?.length),
    isLoading: isPending,
  });

  if (isHidden) {
    return null;
  }

  return (
    <View
      ref={sectionViewRef}
      className="pb-3"
      testID={collectiblesTestIds.homeSection}
      onLayout={onLayout}
    >
      <SectionDivider />
      <SectionHeader
        title={strings('collectibles.title')}
        isInteractive
        testID={homepageSectionTitleTestId(HomeSectionNames.COLLECTIBLES)}
      />
      {packs ? (
        <CollectiblesCarousel packs={packs} />
      ) : (
        <CollectiblesCarouselSkeleton />
      )}
    </View>
  );
}
