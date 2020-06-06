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
			// eslint-disable-next-line no-empty-function
			errorHandler: (level, msg) => {},
			locator: {}
		}).parseFromString(html, 'text/html');
	};

	/**
	 * parse a size int from string eg: "192x192" -> 192
	 */
	parseSize = sizes => {
		const from = sizes.indexOf('x');
		return parseInt(sizes.substr(0, from)) || null;
	};

	/**
	 * Format href (needed because assets can be relative or absolute)
	 */
	formatHref = bestIcon => {
		const { url } = this.props;
		const href = bestIcon.getAttribute('href') || false;

		const PROTOCOL = '://';

		const hrefFrom = href.indexOf(PROTOCOL);
		const protocolFrom = url.indexOf(PROTOCOL);
		const protocol = url.substr(0, protocolFrom);
		const host = getHost(url);

		return hrefFrom === -1 ? `${protocol}${PROTOCOL}${host}${href}` : href;
	};

	/**
	 * Find the best icon based on sizes attribute
	 */
	findBestIcon = (acc, curr) => {
		const curr_sizes = curr.getAttribute('sizes');
		const acc_sizes = acc.getAttribute('sizes');
		const curr_size = this.parseSize(curr_sizes);
		const acc_size = this.parseSize(acc_sizes);
		return acc_size > curr_size ? acc : curr;
	};

	/**
	 * Attempt to fetch icon from document and fall back to faviconkit if we have to
	 */
	fetchIcon = async () => {
		const { url } = this.props;
		const doc = await this.getDocument();

		// get all <link> tags
		const nodeList = doc.getElementsByTagName('link');

		// collect all <link>'s into an array for filtering
		const links = Array.from(nodeList);

		// icons based on size attribute
		const sizedIcons = links.filter(el => el.hasAttribute('sizes'));

		// all icons (based on rel key containing "icon")
		const allIcons = links.filter(el => el.hasAttribute('rel') && /icon/.test(el.getAttribute('rel')));

		// since we can't determine what's best, just pick one
		const anyIcon = allIcons.pop();

		// bestIcon from above based on if there are sizedIcons or not
		const bestIcon = (sizedIcons.length ? sizedIcons.reduce(this.findBestIcon) : anyIcon) || null;

		// !bestIcon && console.log('no best icon ;(');

		// fall back to faviconkit if we absolutely have to (meaning there's only a .ico resource)
		const fallback = `https://api.faviconkit.com/${getHost(url)}/64`;
		const uri = bestIcon ? this.formatHref(bestIcon) : fallback;

		return uri;
	};

	componentDidMount = async () => {
		const { renderIconUrlError } = this.state;
		const uri = await this.fetchIcon();
		this.setState(() => (renderIconUrlError ? { renderIconUrlError: true } : { apiLogoUrl: { uri } }));
	};

	/**
	 * Sets component state to renderIconUrlError to render placeholder image
	 */
	onRenderIconUrlError = async () => {
		await this.setState({ renderIconUrlError: true });
	};

	getFormattedTitle = () => {
		const { url, title } = this.props;
		const title_host = title || getHost(url);
		return title_host.substr(0, 1);
	};

	render = () => {
		const {
			state: { renderIconUrlError, apiLogoUrl },
			props: { viewStyle, style, textStyle, transparent },
			getFormattedTitle,
			onRenderIconUrlError
		} = this;

		const title = getFormattedTitle();

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
				<FadeIn placeholderStyle={{ backgroundColor: transparent ? colors.transparent : colors.white }}>
					<Image source={apiLogoUrl} style={style} onError={onRenderIconUrlError} />
				</FadeIn>
			</View>
		);
	};
}
