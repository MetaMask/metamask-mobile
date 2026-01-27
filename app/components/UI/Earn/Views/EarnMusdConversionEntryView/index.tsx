import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { useTheme } from '../../../../../util/theme';
import { EarnMusdConversionEntryViewSelectorsIDs } from './EarnMusdConversionEntryView.types';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

/**
 * Entry view for mUSD conversion deeplink.
 *
 * Navigates to the education screen which handles:
 * - Showing education content (always, regardless of seen state)
 * - Determining appropriate action based on user state
 * - Routing to conversion flow, buy flow, or home
 *
 * This component is used as the destination for the earn-musd deeplink.
 */
const EarnMusdConversionEntryView = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    // Prevent double-navigation
    if (hasNavigatedRef.current) {
      return;
    }
    hasNavigatedRef.current = true;

    // Navigate to education screen without params
    // Education screen will determine the appropriate action
    navigation.navigate(Routes.EARN.ROOT, {
      screen: Routes.EARN.MUSD.CONVERSION_EDUCATION,
    });
  }, [navigation]);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background.default }]}
      testID={EarnMusdConversionEntryViewSelectorsIDs.CONTAINER}
    >
      <ActivityIndicator
        size="large"
        color={colors.primary.default}
        testID={EarnMusdConversionEntryViewSelectorsIDs.LOADING_INDICATOR}
      />
    </View>
  );
};

export default EarnMusdConversionEntryView;
