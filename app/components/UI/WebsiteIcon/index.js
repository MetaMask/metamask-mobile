import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text, Image } from 'react-native';
import FadeIn from 'react-native-fade-in-image';
import { colors, fontStyles } from '../../../styles/common';
import { getHost } from '../../../util/browser';
import parseIcon from '../../../util/icon';
import { connect } from 'react-redux';

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
class WebsiteIcon extends PureComponent {
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
		transparent: PropTypes.bool,
		history: PropTypes.array
	};

	state = {
		renderIconUrlError: false,
		apiLogoUrl: null
	};

	componentDidMount = async () => {
		const { url, history } = this.props;
		const match = history.find(element => element.url.indexOf(url) !== -1);
		if (match) {
			const uri = await parseIcon(url, match.head);
			this.setState(() => ({ apiLogoUrl: { uri } }));
		} else {
			this.setState(() => ({ apiLogoUrl: { uri: `https://api.faviconkit.com/${getHost(url)}/64` } }));
		}
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

const mapStateToProps = (state, ownProps) => ({ history: state.browser.history });

export default connect(mapStateToProps)(WebsiteIcon);
