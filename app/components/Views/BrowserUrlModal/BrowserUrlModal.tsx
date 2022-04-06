import React, { useCallback, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import ReusableModal, { ReusableModalRef } from '../../UI/ReusableModal';
import Icon from 'react-native-vector-icons/FontAwesome';
import { strings } from '../../../../locales/i18n';
import { createStyles } from './styles';
import { useAppThemeFromContext, mockTheme } from '../../../util/theme';
import UrlAutocomplete from '../../UI/UrlAutocomplete';

interface Props {
	onUrlInputSubmit: (inputValue: string | undefined) => void;
	url: string | undefined;
}

const BrowserUrlModal = (props: Props) => {
	const { onUrlInputSubmit, url } = props.route.params;
	const modalRef = useRef<ReusableModalRef | null>(null);
	const { colors, themeAppearance } = useAppThemeFromContext() || mockTheme;
	const styles = createStyles(colors);
	const [autocompleteValue, setAutocompleteValue] = useState<string | undefined>(url);
	const inputRef = useRef<TextInput | null>(null);
	const dismissModal = (cb?: () => void) => modalRef?.current?.dismissModal(cb);

	/** Clear search input and focus */
	const clearSearchInput = useCallback(() => {
		setAutocompleteValue(undefined);
		inputRef.current?.focus?.();
	}, []);

	const triggerClose = () => dismissModal();
	const triggerOnSubmit = () => dismissModal(() => onUrlInputSubmit(autocompleteValue));

	const renderContent = () => (
		<>
			<View style={styles.urlModalContent} testID={'url-modal'}>
				<View style={styles.searchWrapper}>
					<TextInput
						keyboardType="web-search"
						ref={inputRef}
						autoCapitalize="none"
						autoCorrect={false}
						testID={'url-input'}
						onChangeText={setAutocompleteValue}
						onSubmitEditing={triggerOnSubmit}
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
						<TouchableOpacity onPress={clearSearchInput} style={styles.clearButton}>
							<Icon name="times-circle" size={18} color={colors.icon.default} />
						</TouchableOpacity>
					) : null}
				</View>
				<TouchableOpacity style={styles.cancelButton} testID={'cancel-url-button'} onPress={triggerClose}>
					<Text style={styles.cancelButtonText}>{strings('browser.cancel')}</Text>
				</TouchableOpacity>
			</View>
			<UrlAutocomplete onSubmit={triggerOnSubmit} input={autocompleteValue} onDismiss={triggerClose} />
		</>
	);

	return (
		<ReusableModal ref={modalRef} style={styles.screen}>
			{renderContent()}
		</ReusableModal>
	);
};

export default React.memo(BrowserUrlModal);
