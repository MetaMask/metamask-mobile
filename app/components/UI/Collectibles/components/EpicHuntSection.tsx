import React from 'react';
import {
  ButtonIcon,
  ButtonIconSize,
  IconName,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { useBoolean } from '../../../hooks/useBoolean';
import { collectiblesTestIds } from '../Collectibles.testIds';
import type { EpicHuntPack } from '../types/packs';
import { useEpicHuntPacks } from '../hooks/useEpicHuntPacks';
import {
  CollectiblesCarousel,
  CollectiblesCarouselEmpty,
  CollectiblesCarouselSkeleton,
} from './CollectiblesCarousel';
import { EpicOverdueBadge } from './EpicOverdueBadge';
import { EpicHuntInfoSheet } from './EpicHuntInfoSheet';
import { LandingSection } from './LandingSection';
import { PackTile } from './PackTile';

const renderItem = ({ item }: { item: EpicHuntPack }) => (
  <PackTile
    pack={item}
    badge={<EpicOverdueBadge code={item.code} value={item.pullsOverAverage} />}
    caption={item.subtitle}
  />
);

export function EpicHuntSection() {
  const { data: packs, isPending } = useEpicHuntPacks();

  const {
    value: isInfoOpen,
    setTrue: openInfo,
    setFalse: closeInfo,
  } = useBoolean();

  return (
    <LandingSection
      name="epic-hunt"
      title={strings('collectibles.landing.epic_hunt')}
      titleAccessory={
        <ButtonIcon
          iconName={IconName.Info}
          size={ButtonIconSize.Sm}
          accessibilityLabel={strings('collectibles.epic_hunt.info')}
          onPress={openInfo}
          testID={collectiblesTestIds.epicHuntInfoButton}
        />
      }
    >
      {packs.length ? (
        <CollectiblesCarousel packs={packs} renderItem={renderItem} />
      ) : isPending ? (
        <CollectiblesCarouselSkeleton />
      ) : (
        <CollectiblesCarouselEmpty />
      )}
      {isInfoOpen && <EpicHuntInfoSheet onClose={closeInfo} />}
    </LandingSection>
  );
}
