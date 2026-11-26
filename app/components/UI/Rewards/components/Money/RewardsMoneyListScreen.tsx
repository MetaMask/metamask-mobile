import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import ErrorBoundary from '../../../../Views/ErrorBoundary';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';

interface RewardsMoneyListScreenProps {
  /** Name reported by `ErrorBoundary` when the screen throws. */
  view: string;
  title: string;
  testID: string;
  children: React.ReactNode;
}

/**
 * Page chrome shared by the Money full-page screens: error boundary, safe
 * area, and a header with a back button. The body is the caller's, usually a
 * `TradingActivityListView` that owns the only scroller.
 */
const RewardsMoneyListScreen: React.FC<RewardsMoneyListScreenProps> = ({
  view,
  title,
  testID,
  children,
}) => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled);
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();

  return (
    <ErrorBoundary navigation={navigation} view={view}>
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={testID}
      >
        <HeaderStandardGlass
          isGlass={isGlassHeader}
          isFloating={false}
          title={title}
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: 'header-back-button' }}
          includesTopInset
        />
        {children}
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default RewardsMoneyListScreen;
