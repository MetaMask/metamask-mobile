import React from 'react';
import { HeaderStandard } from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import MusdCalculatorTab from '../components/Tabs/MusdCalculatorTab/MusdCalculatorTab';
import { strings } from '../../../../../locales/i18n';
import useTrackRewardsPageView from '../hooks/useTrackRewardsPageView';

const MusdCalculatorView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();

  useTrackRewardsPageView({ page_type: 'musd_calculator' });

  return (
    <ErrorBoundary navigation={navigation} view="MusdCalculatorView">
      <SafeAreaView
        edges={{ top: 'additive' }}
        style={tw.style('flex-1 bg-default')}
      >
        <HeaderStandard
          title={strings('rewards.musd.page_title')}
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: 'header-back-button' }}
        />
        <MusdCalculatorTab />
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default MusdCalculatorView;
