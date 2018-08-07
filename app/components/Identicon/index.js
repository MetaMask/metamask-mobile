import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Image } from 'react-native';
import { toDataUrl } from '../../util/blockies.js';

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
		address: PropTypes.string
	};

	static defaultProps = {
		diameter: 46
	};

	render() {
		const { diameter, address } = this.props;

		return address ? (
			<Image
				source={{ uri: toDataUrl(address) }}
				style={{
					height: diameter,
					width: diameter,
					borderRadius: diameter / 2
				}}
			/>
		) : null;
	}
}
