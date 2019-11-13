import React from 'react';
import PropTypes from 'prop-types';
import { Image, ViewPropTypes } from 'react-native';
import FadeIn from 'react-native-fade-in-image';
// eslint-disable-next-line import/default
import resolveAssetSource from 'react-native/Libraries/Image/resolveAssetSource';
import { SvgCssUri } from 'react-native-svg';

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
		return <SvgCssUri {...props} uri={source.uri} style={style} />;
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
	fadeIn: PropTypes.bool,
	source: PropTypes.any,
	style: ViewPropTypes.style,
	placeholderStyle: ViewPropTypes.style
};

export default RemoteImage;
