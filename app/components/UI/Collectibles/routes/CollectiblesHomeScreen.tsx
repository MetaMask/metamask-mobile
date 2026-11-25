import React from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { HeaderStandard } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../locales/i18n';
import { collectiblesTestIds } from '../Collectibles.testIds';
import { View } from '../../primitives/View';
import { CollectiblesNavButtons } from '../components/CollectiblesNavButtons';
import { LandingSection } from '../components/LandingSection';

// Main page shell. Each section is filled by its own story.
export function CollectiblesHomeScreen() {
  const navigation = useNavigation();
  const tw = useTailwind();

  return (
    <View className="flex-1 bg-default" testID={collectiblesTestIds.landing}>
      <HeaderStandard
        title={strings('collectibles.title')}
        backButtonProps={{ testID: collectiblesTestIds.homeBackButton }}
        onBack={() => navigation.goBack()}
        includesTopInset
      />
      <ScrollView contentContainerStyle={tw.style('gap-4 pb-6')}>
        {/* Pack wheel placeholder (GAC-81). */}
        <View
          className="mx-4 h-64 rounded-2xl bg-muted"
          testID={collectiblesTestIds.landingHero}
        />
        <CollectiblesNavButtons />
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
    </View>
  );
}
