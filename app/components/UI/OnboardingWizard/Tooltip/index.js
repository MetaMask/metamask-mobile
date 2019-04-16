import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontStyles } from '../../../../styles/common';
import StyledButton from '../../StyledButton';

const styles = StyleSheet.create({
	tooltip: {
		backgroundColor: colors.primary,
		borderRadius: 5,
		padding: 18
	},
	progress: {
		flexDirection: 'row',
		backgroundColor: colors.primary,
		justifyContent: 'space-between'
	},
	actions: {
		flexDirection: 'column'
	},
	actionButton: {
		width: '100%',
		marginTop: 10
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
		fontSize: 18,
		alignSelf: 'center'
	},
	triangle: {
		width: 0,
		height: 0,
		backgroundColor: colors.transparent,
		borderStyle: 'solid',
		borderLeftWidth: 15,
		borderRightWidth: 15,
		borderBottomWidth: 10,
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
		borderLeftWidth: 15,
		borderRightWidth: 15,
		borderTopWidth: 10,
		borderLeftColor: colors.transparent,
		borderRightColor: colors.transparent,
		borderTopColor: colors.primary,
		position: 'absolute'
	},
	progressButton: {
		width: 75,
		height: 45,
		padding: 5
	},
	leftProgessButton: {
		left: 0
	},
	rightProgessButton: {
		right: 0
	},
	topCenter: {
		marginBottom: 10,
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
		style: PropTypes.object,
		tooltipStyle: PropTypes.object,
		action: PropTypes.bool
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

	renderProgressButtons = () => (
		<View style={styles.progress}>
			<StyledButton
				containerStyle={[styles.progressButton, styles.leftProgessButton]}
				type={'blue'}
				onPress={this.onBack}
			>
				Back
			</StyledButton>
			<StyledButton
				containerStyle={[styles.progressButton, styles.rightProgessButton]}
				type={'normal'}
				onPress={this.onNext}
			>
				Next
			</StyledButton>
		</View>
	);

	renderActionButtons = () => (
		<View style={styles.actions}>
			<StyledButton containerStyle={styles.actionButton} type={'blue'} onPress={this.onBack}>
				No, Thanks
			</StyledButton>
			<StyledButton containerStyle={styles.actionButton} type={'normal'} onPress={this.onNext}>
				Take the tour
			</StyledButton>
		</View>
	);

	render() {
		const { content, title, topIndicatorPosition, bottomIndicatorPosition, action } = this.props;
		const style = this.props.style || {};
		const tooltipStyle = this.props.tooltipStyle || {};
		return (
			<View style={style}>
				{topIndicatorPosition && (
					<View style={this.getIndicatorStyle(topIndicatorPosition)}>
						<View style={styles.triangle} />
					</View>
				)}
				<View style={[styles.tooltip, tooltipStyle]}>
					<View style={styles.titleContainer}>
						<Text style={styles.title}>{title}</Text>
					</View>
					<View style={styles.contentContainer}>
						<Text style={styles.content}>{content}</Text>
					</View>
					{action ? this.renderActionButtons() : this.renderProgressButtons()}
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
