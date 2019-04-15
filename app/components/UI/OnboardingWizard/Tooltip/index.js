import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontStyles } from '../../../../styles/common';
import StyledButton from '../../StyledButton';

const styles = StyleSheet.create({
	root: {
		paddingHorizontal: 55
	},
	tooltip: {
		backgroundColor: colors.primary,
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
	},
	triangle: {
		width: 0,
		height: 0,
		backgroundColor: colors.transparent,
		borderStyle: 'solid',
		borderLeftWidth: 10,
		borderRightWidth: 10,
		borderBottomWidth: 20,
		borderLeftColor: colors.transparent,
		borderRightColor: colors.transparent,
		borderBottomColor: colors.primary,
		position: 'absolute'
	},
	triangleDown: {
		width: 0,
		height: 0,
		backgroundColor: colors.transparent,
		borderStyle: 'solid',
		borderLeftWidth: 10,
		borderRightWidth: 10,
		borderTopWidth: 20,
		borderLeftColor: colors.transparent,
		borderRightColor: colors.transparent,
		borderTopColor: colors.primary,
		position: 'absolute'
	},
	topCenter: {
		marginBottom: 12,
		alignItems: 'center'
	},
	topLeft: {
		marginBottom: 12,
		alignItems: 'flex-start',
		marginLeft: 12
	},
	bottomCenter: {
		marginBottom: 12,
		alignItems: 'center'
	},
	bottomLeft: {
		marginTop: -8,
		alignItems: 'flex-start',
		marginLeft: 12
	}
});

export default class Tooltip extends Component {
	static propTypes = {
		content: PropTypes.string,
		onClose: PropTypes.func,
		onNext: PropTypes.func,
		onBack: PropTypes.func,
		title: PropTypes.string,
		topIndicatorPosition: PropTypes.oneOf(['topCenter', 'topLeft']),
		bottomIndicatorPosition: PropTypes.oneOf(['bottomCenter', 'bottomLeft']),
		style: PropTypes.object
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

	getIndicatorStyle = topIndicatorPosition => {
		const positions = {
			topCenter: styles.topCenter,
			topLeft: styles.topLeft,
			[undefined]: styles.topCenter
		};
		return positions[topIndicatorPosition];
	};

	getBotttomIndicatorStyle = bottomIndicatorPosition => {
		const positions = {
			bottomCenter: styles.bottomCenter,
			bottomLeft: styles.bottomLeft,
			[undefined]: styles.bottomCenter
		};
		return positions[bottomIndicatorPosition];
	};

	render() {
		const { content, title, topIndicatorPosition, bottomIndicatorPosition } = this.props;
		const style = this.props.style || {};
		return (
			<View style={[styles.root, style]}>
				{topIndicatorPosition && (
					<View style={this.getIndicatorStyle(topIndicatorPosition)}>
						<View style={styles.triangle} />
					</View>
				)}
				<View style={styles.tooltip}>
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
				{bottomIndicatorPosition && (
					<View style={this.getBotttomIndicatorStyle(bottomIndicatorPosition)}>
						<View style={styles.triangleDown} />
					</View>
				)}
			</View>
		);
	}
}
