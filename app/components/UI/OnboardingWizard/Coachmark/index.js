import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Animated, View, Text, StyleSheet } from 'react-native';
import { colors, fontStyles } from '../../../../styles/common';
import StyledButton from '../../StyledButton';
import { strings } from '../../../../../locales/i18n';

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
		/**
		 * Custom coachmark style to apply
		 */
		coachmarkStyle: PropTypes.object,
		/**
		 * Custom animated view style to apply
		 */
		style: PropTypes.object,
		/**
		 * Content text
		 */
		content: PropTypes.object,
		/**
		 * Title text
		 */
		title: PropTypes.string,
		/**
		 * Current onboarding wizard step
		 */
		currentStep: PropTypes.number,
		/**
		 * Callback to be called when next is pressed
		 */
		onNext: PropTypes.func,
		/**
		 * Callback to be called when back is pressed
		 */
		onBack: PropTypes.func,
		/**
		 * Whether action buttons have to be rendered
		 */
		action: PropTypes.bool,
		/**
		 * Top indicator position
		 */
		topIndicatorPosition: PropTypes.oneOf(['topCenter', 'topLeft', 'topLeftCorner']),
		/**
		 * Bottom indicator position
		 */
		bottomIndicatorPosition: PropTypes.oneOf(['bottomCenter', 'bottomLeft'])
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

	/**
	 * Calls props onNext
	 */
	onNext = () => {
		const { onNext } = this.props;
		onNext && onNext();
	};

	/**
	 * Calls props onBack
	 */
	onBack = () => {
		const { onBack } = this.props;
		onBack && onBack();
	};

	/**
	 * Gets top indicator style according to 'topIndicatorPosition'
	 *
	 * @param {string} topIndicatorPosition - Indicator position
	 * @returns {Object} - Corresponding style object
	 */
	getIndicatorStyle = topIndicatorPosition => {
		const positions = {
			topCenter: styles.topCenter,
			topLeft: styles.topLeft,
			topLeftCorner: styles.topLeftCorner,
			[undefined]: styles.topCenter
		};
		return positions[topIndicatorPosition];
	};

	/**
	 * Gets top indicator style according to 'bottomIndicatorPosition'
	 *
	 * @param {string} bottomIndicatorPosition - Indicator position
	 * @returns {Object} - Corresponding style object
	 */
	getBotttomIndicatorStyle = bottomIndicatorPosition => {
		const positions = {
			bottomCenter: styles.bottomCenter,
			bottomLeft: styles.bottomLeft,
			[undefined]: styles.bottomCenter
		};
		return positions[bottomIndicatorPosition];
	};

	/**
	 * Returns progress bar, back and next buttons. According to currentStep
	 *
	 * @returns {Object} - Corresponding view object
	 */
	renderProgressButtons = () => {
		const { currentStep } = this.props;
		return (
			<View style={styles.progress}>
				<StyledButton
					containerStyle={[styles.progressButton, styles.leftProgessButton]}
					type={'transparent'}
					onPress={this.onBack}
				>
					{strings('onboarding_wizard.coachmark.progress_back')}
				</StyledButton>
				<View style={styles.progessContainer}>
					{[1, 2, 3, 4, 5].map(i => (
						<View key={i} style={[styles.circle, currentStep === i ? styles.solidCircle : {}]} />
					))}
				</View>

				<StyledButton
					containerStyle={[styles.progressButton, styles.rightProgessButton]}
					type={'normal'}
					onPress={this.onNext}
				>
					{strings('onboarding_wizard.coachmark.progress_next')}
				</StyledButton>
			</View>
		);
	};

	/**
	 * Returns horizontal action buttons
	 *
	 * @returns {Object} - Corresponding view object
	 */
	renderActionButtons = () => (
		<View style={styles.actions}>
			<StyledButton containerStyle={styles.actionButton} type={'transparent'} onPress={this.onBack}>
				{strings('onboarding_wizard.coachmark.action_back')}
			</StyledButton>
			<StyledButton containerStyle={styles.actionButton} type={'normal'} onPress={this.onNext}>
				{strings('onboarding_wizard.coachmark.action_next')}
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
					{content}
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
