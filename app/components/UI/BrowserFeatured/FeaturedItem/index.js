import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Text, StyleSheet, View, PixelRatio } from 'react-native';
import WebsiteIcon from '../../WebsiteIcon';
import { colors, fontStyles } from '../../../../styles/common';

const styles = StyleSheet.create({
	wrapper: {
		padding: 15,
		flex: 1,
		flexDirection: 'row'
	},
	icon: {
		height: PixelRatio.getPixelSizeForLayoutSize(15),
		width: PixelRatio.getPixelSizeForLayoutSize(15)
	},
	iconWrapper: {
		borderRadius: 8,
		height: 88,
		width: 88,
		backgroundColor: colors.white,
		alignItems: 'center',
		justifyContent: 'center',
		shadowOpacity: 0.25,
		shadowOffset: {
			width: 0,
			height: 0
		},
		elevation: 5
	},
	contentWrapper: {
		flex: 1,
		paddingHorizontal: 18
	},
	name: {
		fontSize: 16,
		marginBottom: 7,
		...fontStyles.bold
	},
	description: {
		fontSize: 14,
		...fontStyles.normal
	}
});

/**
 * Featured item to be rendered
 */
export default class FeaturedItem extends PureComponent {
	static propTypes = {
		/**
		 * Dapp description
		 */
		description: PropTypes.string,
		/**
		 * Dapp name
		 */
		name: PropTypes.string,
		/**
		 * Dapp url
		 */
		url: PropTypes.string,
		/**
		 * Dapp image url, could be undefined
		 */
		imageUrl: PropTypes.string
	};

	render() {
		const { name, url, description, imageUrl } = this.props;
		return (
			<View style={styles.wrapper}>
				<View style={styles.iconWrapper}>
					<WebsiteIcon style={styles.icon} title={name} url={imageUrl || url} />
				</View>
				<View style={styles.contentWrapper}>
					<Text style={styles.name}>{name}</Text>
					<Text style={styles.description} numberOfLines={3}>
						{description}
					</Text>
				</View>
			</View>
		);
	}
}
