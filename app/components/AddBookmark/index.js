import React, { Component } from 'react';
import { Text, TextInput, View, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { strings } from '../../../locales/i18n';
import { colors, fontStyles } from '../../styles/common';
import ActionView from '../ActionView';
import Screen from '../Screen';
import { getModalNavbarOptions } from '../Navbar';

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
	},
	warningText: {
		color: colors.error,
		...fontStyles.normal
	}
});

/**
 * Copmonent that provides ability to add a bookmark
 */
export default class AddBookmark extends Component {
	static navigationOptions = () => ({ navigation }) =>
		getModalNavbarOptions(strings('addBookmark.title'), navigation);

	state = {
		title: '',
		url: ''
	};

	static propTypes = {
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object
	};

	componentDidMount() {
		this.loadInitialValues();
	}

	loadInitialValues() {
		const { navigation } = this.props;
		this.setState({
			title: navigation.getParam('title', ''),
			url: navigation.getParam('url', '')
		});
	}

	addBookmark = () => {
		const { title, url } = this.state;
		if (title === '' || url === '') return false;
		this.props.navigation.state.params.onAddBookmark({ name: title, url });
		this.props.navigation.goBack();
	};

	cancelAddBookmark = () => {
		this.props.navigation.goBack();
	};

	onTitleChange = title => {
		this.setState({ title });
	};

	onUrlChange = url => {
		this.setState({ url });
	};

	urlInput = React.createRef();

	jumpToUrl = () => {
		const { current } = this.urlInput;
		current && current.focus();
	};

	render() {
		return (
			<Screen>
				<View style={styles.wrapper} testID={'add-bookmark-screen'}>
					<ActionView
						cancelTestID={'add-bookmark-cancel-button'}
						confirmTestID={'add-bookmark-confirm-button'}
						cancelText={strings('addBookmark.cancelButton')}
						confirmText={strings('addBookmark.addButton')}
						onCancelPress={this.cancelAddBookmark}
						onConfirmPress={this.addBookmark}
					>
						<View style={styles.rowWrapper}>
							<Text style={fontStyles.normal}>{strings('addBookmark.titleLabel')}</Text>
							<TextInput
								style={styles.textInput}
								placeholder={''}
								value={this.state.title}
								onChangeText={this.onTitleChange}
								testID={'add-bookmark-title'}
								onSubmitEditing={this.jumpToUrl}
								returnKeyType={'next'}
							/>
							<Text style={styles.warningText}>{this.state.warningSymbol}</Text>
						</View>
						<View style={styles.rowWrapper}>
							<Text style={fontStyles.normal}>{strings('addBookmark.urlLabel')}</Text>
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
					</ActionView>
				</View>
			</Screen>
		);
	}
}
