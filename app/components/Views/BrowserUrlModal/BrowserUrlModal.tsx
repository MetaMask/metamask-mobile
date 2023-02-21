import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  InteractionManager,
  Platform,
} from 'react-native';
import ReusableModal, { ReusableModalRef } from '../../UI/ReusableModal';
import Icon from 'react-native-vector-icons/FontAwesome';
import { strings } from '../../../../locales/i18n';
import { createStyles } from './styles';
import { useTheme } from '../../../util/theme';
import UrlAutocomplete from '../../UI/UrlAutocomplete';
import { BROWSER_URL_MODAL_ID } from '../../../constants/test-ids';
import {
  createNavigationDetails,
  useParams,
} from '../../../util/navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';
import Device from '../../../util/device';
import generateTestId from '../../../../wdio/utils/generateTestId';
import { URL_CLEAR_ICON } from '../../../../wdio/screen-objects/testIDs/BrowserScreen/AddressBar.testIds';

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

  const triggerClose = useCallback(() => dismissModal(), [dismissModal]);
  const triggerOnSubmit = useCallback(
    (val: string) => dismissModal(() => onUrlInputSubmit(val)),
    [dismissModal, onUrlInputSubmit],
  );

  const renderContent = () => (
    <>
      <View style={styles.urlModalContent} testID={BROWSER_URL_MODAL_ID}>
        <View style={styles.searchWrapper}>
          <TextInput
            keyboardType="web-search"
            ref={inputRef}
            autoCapitalize="none"
            autoCorrect={false}
            testID={'url-input'}
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
            >
              <Icon
                name="times-circle"
                size={18}
                color={colors.icon.default}
                {...generateTestId(Platform, URL_CLEAR_ICON)}
              />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.cancelButton}
          testID={'cancel-url-button'}
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
