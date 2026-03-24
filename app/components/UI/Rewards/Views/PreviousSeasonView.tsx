import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native-gesture-handler';
import { strings } from '../../../../../locales/i18n';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import PreviousSeasonSummary from '../components/PreviousSeason/PreviousSeasonSummary';

const PreviousSeasonView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();

  return (
    <ErrorBoundary navigation={navigation} view="PreviousSeasonView">
      <SafeAreaView
        edges={{ top: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID="previous-season-view-safe-area"
      >
        <HeaderCompactStandard
          title={strings('rewards.previous_season_view.title')}
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: 'header-back-button' }}
        />
        <ScrollView
          contentContainerStyle={tw.style('flex-grow')}
          showsVerticalScrollIndicator={false}
        >
          <PreviousSeasonSummary />
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default PreviousSeasonView;
