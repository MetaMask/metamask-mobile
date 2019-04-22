import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Animated, View, Text, StyleSheet } from 'react-native';
import { colors, fontStyles } from '../../../../styles/common';
import StyledButton from '../../StyledButton';

const styles = StyleSheet.create({
	coachmark: {
		backgroundColor: colors.blue,
		borderRadius: 8,
		padding: 18
	},
	progress: {
		flexDirection: 'row',
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
		borderBottomColor: colors.blue,
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
		borderTopColor: colors.blue,
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
		marginBottom: 10,
		alignItems: 'flex-start',
		marginLeft: 30
	},
	topLeftCorner: {
		marginBottom: 10,
		alignItems: 'flex-start',
		marginLeft: 12
	},
	bottomCenter: {
		marginBottom: 10,
		alignItems: 'center'
	},
	bottomLeft: {
		marginBottom: 10,
		alignItems: 'flex-start',
		marginLeft: 30
	},
	circle: {
		width: 7,
		height: 7,
		borderRadius: 7 / 2,
		backgroundColor: colors.white,
		opacity: 0.4,
		margin: 5
	},
	solidCircle: {
		opacity: 1
	},
	progessContainer: {
		flexDirection: 'row',
		alignSelf: 'center'
	}
});

export default class Coachmark extends Component {
	static propTypes = {
		content: PropTypes.string,
		onClose: PropTypes.func,
		onNext: PropTypes.func,
		onBack: PropTypes.func,
		title: PropTypes.string,
		topIndicatorPosition: PropTypes.oneOf(['topCenter', 'topLeft', 'topLeftCorner']),
		bottomIndicatorPosition: PropTypes.oneOf(['bottomCenter', 'bottomLeft']),
		style: PropTypes.object,
		coachmarkStyle: PropTypes.object,
		action: PropTypes.bool,
		currentStep: PropTypes.number
	};

	state = {
		ready: false
	};

	opacity = new Animated.Value(0);

	componentDidMount = () => {
		Animated.timing(this.opacity, {
			toValue: 1,
			duration: 1000,
			useNativeDriver: true,
			isInteraction: false
		}).start();
	};

	componentWillUnmount = () => {
		Animated.timing(this.opacity, {
			toValue: 0,
			duration: 1000,
			useNativeDriver: true,
			isInteraction: false
		}).start();
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
			topLeftCorner: styles.topLeftCorner,
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

	renderProgressButtons = () => {
		const { currentStep } = this.props;
		return (
			<View style={styles.progress}>
				<StyledButton
					containerStyle={[styles.progressButton, styles.leftProgessButton]}
					type={'transparent'}
					onPress={this.onBack}
				>
					Back
				</StyledButton>
				<View style={styles.progessContainer}>
					<View style={[styles.circle, currentStep === 1 ? styles.solidCircle : {}]} />
					<View style={[styles.circle, currentStep === 2 ? styles.solidCircle : {}]} />
					<View style={[styles.circle, currentStep === 3 ? styles.solidCircle : {}]} />
					<View style={[styles.circle, currentStep === 4 ? styles.solidCircle : {}]} />
					<View style={[styles.circle, currentStep === 5 ? styles.solidCircle : {}]} />
				</View>

				<StyledButton
					containerStyle={[styles.progressButton, styles.rightProgessButton]}
					type={'normal'}
					onPress={this.onNext}
				>
					Got it!
				</StyledButton>
			</View>
		);
	};

	renderActionButtons = () => (
		<View style={styles.actions}>
			<StyledButton containerStyle={styles.actionButton} type={'transparent'} onPress={this.onBack}>
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
		const coachmarkStyle = this.props.coachmarkStyle || {};
		return (
			<Animated.View style={[style, { opacity: this.opacity }]}>
				{topIndicatorPosition && (
					<View style={this.getIndicatorStyle(topIndicatorPosition)}>
						<View style={styles.triangle} />
					</View>
				)}
				<View style={[styles.coachmark, coachmarkStyle]}>
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
			</Animated.View>
		);
	}
}
