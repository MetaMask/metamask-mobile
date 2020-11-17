import React from 'react';
import PropTypes from 'prop-types';
import { View, Image, ViewPropTypes } from 'react-native';
import FadeIn from 'react-native-fade-in-image';
// eslint-disable-next-line import/default
import resolveAssetSource from 'react-native/Libraries/Image/resolveAssetSource';
import { SvgCssUri } from 'react-native-svg';
import ComponentErrorBoundary from '../../UI/ComponentErrorBoundary';

const RemoteImage = props => {
	const source = resolveAssetSource(props.source);
	if (source && (source.uri && source.uri.match('.svg'))) {
		const style = props.style || {};
		if (source.__packager_asset && typeof style !== 'number') {
			if (!style.width) {
				style.width = source.width;
			}
			if (!style.height) {
				style.height = source.height;
			}
		}
		return (
			<ComponentErrorBoundary onError={props.onError} componentLabel="RemoteImage-SVG">
				<View style={style}>
					<SvgCssUri {...props} uri={source.uri} width={'100%'} height={'100%'} />
				</View>
			</ComponentErrorBoundary>
		);
	}

	if (props.fadeIn) {
		return (
			<FadeIn placeholderStyle={props.placeholderStyle}>
				<Image {...props} />
			</FadeIn>
		);
	}
	return <Image {...props} />;
};

RemoteImage.propTypes = {
	/**
	 * Flag that determines the fade in behavior
	 */
	fadeIn: PropTypes.bool,
	/**
	 * Source of the image
	 */
	source: PropTypes.any,
	/**
	 * Style for the image
	 */
	style: ViewPropTypes.style,
	/**
	 * Style for the placeholder (used for fadeIn)
	 */
	placeholderStyle: ViewPropTypes.style,
	/**
	 * Called when there is an error
	 */
	onError: PropTypes.func
};

export default RemoteImage;
