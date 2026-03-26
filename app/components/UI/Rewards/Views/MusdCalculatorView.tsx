import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import MusdCalculatorTab from '../components/Tabs/MusdCalculatorTab/MusdCalculatorTab';
import { strings } from '../../../../../locales/i18n';

const MusdCalculatorView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();

  return (
    <ErrorBoundary navigation={navigation} view="MusdCalculatorView">
      <SafeAreaView
        edges={{ top: 'additive' }}
        style={tw.style('flex-1 bg-default')}
      >
        <HeaderCompactStandard
          title={strings('rewards.musd.page_title')}
          onBack={() => navigation.goBack()}
        />
        <MusdCalculatorTab />
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default MusdCalculatorView;
