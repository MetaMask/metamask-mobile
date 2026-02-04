import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ImageSourcePropType,
} from 'react-native';
import { useSelector } from 'react-redux';
import { processUrlForBrowser } from '../../../util/browser';
import Device from '../../../util/device';
import ErrorBoundary from '../ErrorBoundary';
import { useNavigation } from '@react-navigation/native';
import { useStyles } from '../../hooks/useStyles';
import styleSheet from './styles';
import { type RootState } from '../../../reducers';
import { type DiscoveryTabProps } from './types';
import { StackNavigationProp } from '@react-navigation/stack';
import BrowserUrlBar, {
  BrowserUrlBarRef,
  ConnectionType,
} from '../../UI/BrowserUrlBar';
import UrlAutocomplete, {
  AutocompleteSearchResult,
  UrlAutocompleteRef,
} from '../../UI/UrlAutocomplete';
import { TokenDiscovery } from '../TokenDiscovery';
import { noop } from 'lodash';
import { selectSearchEngine } from '../../../reducers/browser/selectors';
import BrowserBottomBar from '../../UI/BrowserBottomBar';
import { SessionENSNames } from '../BrowserTab/types';

// Stable empty references to prevent unnecessary re-renders
const EMPTY_SESSION_ENS_NAMES: SessionENSNames = {};
const EMPTY_FAVICON: ImageSourcePropType = { uri: '' };

/**
 * Tab component for the in-app browser
 */
const DiscoveryTabPure: React.FC<DiscoveryTabProps> = ({
  id: tabId,
  showTabs,
  newTab,
  updateTabInfo,
}) => {
  // This any can be removed when react navigation is bumped to v6 - issue https://github.com/react-navigation/react-navigation/issues/9037#issuecomment-735698288
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { styles } = useStyles(styleSheet, {});
  const [isUrlBarFocused, setIsUrlBarFocused] = useState(false);
  const urlBarRef = useRef<BrowserUrlBarRef>(null);
  const autocompleteRef = useRef<UrlAutocompleteRef>(null);
  /**
   * Is the current tab the active tab
   */
  const isTabActive = useSelector(
    (state: RootState) => state.browser.activeTab === tabId,
  );

  /**
   * Hide the autocomplete results
   */
  const hideAutocomplete = useCallback(
    () => autocompleteRef.current?.hide(),
    [],
  );

  const searchEngine = useSelector(selectSearchEngine);

  const onSubmitEditing = useCallback(
    async (text: string) => {
      const trimmedText = text.trim();
      if (!trimmedText) return;
      hideAutocomplete();
      // Format url for browser to be navigatable by webview
      const processedUrl = processUrlForBrowser(trimmedText, searchEngine);
      updateTabInfo(tabId, { url: processedUrl });
    },
    [searchEngine, updateTabInfo, tabId, hideAutocomplete],
  );

  /**
   * Handle autocomplete selection
   */
  const onSelect = useCallback(
    (item: AutocompleteSearchResult) => {
      // Unfocus the url bar and hide the autocomplete results
      urlBarRef.current?.hide();
      // Only navigate if the item has a URL (Sites, Recents, Favorites)
      // Tokens, Perps, and Predictions don't have URLs and are handled elsewhere
      if ('url' in item) {
        onSubmitEditing(item.url);
      }
    },
    [onSubmitEditing],
  );

  /**
   * Handle autocomplete dismissal
   */
  const onDismissAutocomplete = useCallback(() => {
    // Unfocus the url bar and hide the autocomplete results
    urlBarRef.current?.hide();
  }, []);

  const onCancelUrlBar = useCallback(() => {
    hideAutocomplete();
    urlBarRef.current?.setNativeProps({ text: '' });
  }, [hideAutocomplete]);

  const onFocusUrlBar = useCallback(() => {
    // Show the autocomplete results
    autocompleteRef.current?.show();
  }, []);

  const onChangeUrlBar = useCallback((text: string) => {
    // Search the autocomplete results
    autocompleteRef.current?.search(text);
  }, []);

  // Memoized callbacks and values for BrowserBottomBar to prevent re-renders
  const getMaskedUrl = useCallback(
    (url: string, _sessionENSNames: SessionENSNames) => url,
    [],
  );

  const openNewTabCallback = useCallback(() => newTab(), [newTab]);

  /**
   * Render the bottom (navigation/options) bar
   * Note: DiscoveryTab uses minimal browser bar functionality
   */
  const renderBottomBar = useCallback(
    () =>
      isTabActive && !isUrlBarFocused ? (
        <BrowserBottomBar
          canGoBack={false}
          canGoForward={false}
          openNewTab={openNewTabCallback}
          activeUrl=""
          getMaskedUrl={getMaskedUrl}
          title=""
          sessionENSNames={EMPTY_SESSION_ENS_NAMES}
          favicon={EMPTY_FAVICON}
        />
      ) : null,
    [isTabActive, isUrlBarFocused, openNewTabCallback, getMaskedUrl],
  );

  /**
   * Main render
   */
  return (
    <ErrorBoundary navigation={navigation} view="DiscoveryTab">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.wrapper, !isTabActive && styles.hide]}
      >
        <View
          style={styles.wrapper}
          {...(Device.isAndroid() ? { collapsable: false } : {})}
        >
          <BrowserUrlBar
            ref={urlBarRef}
            connectionType={ConnectionType.UNKNOWN}
            onSubmitEditing={onSubmitEditing}
            onCancel={onCancelUrlBar}
            onFocus={onFocusUrlBar}
            onChangeText={onChangeUrlBar}
            setIsUrlBarFocused={setIsUrlBarFocused}
            isUrlBarFocused={isUrlBarFocused}
            onBlur={noop}
            activeUrl=""
            connectedAccounts={[]}
            showTabs={showTabs}
          />
          <View style={styles.wrapper}>
            <View style={styles.webview}>
              <TokenDiscovery />
            </View>
            <UrlAutocomplete
              ref={autocompleteRef}
              onSelect={onSelect}
              onDismiss={onDismissAutocomplete}
            />
          </View>
          {renderBottomBar()}
        </View>
      </KeyboardAvoidingView>
    </ErrorBoundary>
  );
};

export const DiscoveryTab = React.memo(DiscoveryTabPure);
DiscoveryTab.displayName = 'DiscoveryTab';

export default DiscoveryTab;
