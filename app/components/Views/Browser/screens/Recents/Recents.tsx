import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import {
  View,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { WebView, } from '@metamask/react-native-webview';
import { useSelector } from 'react-redux';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import {
  processUrlForBrowser,
  isTLD,
} from '../../../../../util/browser';
import resolveEnsToIpfsContentId from '../../../../../lib/ens-ipfs/resolver';
import { strings } from '../../../../../../locales/i18n';
import URLParse from 'url-parse';
import Device from '../../../../../util/device';
import AppConstants from '../../../../../core/AppConstants';
import ErrorBoundary from '../../../ErrorBoundary';
import {
  IPFS_GATEWAY_DISABLED_ERROR,
} from './constants';
import { regex } from '../../../../../../app/util/regex';
import trackErrorAsAnalytics from '../../../../../util/metrics/TrackError/trackErrorAsAnalytics';
import { useNavigation } from '@react-navigation/native';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './styles';
import {
  type SessionENSNames,
  type BrowserTabProps as BrowserRecentsProps,
  type IpfsContentResult,
} from './types';
import { StackNavigationProp } from '@react-navigation/stack';
import BrowserUrlBar, {
  ConnectionType,
  BrowserUrlBarRef,
} from '../../../../UI/BrowserUrlBar';
import { isENSUrl } from './utils';
import UrlAutocomplete, { UrlAutocompleteRef } from '../../../../UI/UrlAutocomplete';
import { selectSearchEngine } from '../../../../../reducers/browser/selectors';

/**
 * Recent visited URLs the in-app browser
 */
export const BrowserRecents: React.FC<BrowserRecentsProps> = ({
  ipfsGateway,
  activeChainId,
}) => {
  // This any can be removed when react navigation is bumped to v6 - issue https://github.com/react-navigation/react-navigation/issues/9037#issuecomment-735698288
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { styles } = useStyles(styleSheet, {});
  const [isUrlBarFocused, setIsUrlBarFocused] = useState(false);
  const [connectionType, setConnectionType] = useState(ConnectionType.UNKNOWN);
  const webviewRef = useRef<WebView>(null);
  // Track if webview is loaded for the first time
  // WARN: keep
  const urlBarRef = useRef<BrowserUrlBarRef>(null);
  const autocompleteRef = useRef<UrlAutocompleteRef>(null);
  const onSubmitEditingRef = useRef<(text: string) => Promise<void>>(
    async () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
    },
  );
  const resolvedUrlRef = useRef('');
  const sessionENSNamesRef = useRef<SessionENSNames>({});
  const ensIgnoreListRef = useRef<string[]>([]);
  const searchEngine = useSelector(selectSearchEngine);

  /**
   * Get IPFS info from a ens url
   * TODO: Consider improving this function and it's types
   */
  const handleIpfsContent = useCallback(
    async (
      fullUrl,
      { hostname, pathname, query },
    ): Promise<IpfsContentResult | undefined | null> => {
      const { provider } =
        Engine.context.NetworkController.getProviderAndBlockTracker();
      let gatewayUrl;
      try {
        const { type, hash } = await resolveEnsToIpfsContentId({
          provider,
          name: hostname,
          chainId: activeChainId,
        });
        if (type === 'ipfs-ns') {
          gatewayUrl = `${ipfsGateway}${hash}${pathname || '/'}${query || ''}`;
          const response = await fetch(gatewayUrl);
          const statusCode = response.status;
          if (statusCode >= 400) {
            Logger.log('Status code ', statusCode, gatewayUrl);
            return null;
          }
        } else if (type === 'swarm-ns') {
          gatewayUrl = `${AppConstants.SWARM_DEFAULT_GATEWAY_URL}${hash}${pathname || '/'
            }${query || ''}`;
        } else if (type === 'ipns-ns') {
          gatewayUrl = `${AppConstants.IPNS_DEFAULT_GATEWAY_URL}${hostname}${pathname || '/'
            }${query || ''}`;
        }
        return {
          url: gatewayUrl,
          hash,
          type,
        };
      } catch (err: unknown) {
        const handleIpfsContentError = err as Error;
        //if it's not a ENS but a TLD (Top Level Domain)
        if (isTLD(hostname, handleIpfsContentError)) {
          ensIgnoreListRef.current.push(hostname);
          return { url: fullUrl, reload: true };
        }
        if (
          handleIpfsContentError?.message?.startsWith(
            'EnsIpfsResolver - no known ens-ipfs registry for chainId',
          )
        ) {
          trackErrorAsAnalytics(
            'Browser: Failed to resolve ENS name for chainId',
            handleIpfsContentError?.message,
          );
        } else {
          Logger.error(handleIpfsContentError, 'Failed to resolve ENS name');
        }

        if (
          handleIpfsContentError?.message?.startsWith(
            IPFS_GATEWAY_DISABLED_ERROR,
          )
        ) {
          throw new Error(handleIpfsContentError?.message);
        } else {
          Alert.alert(
            strings('browser.failed_to_resolve_ens_name'),
            handleIpfsContentError.message,
          );
        }
      }
    },
    [ipfsGateway, activeChainId],
  );

  const handleEnsUrl = useCallback(
    async (ens: string) => {
      try {
        webviewRef.current?.stopLoading();

        const { hostname, query, pathname } = new URLParse(ens);
        const ipfsContent = await handleIpfsContent(ens, {
          hostname,
          query,
          pathname,
        });
        if (!ipfsContent?.url) return null;
        const { url: ipfsUrl, reload } = ipfsContent;
        // Reload with IPFS url
        if (reload) return onSubmitEditingRef.current?.(ipfsUrl);
        if (!ipfsContent.hash || !ipfsContent.type) {
          Logger.error(
            new Error('IPFS content is missing hash or type'),
            'Error in handleEnsUrl',
          );
          return null;
        }
        const { type, hash } = ipfsContent;
        sessionENSNamesRef.current[ipfsUrl] = { hostname, hash, type };
        return ipfsUrl;
      } catch (_) {
        return null;
      }
    },
    [handleIpfsContent],
  );

  // WARN: keep
  const onSubmitEditing = useCallback(
    async (text: string) => {
      if (!text) return;
      setConnectionType(ConnectionType.UNKNOWN);
      urlBarRef.current?.setNativeProps({ text });
      // Format url for browser to be navigatable by webview
      const processedUrl = processUrlForBrowser(text, searchEngine);
      if (isENSUrl(processedUrl, ensIgnoreListRef.current)) {
        const handledEnsUrl = await handleEnsUrl(
          processedUrl.replace(regex.urlHttpToHttps, 'https://'),
        );
        if (!handledEnsUrl) {
          Logger.error(
            new Error('Failed to handle ENS url'),
            'Error in onSubmitEditing',
          );
          return;
        }
        return onSubmitEditingRef.current(handledEnsUrl);
      }
    },
    [searchEngine, handleEnsUrl, setConnectionType],
  );

  // Assign the memoized function to the ref. This is needed since onSubmitEditing is a useCallback and is accessed recursively
  useEffect(() => {
    onSubmitEditingRef.current = onSubmitEditing;
  }, [onSubmitEditing]);

  /**
   * Handle autocomplete selection
   */
  const onSelect = (url: string) => {
    // Unfocus the url bar and hide the autocomplete results
    urlBarRef.current?.hide();
    onSubmitEditing(url);
  };

  /**
   * Handle autocomplete dismissal
   */
  const onDismissAutocomplete = () => {
    // Unfocus the url bar and hide the autocomplete results
    urlBarRef.current?.hide();
    const hostName =
      new URLParse(resolvedUrlRef.current).hostname || resolvedUrlRef.current;
    urlBarRef.current?.setNativeProps({ text: hostName });
  };

  /**
   * Hide the autocomplete results
   */
  const hideAutocomplete = () => autocompleteRef.current?.hide();

  const onCancelUrlBar = () => {
    hideAutocomplete();
    // Reset the url bar to the current url
    const hostName =
      new URLParse(resolvedUrlRef.current).hostname || resolvedUrlRef.current;
    urlBarRef.current?.setNativeProps({ text: hostName });
  };

  const onFocusUrlBar = () => {
    // Show the autocomplete results
    autocompleteRef.current?.show();
    urlBarRef.current?.setNativeProps({ text: resolvedUrlRef.current });
  };

  const onChangeUrlBar = (text: string) =>
    // Search the autocomplete results
    autocompleteRef.current?.search(text);

  return (
    <ErrorBoundary navigation={navigation} view="BrowserTab">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.wrapper}
      >
        <View
          style={styles.wrapper}
          {...(Device.isAndroid() ? { collapsable: false } : {})}
        >
          <BrowserUrlBar
            ref={urlBarRef}
            connectionType={connectionType}
            onSubmitEditing={onSubmitEditing}
            onCancel={onCancelUrlBar}
            onFocus={onFocusUrlBar}
            onBlur={hideAutocomplete}
            connectedAccounts={[]}
            onChangeText={onChangeUrlBar}
            activeUrl={resolvedUrlRef.current}
            setIsUrlBarFocused={setIsUrlBarFocused}
            isUrlBarFocused={isUrlBarFocused}
          />
          <UrlAutocomplete
            ref={autocompleteRef}
            onSelect={onSelect}
            onDismiss={onDismissAutocomplete}
          />
        </View>
      </KeyboardAvoidingView>
    </ErrorBoundary>
  );
};

export default BrowserRecents;
