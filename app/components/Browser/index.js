import React, { Component } from 'react';
import Icon from 'react-native-vector-icons/FontAwesome';
import PropTypes from 'prop-types';
import { Dimensions, StyleSheet, TextInput, View, WebView } from 'react-native';
import { colors, baseStyles } from '../../styles/common';

const styles = StyleSheet.create({
	urlBar: {
		alignItems: 'stretch',
		backgroundColor: colors.concrete,
		flexDirection: 'row',
		paddingVertical: 8
	},
	icon: {
		color: colors.tar,
		flex: 0,
		height: 28,
		lineHeight: 28,
		paddingTop: 2,
		textAlign: 'center',
		width: 36
	},
	disabledIcon: {
		color: colors.ash
	},
	urlInput: {
		backgroundColor: colors.slate,
		borderRadius: 3,
		flex: 1,
		fontSize: 14,
		padding: 8
	}
});

/**
 * Complete Web browser component with URL entry and history management
 */
export default class Browser extends Component {
	static defaultProps = {
		defaultProtocol: 'https://'
	};

	static propTypes = {
		/**
		 * Protocol string to append to URLs that have none
		 */
		defaultProtocol: PropTypes.string,
		/**
		 * Initial URL to load in the WebView
		 */
		defaultURL: PropTypes.string.isRequired
	};

	state = {
		canGoBack: false,
		canGoForward: false,
		inputValue: this.props.defaultURL,
		url: this.props.defaultURL
	};

	webview = React.createRef();

	go = () => {
		const url = this.state.inputValue;
		const hasProtocol = url.match(/^[a-z]*:\/\//);
		const sanitizedURL = hasProtocol ? url : `${this.props.defaultProtocol}${url}`;
		this.setState({ url: sanitizedURL });
	};

	goBack = () => {
		this.webview.current.goBack();
	};

	goForward = () => {
		this.webview.current.goForward();
	};

	reload = () => {
		this.webview.current.reload();
	};

	onPageChange = ({ canGoBack, canGoForward, url }) => {
		this.setState({ canGoBack, canGoForward, inputValue: url });
	};

	onURLChange = inputValue => {
		this.setState({ inputValue });
	};

	render() {
		const { canGoBack, canGoForward, inputValue, url } = this.state;

		return (
			<View style={baseStyles.flexGrow}>
				<View style={styles.urlBar}>
					<Icon
						disabled={!canGoBack}
						name="angle-left"
						onPress={this.goBack}
						size={30}
						style={{ ...styles.icon, ...(!canGoBack ? styles.disabledIcon : {}) }}
					/>
					<Icon
						disabled={!canGoForward}
						name="angle-right"
						onPress={this.goForward}
						size={30}
						style={{ ...styles.icon, ...(!canGoForward ? styles.disabledIcon : {}) }}
					/>
					<TextInput
						autoCapitalize="none"
						autoCorrect={false}
						clearButtonMode="while-editing"
						keyboardType="url"
						onChangeText={this.onURLChange}
						onSubmitEditing={this.go}
						placeholder="Enter website address"
						placeholderTextColor={colors.asphalt}
						returnKeyType="go"
						style={styles.urlInput}
						value={inputValue}
					/>
					<Icon disabled={!canGoForward} name="refresh" onPress={this.reload} size={20} style={styles.icon} />
				</View>
				<WebView
					onNavigationStateChange={this.onPageChange}
					ref={this.webview}
					source={{ uri: url }}
					style={{ width: Dimensions.get('window').width }}
				/>
			</View>
		);
	}
}
