import React, { Suspense, lazy } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { selectUserLoggedIn } from '../../../reducers/user/selectors';
import { useTheme } from '../../../util/theme';

// Lazy load the Browser component
const LazyBrowser = lazy(() => import('./index'));

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

interface LazyBrowserWrapperProps {
  // Props that will be passed to the Browser component
  [key: string]: any;
}

/**
 * Lazy-loaded wrapper for the Browser component that only initializes
 * after the user has successfully authenticated (entered PIN/biometrics)
 */
const LazyBrowserWrapper: React.FC<LazyBrowserWrapperProps> = (props) => {
  const { colors } = useTheme();
  const userLoggedIn = useSelector(selectUserLoggedIn);

  // Don't render Browser until user is authenticated
  if (!userLoggedIn) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background.default }]}>
        <ActivityIndicator size="small" color={colors.primary.default} />
      </View>
    );
  }

  // Render lazy-loaded Browser with fallback loading state
  return (
    <Suspense
      fallback={
        <View style={[styles.loadingContainer, { backgroundColor: colors.background.default }]}>
          <ActivityIndicator size="small" color={colors.primary.default} />
        </View>
      }
    >
      <LazyBrowser {...props} />
    </Suspense>
  );
};

export default LazyBrowserWrapper; 