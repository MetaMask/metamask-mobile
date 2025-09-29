import { useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from '@metamask/react-native-webview';
import { getWebviewNavbar } from '../../UI/Navbar';
import Share from 'react-native-share'; // eslint-disable-line  import/default
import Logger from '../../../util/Logger';
import { baseStyles } from '../../../styles/common';
import { useTheme } from '../../../util/theme';
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
  const { colors } = useTheme();
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
    navigation.setOptions(getWebviewNavbar(navigation, route, colors));
    navigation && navigation.setParams({ dispatch: share });
  }, [navigation, route, share]);

  return (
    <SafeAreaView edges={{ bottom: 'additive' }} style={baseStyles.flexGrow}>
      <WebView containerStyle={baseStyles.webview} source={{ uri: url }} />
    </SafeAreaView>
  );
};

export default SimpleWebView;

export { default as createWebviewNavDetails } from './SimpleWebview.types';
