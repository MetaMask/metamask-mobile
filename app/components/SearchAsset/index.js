import React, { Component } from 'react';
import { TextInput, View, StyleSheet } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import PropTypes from 'prop-types';
import { strings } from '../../../locales/i18n';
import ActionView from '../ActionView';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	rowWrapper: {
		padding: 20
	},
	textInput: {
		borderWidth: 1,
		borderRadius: 4,
		borderColor: colors.borderColor,
		padding: 16,
		...fontStyles.normal
	}
});

/**
 * Component that provides ability to add searched assets with metadata.
 */
export default class SearchAsset extends Component {
	state = { token: '' };

	static propTypes = {
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object
	};

	onTokenChange = token => {
		this.setState({ token });
	};

	cancelAddToken = () => {
		this.props.navigation.goBack();
	};

	render() {
		return (
			<View style={styles.wrapper} testID={'search-token-screen'}>
				<ActionView
					cancelText={strings('addAsset.tokens.cancel_add_token')}
					confirmText={strings('addAsset.tokens.add_token')}
					onCancelPress={this.cancelAddToken}
					onConfirmPress={this.cancelAddToken}
				>
					<View style={styles.rowWrapper}>
						<TextInput
							style={styles.textInput}
							value={this.state.token}
							placeholder={strings('token.search_tokens_placeholder')}
							onChangeText={this.onTokenChange}
							testID={'input-search-asset'}
						/>
					</View>
				</ActionView>
			</View>
		);
	}
}
