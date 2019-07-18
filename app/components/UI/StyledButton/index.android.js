import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Text, TouchableNativeFeedback, View, ViewPropTypes } from 'react-native';
import coalesceNonElementChildren from 'react-native-button/coalesceNonElementChildren';
import getStyles from './styledButtonStyles';

/**
 * UI component that wraps StyledButton
 * for Android devices
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
		 * Type of the button
		 */
		type: PropTypes.string,
		/**
		 * ID of the element to be used on e2e tests
		 */
		testID: PropTypes.string,
		/**
		 * Style of the childGroup view
		 */
		childGroupStyle: ViewPropTypes.style,
		/**
		 * Font Scaling
		 */
		allowFontScaling: PropTypes.bool
	};

	static defaultProps = {
		...PureComponent.defaultProps,
		styleDisabled: { opacity: 0.6 },
		disabledContainerStyle: { opacity: 0.6 }
	};

	renderGroupedChildren = fontStyle => {
		const { disabled } = this.props;
		const style = [...fontStyle, this.props.style, disabled ? this.props.styleDisabled : null];

		const childGroupStyle = [this.props.childGroupStyle];

		const children = coalesceNonElementChildren(this.props.children, (children, index) => (
			<Text key={index} style={style} allowFontScaling={this.props.allowFontScaling}>
				{children}
			</Text>
		));

		switch (children.length) {
			case 0:
				return null;
			case 1:
				return children[0];
			default:
				return <View style={childGroupStyle}>{children}</View>;
		}
	};

	render = () => {
		const { type } = this.props;
		const { fontStyle, containerStyle } = getStyles(type);
		const touchableProps = {};
		const containerStyles = [
			...containerStyle,
			this.props.disabled ? this.props.disabledContainerStyle : null,
			this.props.containerStyle
		];

		if (!this.props.disabled) {
			touchableProps.onPress = this.props.onPress;
		}

		return (
			<TouchableNativeFeedback {...touchableProps} testID={this.props.testID} disabled={this.props.disabled}>
				<View style={containerStyles}>{this.renderGroupedChildren(fontStyle, containerStyles)}</View>
			</TouchableNativeFeedback>
		);
	};
}
