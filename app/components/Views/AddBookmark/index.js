import React, { PureComponent } from 'react';
import { SafeAreaView, Text, TextInput, View, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { strings } from '../../../../locales/i18n';
import { colors, fontStyles } from '../../../styles/common';
import ActionView from '../../UI/ActionView';
import { getNavigationOptionsTitle } from '../../UI/Navbar';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
	},
	rowWrapper: {
		padding: 20,
	},
	textInput: {
		borderWidth: 1,
		borderRadius: 4,
		borderColor: colors.grey100,
		padding: 16,
		...fontStyles.normal,
	},
	warningText: {
		color: colors.red,
		...fontStyles.normal,
	},
});

/**
 * Copmonent that provides ability to add a bookmark
 */
export default class AddBookmark extends PureComponent {
	static navigationOptions = ({ navigation }) => getNavigationOptionsTitle(strings('add_favorite.title'), navigation);

	state = {
		title: '',
		url: '',
	};

	static propTypes = {
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object,
		/**
		 * Object that represents the current route info like params passed to it
		 */
		route: PropTypes.object,
	};

	componentDidMount() {
		this.loadInitialValues();
	}

	loadInitialValues() {
		const { route } = this.props;
		this.setState({
			title: route.params?.title ?? '',
			url: route.params?.url ?? '',
		});
	}

	addBookmark = () => {
		const { title, url } = this.state;
		if (title === '' || url === '') return false;
		this.props.route.params.onAddBookmark({ name: title, url });
		this.props.navigation.pop();
	};

	cancelAddBookmark = () => {
		this.props.navigation.pop();
	};

	onTitleChange = (title) => {
		this.setState({ title });
	};

	onUrlChange = (url) => {
		this.setState({ url });
	};

	urlInput = React.createRef();

	jumpToUrl = () => {
		const { current } = this.urlInput;
		current && current.focus();
	};

	render = () => (
		<SafeAreaView style={styles.wrapper} testID={'add-bookmark-screen'}>
			<ActionView
				cancelTestID={'add-bookmark-cancel-button'}
				confirmTestID={'add-bookmark-confirm-button'}
				cancelText={strings('add_favorite.cancel_button')}
				confirmText={strings('add_favorite.add_button')}
				onCancelPress={this.cancelAddBookmark}
				onConfirmPress={this.addBookmark}
			>
				<View>
					<View style={styles.rowWrapper}>
						<Text style={fontStyles.normal}>{strings('add_favorite.title_label')}</Text>
						<TextInput
							style={styles.textInput}
							placeholder={''}
							placeholderTextColor={colors.grey100}
							value={this.state.title}
							onChangeText={this.onTitleChange}
							testID={'add-bookmark-title'}
							onSubmitEditing={this.jumpToUrl}
							returnKeyType={'next'}
						/>
						<Text style={styles.warningText}>{this.state.warningSymbol}</Text>
					</View>
					<View style={styles.rowWrapper}>
						<Text style={fontStyles.normal}>{strings('add_favorite.url_label')}</Text>
						<TextInput
							style={styles.textInput}
							placeholder={''}
							value={this.state.url}
							onChangeText={this.onUrlChange}
							testID={'add-bookmark-url'}
							ref={this.urlInput}
							onSubmitEditing={this.addToken}
							returnKeyType={'done'}
						/>
						<Text style={styles.warningText}>{this.state.warningDecimals}</Text>
					</View>
				</View>
			</ActionView>
		</SafeAreaView>
	);
}
