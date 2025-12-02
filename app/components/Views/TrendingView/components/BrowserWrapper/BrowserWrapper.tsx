import React, { useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Browser from '../../../Browser';
import Routes from '../../../../../constants/navigation/Routes';

// Wrapper component to intercept navigation
const BrowserWrapper: React.FC<{ route: object }> = ({ route }) => {
  const navigation = useNavigation();
  const tw = useTailwind();

  // Create a custom navigation object that intercepts navigate calls
  const customNavigation = useMemo(() => {
    const originalNavigate = navigation.navigate.bind(navigation);

    return {
      ...navigation,
      navigate: (routeName: string, params?: object) => {
        // If trying to navigate to TRENDING_VIEW, go back in stack instead
        if (routeName === Routes.TRENDING_VIEW) {
          navigation.goBack();
        } else {
          originalNavigate(routeName, params);
        }
      },
    };
  }, [navigation]);

  return (
    <SafeAreaView style={tw.style('flex-1')} edges={['bottom']}>
      <Browser navigation={customNavigation} route={route} />
    </SafeAreaView>
  );
};

export default BrowserWrapper;
