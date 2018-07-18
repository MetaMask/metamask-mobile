import React, { Component } from 'react';
import {
	Dimensions,
	StyleSheet,
	TextInput,
	View,
	WebView
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { colors } from '../../styles/variables';

export default class App extends Component {
	state = {
		canGoBack: false,
		canGoForward: false,
		inputValue: this.props.defaultUrl,
		url: this.props.defaultUrl
	};

	render() {
		const {
			canGoBack,
			canGoForward,
			inputValue,
			url
		} = this.state;

		return (
			<View style={{ flex: 1 }}>
				<View style={styles.urlBar}>
					<Icon
						disabled={true}
						name="angle-left"
						onPress={() => { this.webview.goBack(); }}
						size={30}
						style={{...styles.icon, ...(!canGoBack ? styles.disabledIcon : {})}}
					/>
					<Icon
						disabled={!canGoForward}
						name="angle-right"
						onPress={() => { this.webview.goForward(); }}
						size={30}
						style={{...styles.icon, ...(!canGoForward ? styles.disabledIcon : {})}}
					/>
					<TextInput
						autoCapitalize="none"
						autoCorrect={false}
						clearButtonMode="while-editing"
						keyboardType="url"
						onChangeText={(inputValue) => { this.setState({ inputValue }); }}
						onSubmitEditing={() => { this.setState({ url: this.state.inputValue }) }}
						placeholder="Enter website address"
						placeholderTextColor={colors.asphalt}
						returnKeyType="go"
						style={styles.urlInput}
						value={inputValue}
					/>
					<Icon
						disabled={!canGoForward}
						name="refresh"
						onPress={() => { this.webview.reload(); }}
						size={20}
						style={styles.icon}
					/>
				</View>
				<WebView
					onNavigationStateChange={({ canGoBack, canGoForward, url }) => {
						this.setState({ canGoBack, canGoForward, inputValue: url });
					}}
					ref={(ref) => { this.webview = ref; }}
					source={{ uri: url }}
					style={{ width: Dimensions.get('window').width }}
				/>
			</View>
		);
	}
}

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
		width: 36,
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
