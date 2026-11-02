/* eslint-disable @typescript-eslint/consistent-type-definitions */
import React, { useCallback, useState } from 'react';
import { Platform, View } from 'react-native';
import { WebView } from '@metamask/react-native-webview';
import { HeaderStandard, IconName } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Share from 'react-native-share'; // eslint-disable-line  import-x/default
import Logger from '../../../util/Logger';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import HeaderStandardGlass from '../../../component-library/components-temp/HeaderStandardGlass';
import { useNetworkTier } from '../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../util/deviceCapability';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { SimpleWebviewParams } from '../Webview/Webview.types';

// TODO: This will be replaced with the actual route params type once navigation is refactored
type RouteParams = {
  SimpleWebView: SimpleWebviewParams & { url: string };
};

const SimpleWebView = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<RouteProp<RouteParams, 'SimpleWebView'>>();
  const {
    url,
    title = '',
    hideShareButton,
    isModal,
    useGlassHeader,
  } = route.params;
  const includesTopInset = !isModal || Platform.OS === 'android';
  const [hardwareTier] = useState(getHardwareTier);
  const networkTier = useNetworkTier();
  const isGlass =
    Boolean(useGlassHeader) && hardwareTier !== 'LOW' && networkTier !== 'NONE';
  const { top: safeAreaTop } = useSafeAreaInsets();

  const share = useCallback(() => {
    if (url) {
      Share.open({
        url,
      }).catch((err) => {
        Logger.log('Error while trying to share simple web view', err);
      });
    }
  }, [url]);

  const close = useCallback(() => navigation.goBack(), [navigation]);

  const headerProps = {
    title,
    includesTopInset: useGlassHeader ? false : includesTopInset,
    ...(useGlassHeader
      ? {
          onClose: close,
          closeButtonProps: { testID: 'simple-webview-close-button' },
        }
      : {
          onBack: close,
          backButtonProps: { testID: 'simple-webview-back-button' },
        }),
    endButtonIconProps: hideShareButton
      ? undefined
      : [
          {
            iconName: IconName.Share,
            onPress: share,
            testID: 'simple-webview-share-button',
          },
        ],
  };

  return (
    <View style={tw.style('flex-1 bg-default')}>
      {useGlassHeader ? (
        <>
          <View
            testID="simple-webview-drag-handle"
            style={[
              tw.style('items-center self-stretch p-1'),
              includesTopInset && { marginTop: safeAreaTop },
            ]}
          >
            <View style={tw.style('h-1 w-10 rounded-sm bg-border-muted')} />
          </View>
          <HeaderStandardGlass
            isFloating={false}
            isGlass={isGlass}
            {...headerProps}
          />
        </>
      ) : (
        <HeaderStandard {...headerProps} />
      )}
      <WebView
        containerStyle={tw.style('flex-1')}
        source={{ uri: url }}
        testID="simple-webview"
        originWhitelist={[
          'https://*',
          'http://*',
          'about:blank',
          'about:srcdoc',
        ]}
      />
    </View>
  );
};

export default SimpleWebView;

export { default as createWebviewNavDetails } from './SimpleWebview.types';
