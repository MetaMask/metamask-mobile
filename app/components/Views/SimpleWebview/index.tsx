/* eslint-disable @typescript-eslint/consistent-type-definitions */
import React, { useCallback } from 'react';
import { Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from '@metamask/react-native-webview';
import HeaderCompactStandard from '../../../component-library/components-temp/HeaderCompactStandard/HeaderCompactStandard';
import { IconName } from '@metamask/design-system-react-native';
import Share from 'react-native-share'; // eslint-disable-line  import-x/default
import Logger from '../../../util/Logger';
import { baseStyles } from '../../../styles/common';
import { useTheme } from '../../../util/theme';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';

const SAFE_AREA_EDGES =
  Platform.OS === 'android'
    ? (['top', 'bottom'] as const)
    : (['bottom'] as const);

// TODO: This will be replaced with the actual route params type once navigation is refactored
type RouteParams = {
  SimpleWebView: {
    url: string;
  };
};

const SimpleWebView = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'SimpleWebView'>>();
  const { colors } = useTheme();
  const url = route.params.url;
  const title = (route.params as { title?: string })?.title ?? '';

  const share = useCallback(() => {
    if (url) {
      Share.open({
        url,
      }).catch((err) => {
        Logger.log('Error while trying to share simple web view', err);
      });
    }
  }, [url]);

  return (
    <SafeAreaView
      edges={SAFE_AREA_EDGES}
      style={[
        baseStyles.flexGrow,
        { backgroundColor: colors.background.default },
      ]}
    >
      <HeaderCompactStandard
        title={title}
        onBack={() => navigation.goBack()}
        endButtonIconProps={[{ iconName: IconName.Share, onPress: share }]}
      />
      <WebView containerStyle={baseStyles.flexGrow} source={{ uri: url }} />
    </SafeAreaView>
  );
};

export default SimpleWebView;

export { default as createWebviewNavDetails } from './SimpleWebview.types';
