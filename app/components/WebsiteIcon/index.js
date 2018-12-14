import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text, Image } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import URL from 'url-parse';

const styles = StyleSheet.create({
	fallback: {
		alignContent: 'center',
		backgroundColor: colors.gray,
		borderRadius: 27,
		height: 54,
		justifyContent: 'center',
		width: 54
	},
	fallbackText: {
		...fontStyles.normal,
		color: colors.white,
		fontSize: 24,
		textAlign: 'center'
	}
});

/**
 * View that renders a website logo depending of the context
 */
export default class WebsiteIcon extends Component {
	static propTypes = {
		/**
		 * Style object for image
		 */
		style: PropTypes.object,
		/**
		 * Style object for main view
		 */
		viewStyle: PropTypes.object,
		/**
		 * Style object for text in case url not found
		 */
		textStyle: PropTypes.object,
		/**
		 * String corresponding to website title
		 */
		title: PropTypes.string,
		/**
		 * String corresponding to website url
		 */
		url: PropTypes.string
	};

	state = {
		renderIconUrlError: false
	};

	componentDidMount = () => {
		this.getIconUrl(this.props.url);
	};

	getHost(url) {
		const urlObj = new URL(url);
		const { hostname } = urlObj;
		return hostname;
	}

	getIconUrl = url => {
		const iconUrl = `https://api.faviconkit.com/${this.getHost(url)}/64`;
		this.setState({ apiLogoUrl: { uri: iconUrl } });
	};

	onRenderIconUrlError = async () => {
		await this.setState({ renderIconUrlError: true });
	};

	render = () => {
		const { viewStyle, style, title, textStyle } = this.props;
		const { apiLogoUrl, renderIconUrlError } = this.state;
		return (
			<View>
				{!renderIconUrlError && (
					<View style={viewStyle}>
						<Image source={apiLogoUrl} style={style} onError={this.onRenderIconUrlError} />
					</View>
				)}
				{renderIconUrlError && (
					<View style={viewStyle}>
						<View style={[styles.fallback, style]}>
							<Text style={[styles.fallbackText, textStyle]}>{title.substring(0, 1).toUpperCase()}</Text>
						</View>
					</View>
				)}
			</View>
		);
	};
}
