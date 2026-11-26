import React, { useState } from 'react';
import {
  ButtonIcon,
  ButtonIconSize,
  IconName,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { collectiblesTestIds } from '../Collectibles.testIds';
import type { EpicOddsPack } from '../types/packs';
import { useEpicOddsPacks } from '../hooks/useEpicOddsPacks';
import {
  CollectiblesCarousel,
  CollectiblesCarouselEmpty,
  CollectiblesCarouselSkeleton,
} from './CollectiblesCarousel';
import { EpicOddsGauge } from './EpicOddsGauge';
import { EpicOddsInfoSheet } from './EpicOddsInfoSheet';
import { LandingSection } from './LandingSection';
import { PackTile } from './PackTile';

const renderItem = ({ item }: { item: EpicOddsPack }) => (
  <PackTile
    pack={item}
    badge={<EpicOddsGauge code={item.code} value={item.gaugeValue} />}
    caption={item.subtitle}
  />
);

export function EpicOddsSection() {
  const { packs, isPending } = useEpicOddsPacks();

  const [isInfoOpen, setIsInfoOpen] = useState(false);

  return (
    <LandingSection
      name="epic-vs-odds"
      title={strings('collectibles.landing.epic_vs_odds')}
      titleAccessory={
        <ButtonIcon
          iconName={IconName.Info}
          size={ButtonIconSize.Sm}
          accessibilityLabel={strings('collectibles.epic_vs_odds.info')}
          onPress={() => setIsInfoOpen(true)}
          testID={collectiblesTestIds.epicOddsInfoButton}
        />
      }
    >
      {isPending ? (
        <CollectiblesCarouselSkeleton />
      ) : packs.length ? (
        <CollectiblesCarousel packs={packs} renderItem={renderItem} />
      ) : (
        <CollectiblesCarouselEmpty />
      )}
      {isInfoOpen && <EpicOddsInfoSheet onClose={() => setIsInfoOpen(false)} />}
    </LandingSection>
  );
}
