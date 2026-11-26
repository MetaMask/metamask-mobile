import React from 'react';
import {
  ButtonIcon,
  ButtonIconSize,
  IconName,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { useBoolean } from '../../../hooks/useBoolean';
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

export function EpicHuntSection() {
  const { packs, isPending } = useEpicOddsPacks();

  const {
    value: isInfoOpen,
    setTrue: openInfo,
    setFalse: closeInfo,
  } = useBoolean();

  return (
    <LandingSection
      name="epic-vs-odds"
      title={strings('collectibles.landing.epic_vs_odds')}
      titleAccessory={
        <ButtonIcon
          iconName={IconName.Info}
          size={ButtonIconSize.Sm}
          accessibilityLabel={strings('collectibles.epic_vs_odds.info')}
          onPress={openInfo}
          testID={collectiblesTestIds.epicOddsInfoButton}
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
      {isInfoOpen && <EpicOddsInfoSheet onClose={closeInfo} />}
    </LandingSection>
  );
}
