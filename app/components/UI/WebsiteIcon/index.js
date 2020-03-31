import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text, Image } from 'react-native';
import FadeIn from 'react-native-fade-in-image';
import { colors, fontStyles } from '../../../styles/common';
import { getHost } from '../../../util/browser';
import { DOMParser } from 'react-native-html-parser';

const styles = StyleSheet.create({
	fallback: {
		alignContent: 'center',
		backgroundColor: colors.grey400,
		borderRadius: 27,
		height: 54,
		justifyContent: 'center',
		width: 54
	},
	fallbackText: {
		...fontStyles.normal,
		color: colors.white,
		fontSize: 24,
		textAlign: 'center',
		textTransform: 'uppercase'
	}
});

/**
 * View that renders a website logo depending of the context
 */
export default class WebsiteIcon extends PureComponent {
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
		url: PropTypes.string,
		/**
		 * Flag that determines if the background
		 * should be transaparent or not
		 */
		transparent: PropTypes.bool
	};

	state = {
		renderIconUrlError: false,
		apiLogoUrl: null
	};

	/**
	 * Get and parse HTML
	 */
	getDocument = async () => {
		const { url } = this.props;

		const response = await fetch(url);
		const html = await response.text();

		return new DOMParser({
			locator: {},
			errorHandler: (level, msg) => {
				console.log(level, msg);
			}
		}).parseFromString(html, 'text/html');
	};

	componentDidMount = async () => {
		const { url } = this.props;
		const protocol = url.split('://')[0];

		const doc = await this.getDocument();

		// get all <link> tags
		const nodeList = doc.getElementsByTagName('link');

		// collect all <link>'s into an array for filtering
		const links = [];
		for (let i = 0; i < nodeList.length; i++) {
			links.push(nodeList[i]);
		}

		// filter out non icons (like stylesheets)
		const icons = links.filter(el => {
			const sizes = el.getAttribute('sizes');
			return sizes && el;
		});

		this.setState({
			apiLogoUrl: { uri: `${protocol}://${this.getBestIcon(icons, url)}` }
		});
	};

	/**
	 * Get the best favicon available based on size
	 */
	getBestIcon = (icons, siteUrl) => {
		let size = 0;
		let icon;
		const host = getHost(siteUrl);

		icons.forEach(_icon => {
			const sizes = _icon.getAttribute('sizes');
			const _size = parseInt(sizes.split('x')[0]);
			if (_size > size) {
				size = _size;
				icon = _icon;
			}
		});
		let href = icon.getAttribute('href');
		if (!href.indexOf(host) >= 0) {
			href = host + href;
		}

		return href;
	};

	/**
	 * Sets component state to renderIconUrlError to render placeholder image
	 */
	onRenderIconUrlError = async () => {
		await this.setState({ renderIconUrlError: true });
	};

	render = () => {
		const { renderIconUrlError, apiLogoUrl } = this.state;
		const { viewStyle, style, textStyle, transparent, url } = this.props;
		const title = typeof this.props.title === 'string' ? this.props.title.substr(0, 1) : getHost(url).substr(0, 1);

		if (renderIconUrlError && title) {
			return (
				<View style={viewStyle}>
					<View style={[styles.fallback, style]}>
						<Text style={[styles.fallbackText, textStyle]}>{title}</Text>
					</View>
				</View>
			);
		}

		return (
			<View style={viewStyle}>
				{apiLogoUrl ? (
					<FadeIn placeholderStyle={{ backgroundColor: transparent ? colors.transparent : colors.white }}>
						<Image source={apiLogoUrl} style={style} onError={this.onRenderIconUrlError} />
					</FadeIn>
				) : null}
			</View>
		);
	};
}
