import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { ViewPropTypes, Text, StyleSheet } from 'react-native';
import Button from 'react-native-button';
import { fontStyles } from '../../../styles/common';
import { ThemeContext } from '../../../components/Nav/App/context';

/**
 * UI component that renders a styled button
 * for iOS devices
 * see styledButtonStyles.js for available styles
 */
export default class StyledButton extends PureComponent {
	static propTypes = {
		/**
		 * Children components of the Button
		 * it can be a text node, an image, or an icon
		 * or an Array with a combination of them
		 */
		children: PropTypes.any,
		/**
		 * Type of the button
		 */
		disabled: PropTypes.bool,
		/**
		 * Styles to be applied to the Button Text
		 */
		style: Text.propTypes.style,
		/**
		 * Styles to be applied to the Button disabled state text
		 */
		styleDisabled: Text.propTypes.style,
		/**
		 * Styles to be applied to the Button disabled container
		 */
		disabledContainerStyle: ViewPropTypes.style,
		/**
		 * Styles to be applied to the Button Container
		 */
		containerStyle: ViewPropTypes.style,
		/**
		 * Function to be called on press
		 */
		onPress: PropTypes.func,
		/**
		 * Function to be called on press out
		 */
		onPressOut: PropTypes.func,
		/**
		 * Type of the button
		 */
		type: PropTypes.string,
		/**
		 * ID of the element to be used on e2e tests
		 */
		testID: PropTypes.string,
	};

	static defaultProps = {
		...PureComponent.defaultProps,
		styleDisabled: { opacity: 0.6 },
		disabledContainerStyle: { opacity: 0.6 },
	};

	render = () => {
		const { type, onPress, onPressOut, style, children, disabled, styleDisabled, testID, disabledContainerStyle } =
			this.props;
		const { colors } = this.context;
		const styles = StyleSheet.create({
			container: {
				padding: 15,
				borderRadius: 100,
				justifyContent: 'center',
			},
			text: {
				fontSize: 14,
				textAlign: 'center',
				...fontStyles.bold,
			},
			primary: {
				backgroundColor: colors.primary,
			},
			primaryText: {
				color: colors.onPrimary,
			},
			infoText: {
				color: colors.primary,
			},
			confirm: {
				backgroundColor: colors.primary,
				minHeight: 50,
			},
			confirmText: {
				color: colors.onPrimary,
			},
			roundedNormal: {
				backgroundColor: colors.backgroundDefault,
				borderWidth: 1,
				borderColor: colors.primary,
				padding: 8,
			},
			roundedNormalText: {
				color: colors.primary,
			},
			normal: {
				backgroundColor: colors.backgroundDefault,
				borderWidth: 1,
				borderColor: colors.primary,
			},
			normalText: {
				color: colors.primary,
			},
			transparent: {
				backgroundColor: colors.transparent,
				borderWidth: 0,
				borderColor: colors.transparent,
			},
			cancel: {
				backgroundColor: colors.backgroundDefault,
				borderWidth: 1,
				borderColor: colors.textAlternative,
			},
			cancelText: {
				color: colors.textAlternative,
			},
			signingCancel: {
				backgroundColor: colors.backgroundDefault,
				borderWidth: 1,
				borderColor: colors.primary,
			},
			signingCancelText: {
				color: colors.primary,
			},
			warning: {
				backgroundColor: colors.onError,
			},
			info: {
				backgroundColor: colors.backgroundDefault,
				borderWidth: 1,
				borderColor: colors.primary,
			},
			warningText: {
				color: colors.onWarning,
			},
			warningTextEmpty: {
				color: colors.onWarning,
			},
			neutral: {
				backgroundColor: colors.backgroundDefault,
				borderWidth: 1,
				borderColor: colors.borderDefault,
			},
			neutralText: {
				color: colors.textAlternative,
			},
			sign: {
				backgroundColor: colors.primary,
				borderWidth: 1,
				borderColor: colors.primary,
			},
			signText: {
				color: colors.onPrimary,
			},
			danger: {
				backgroundColor: colors.onError,
				borderColor: colors.onError,
				borderWidth: 1,
			},
			whiteText: {
				...fontStyles.bold,
				color: colors.onPrimary,
			},
			viewText: {
				fontSize: 18,
				...fontStyles.bold,
				color: colors.onPrimary,
			},
			view: {
				borderWidth: 1,
				borderColor: colors.onPrimary,
			},
		});

		function getStyles(type) {
			let fontStyle, containerStyle;
			switch (type) {
				case 'primary':
					fontStyle = styles.primaryText;
					containerStyle = styles.primary;
					break;
				case 'confirm':
					fontStyle = styles.confirmText;
					containerStyle = styles.confirm;
					break;
				case 'normal':
					fontStyle = styles.normalText;
					containerStyle = styles.normal;
					break;
				case 'rounded-normal':
					fontStyle = styles.roundedNormalText;
					containerStyle = styles.roundedNormal;
					break;
				case 'cancel':
					fontStyle = styles.cancelText;
					containerStyle = styles.cancel;
					break;
				case 'signingCancel':
					fontStyle = styles.signingCancelText;
					containerStyle = styles.signingCancel;
					break;
				case 'transparent':
					fontStyle = styles.whiteText;
					containerStyle = styles.transparent;
					break;
				case 'warning':
					fontStyle = styles.warningText;
					containerStyle = styles.warning;
					break;
				case 'warning-empty':
					fontStyle = styles.warningTextEmpty;
					containerStyle = styles.transparent;
					break;
				case 'info':
					fontStyle = styles.infoText;
					containerStyle = styles.info;
					break;
				case 'neutral':
					fontStyle = styles.neutralText;
					containerStyle = styles.neutral;
					break;
				case 'danger':
					fontStyle = styles.confirmText;
					containerStyle = styles.danger;
					break;
				case 'sign':
					fontStyle = styles.signText;
					containerStyle = styles.sign;
					break;
				case 'view':
					fontStyle = styles.viewText;
					containerStyle = styles.view;
					break;
				default:
					throw new Error('Unknown button type');
			}

			return {
				fontStyle: [styles.text, fontStyle],
				containerStyle: [styles.container, containerStyle],
			};
		}
		const { fontStyle, containerStyle } = getStyles(type);

		return (
			<Button
				testID={testID}
				disabled={disabled}
				styleDisabled={disabled ? styleDisabled : null}
				disabledContainerStyle={disabled ? disabledContainerStyle : null}
				onPress={onPress}
				onPressOut={onPressOut}
				style={[...fontStyle, style]}
				containerStyle={[...containerStyle, this.props.containerStyle]}
			>
				{children}
			</Button>
		);
	};
}

StyledButton.contextType = ThemeContext;
