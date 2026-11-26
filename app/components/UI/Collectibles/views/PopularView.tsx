import React from 'react';
import { ScrollView } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../locales/i18n';
import { View } from '../../primitives/View';
import { LandingSection } from '../components/LandingSection';
import { EpicOddsSection } from '../components/EpicOddsSection';
import { collectiblesTestIds } from '../Collectibles.testIds';

export function PopularView() {
  const tw = useTailwind();

  return (
    <ScrollView
      contentContainerStyle={tw.style('gap-4 pb-6 pt-4')}
      testID={collectiblesTestIds.popularView}
    >
      <View
        className="mx-4 h-64 rounded-2xl bg-muted"
        testID={collectiblesTestIds.landingHero}
      />
      <LandingSection
        name="just-opened"
        title={strings('collectibles.landing.just_opened')}
      />
      <EpicOddsSection />
      <LandingSection
        name="greatest-hits"
        title={strings('collectibles.landing.greatest_hits')}
      />
    </ScrollView>
  );
}
