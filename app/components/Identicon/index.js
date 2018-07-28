import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Image } from 'react-native';
import { toDataUrl } from '../../util/blockies.js';

export default class IdenticonComponent extends Component {
	static propTypes = {
		diameter: PropTypes.number,
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
