/* eslint-disable @typescript-eslint/consistent-type-definitions */
import React, { useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from '@metamask/react-native-webview';
import getHeaderCompactStandardNavbarOptions from '../../../component-library/components-temp/HeaderCompactStandard/getHeaderCompactStandardNavbarOptions';
import { IconName } from '@metamask/design-system-react-native';
import Share from 'react-native-share'; // eslint-disable-line  import/default
import Logger from '../../../util/Logger';
import { baseStyles } from '../../../styles/common';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';

// TODO: This will be replaced with the actual route params type once navigation is refactored
type RouteParams = {
  SimpleWebView: {
    url: string;
  };
};

const SimpleWebView = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'SimpleWebView'>>();
  const url = route.params.url;

  const share = useCallback(() => {
    if (url) {
      Share.open({
        url,
      }).catch((err) => {
        Logger.log('Error while trying to share simple web view', err);
      });
    }
  }, [url]);

  useEffect(() => {
    const title = (route.params as { title?: string })?.title ?? '';
    navigation.setOptions(
      getHeaderCompactStandardNavbarOptions({
        title,
        onBack: () => navigation.goBack(),
        includesTopInset: true,
        endButtonIconProps: [{ iconName: IconName.Share, onPress: share }],
      }),
    );
  }, [navigation, route, share]);

  return (
    <SafeAreaView edges={{ bottom: 'additive' }} style={baseStyles.flexGrow}>
      <WebView containerStyle={baseStyles.webview} source={{ uri: url }} />
    </SafeAreaView>
  );
};

export default SimpleWebView;

export { default as createWebviewNavDetails } from './SimpleWebview.types';
