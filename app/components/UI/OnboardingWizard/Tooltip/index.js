import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontStyles } from '../../../../styles/common';
import StyledButton from '../../StyledButton';

const styles = StyleSheet.create({
	root: {
		backgroundColor: colors.primary,
		marginHorizontal: 55,
		borderRadius: 5,
		padding: 18
	},
	actions: {
		flexDirection: 'row',
		backgroundColor: colors.primary
	},
	button: {
		width: 80,
		height: 30,
		padding: 5
	},
	content: {
		...fontStyles.normal,
		color: colors.white,
		fontSize: 14
	},
	contentContainer: {
		marginVertical: 10
	},
	title: {
		...fontStyles.bold,
		color: colors.white,
		fontSize: 18
	}
});

export default class Tooltip extends Component {
	static propTypes = {
		/**
		 * Object that represents the navigator
		 */
		content: PropTypes.string,
		onClose: PropTypes.func,
		onNext: PropTypes.func,
		onBack: PropTypes.func,
		title: PropTypes.string
	};

	onNext = () => {
		const { onNext } = this.props;
		onNext && onNext();
	};

	onBack = () => {
		const { onBack } = this.props;
		onBack && onBack();
	};

	onClose = () => {
		const { onClose } = this.props;
		onClose && onClose();
	};

	render() {
		const { content, title } = this.props;
		return (
			<View style={styles.root}>
				<View style={styles.titleContainer}>
					<Text style={styles.title}>{title}</Text>
				</View>
				<View style={styles.contentContainer}>
					<Text style={styles.content}>{content}</Text>
				</View>
				<View style={styles.actions}>
					<StyledButton containerStyle={styles.button} type={'orange'} onPress={this.onBack}>
						Back
					</StyledButton>
					<StyledButton containerStyle={styles.button} type={'warning'} onPress={this.onNext}>
						Next
					</StyledButton>
				</View>
			</View>
		);
	}
}
