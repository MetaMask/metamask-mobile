import React from 'react';
import { ScrollView } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../locales/i18n';
import { View } from '../../primitives/View';
import { NavButtons } from '../components/NavButtons';
import { LandingSection } from '../components/LandingSection';
import { collectiblesTestIds } from '../Collectibles.testIds';

export function HomeView() {
  const tw = useTailwind();

  return (
    <ScrollView contentContainerStyle={tw.style('gap-4 pb-6')}>
      <View
        className="mx-4 h-64 rounded-2xl bg-muted"
        testID={collectiblesTestIds.landingHero}
      />
      <NavButtons />
      <LandingSection
        name="just-opened"
        title={strings('collectibles.landing.just_opened')}
      />
      <LandingSection
        name="epic-vs-odds"
        title={strings('collectibles.landing.epic_vs_odds')}
      />
      <LandingSection
        name="greatest-hits"
        title={strings('collectibles.landing.greatest_hits')}
      />
    </ScrollView>
  );
}
