import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Image } from 'react-native';
import { toDataUrl } from '../../util/blockies.js';
import FadeIn from 'react-native-fade-in-image';
import { colors } from '../../styles/common.js';

/**
 * UI component that renders an Identicon
 * for now it's just a blockie
 * but we could add more types in the future
 */
export default class IdenticonComponent extends Component {
	static propTypes = {
		/**
		 * Diameter that represents the size of the identicon
		 */
		diameter: PropTypes.number,
		/**
		 * Address used to render a specific identicon
		 */
		address: PropTypes.string,
		/**
		 * Custom style to apply to image
		 */
		customStyle: PropTypes.object
	};

	static defaultProps = {
		diameter: 46
	};

	shouldComponentUpdate(nextProps) {
		return nextProps.address !== this.props.address;
	}

	render = () => {
		const { diameter, address, customStyle } = this.props;

		return address ? (
			<FadeIn placeholderStyle={{ backgroundColor: colors.white }}>
				<Image
					source={{ uri: toDataUrl(address) }}
					style={[
						{
							height: diameter,
							width: diameter,
							borderRadius: diameter / 2
						},
						customStyle
					]}
				/>
			</FadeIn>
		) : null;
	};
}
