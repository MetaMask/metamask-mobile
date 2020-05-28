import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import { fontStyles, colors } from '../../../../styles/common';
import { connect } from 'react-redux';

const styles = StyleSheet.create({
	wrapper: {
		margin: 8,
		borderWidth: 1,
		borderColor: colors.blue,
		borderRadius: 8,
		padding: 10,
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center'
	},
	title: {
		...fontStyles.bold,
		fontSize: 14,
		padding: 5
	},
	description: {
		...fontStyles.normal,
		fontSize: 12,
		padding: 5,
		textAlign: 'center',
		color: colors.grey500
	},
	row: {
		alignSelf: 'center'
	},
	icon: {
		marginBottom: 5
	}
});

/**
 * PureComponent that renders a receive action
 */
class ReceiveRequestAction extends PureComponent {
	static propTypes = {
		/**
		 * The navigator object
		 */
		icon: PropTypes.object,
		/**
		 * Action title
		 */
		actionTitle: PropTypes.string,
		/**
		 * Action description
		 */
		actionDescription: PropTypes.string,
		/**
		 * Custom style
		 */
		style: PropTypes.object,
		/**
		 * Callback on press action
		 */
		onPress: PropTypes.func
	};

	render() {
		const { icon, actionTitle, actionDescription, style, onPress } = this.props;
		return (
			<TouchableOpacity onPress={onPress} style={[styles.wrapper, style]}>
				<View style={[styles.row, styles.icon]}>{icon}</View>
				<View style={styles.row}>
					<Text style={styles.title}>{actionTitle}</Text>
				</View>
				<View style={styles.row}>
					<Text numberOfLines={2} style={styles.description}>
						{actionDescription}
					</Text>
				</View>
			</TouchableOpacity>
		);
	}
}

export default connect()(ReceiveRequestAction);
