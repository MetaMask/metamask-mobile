import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Text, StyleSheet, View } from 'react-native';
import WebsiteIcon from '../../../../UI/WebsiteIcon';
import { colors, fontStyles } from '../../../../../styles/common';

const styles = StyleSheet.create({
	wrapper: {
		padding: 18,
		flex: 1,
		flexDirection: 'row'
	},
	icon: {
		height: 35,
		width: 35
	},
	iconWrapper: {
		borderWidth: 2,
		borderRadius: 10,
		height: 88,
		width: 88,
		borderColor: colors.lightGray,
		alignItems: 'center',
		justifyContent: 'center',
		shadowOpacity: 0.2
	},
	contentWrapper: {
		paddingHorizontal: 18
	},
	name: {
		fontSize: 16,
		marginBottom: 7,
		...fontStyles.bold
	},
	description: {
		...fontStyles.normal
	}
});

/**
 * Favorites
 */
export default class FavoriteItem extends Component {
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
		url: PropTypes.string
	};

	render() {
		const { name, url, description } = this.props;
		return (
			<View style={styles.wrapper}>
				<View style={styles.iconWrapper} elevation={5}>
					<WebsiteIcon style={styles.icon} title={name} url={url} />
				</View>
				<View style={styles.contentWrapper}>
					<Text style={styles.name}>{name}</Text>
					<Text style={styles.description}>{description}</Text>
				</View>
			</View>
		);
	}
}
