import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  InteractionManager,
} from 'react-native';
import ReusableModal, { ReusableModalRef } from '../../UI/ReusableModal';
import Icon from 'react-native-vector-icons/FontAwesome';
import { strings } from '../../../../locales/i18n';
import { createStyles } from './styles';
import { useTheme } from '../../../util/theme';
import UrlAutocomplete from '../../UI/UrlAutocomplete';
import { BrowserUrlModalSelectorsIDs } from '../../../../e2e/selectors/Modals/BrowserUrlModal.selectors';
import {
  createNavigationDetails,
  useParams,
} from '../../../util/navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';
import Device from '../../../util/device';

import { BrowserURLBarSelectorsIDs } from '../../../../e2e/selectors/Browser/BrowserURLBar.selectors';
export interface BrowserUrlParams {
  onUrlInputSubmit: (inputValue: string | undefined) => void;
  url: string | undefined;
}

export const createBrowserUrlModalNavDetails =
  createNavigationDetails<BrowserUrlParams>(Routes.BROWSER.URL_MODAL);

const BrowserUrlModal = () => {
  const { onUrlInputSubmit, url } = useParams<BrowserUrlParams>();
  const modalRef = useRef<ReusableModalRef | null>(null);
  const { colors, themeAppearance } = useTheme();
  const styles = createStyles(colors);
  const [autocompleteValue, setAutocompleteValue] = useState<
    string | undefined
  >(url);
  const inputRef = useRef<TextInput | null>(null);
  const dismissModal = useCallback(
    (callback?: () => void) => modalRef?.current?.dismissModal(callback),
    [],
  );

  /** Clear search input and focus */
  const clearSearchInput = useCallback(() => {
    setAutocompleteValue(undefined);
    inputRef.current?.focus?.();
  }, []);

  useEffect(() => {
    InteractionManager.runAfterInteractions(() => {
      // Needed to focus the input after modal renders on Android
      inputRef.current?.focus?.();
      // Needed to manually selectTextOnFocus on iOS
      // https://github.com/facebook/react-native/issues/30585
      if (Device.isIos()) {
        if (inputRef.current && autocompleteValue) {
          inputRef.current.setNativeProps({
            selection: { start: 0, end: autocompleteValue.length },
          });
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerClose = useCallback(() => dismissModal(), [dismissModal]);
  const triggerOnSubmit = useCallback(
    (val: string) => dismissModal(() => onUrlInputSubmit(val)),
    [dismissModal, onUrlInputSubmit],
  );

  const renderContent = () => (
    <>
      <View
        style={styles.urlModalContent}
        testID={BrowserUrlModalSelectorsIDs.CONTAINER}
      >
        <View style={styles.searchWrapper}>
          <TextInput
            keyboardType="web-search"
            ref={inputRef}
            autoCapitalize="none"
            autoCorrect={false}
            testID={BrowserURLBarSelectorsIDs.URL_INPUT}
            onChangeText={setAutocompleteValue}
            onSubmitEditing={() => triggerOnSubmit(autocompleteValue || '')}
            placeholder={strings('autocomplete.placeholder')}
            placeholderTextColor={colors.text.muted}
            returnKeyType="go"
            style={styles.urlInput}
            value={autocompleteValue}
            selectTextOnFocus
            keyboardAppearance={themeAppearance}
            autoFocus
          />
          {autocompleteValue ? (
            <TouchableOpacity
              onPress={clearSearchInput}
              style={styles.clearButton}
              testID={BrowserURLBarSelectorsIDs.URL_CLEAR_ICON}
            >
              <Icon name="times-circle" size={18} color={colors.icon.default} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.cancelButton}
          testID={BrowserURLBarSelectorsIDs.CANCEL_BUTTON_ON_BROWSER_ID}
          onPress={triggerClose}
        >
          <Text style={styles.cancelButtonText}>
            {strings('browser.cancel')}
          </Text>
        </TouchableOpacity>
      </View>
      <UrlAutocomplete
        onSubmit={triggerOnSubmit}
        input={autocompleteValue}
        onDismiss={triggerClose}
      />
    </>
  );

  return (
    <ReusableModal ref={modalRef} style={styles.screen}>
      {renderContent()}
    </ReusableModal>
  );
};

export default React.memo(BrowserUrlModal);
