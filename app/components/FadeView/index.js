import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Animated, ViewPropTypes } from 'react-native';

/**
 * View that has the ability to fade in / out
 * his children by using the visible prop
 */
export default class FadeView extends Component {
	state = {
		visible: this.props.visible
	};

	static propTypes = {
		/**
		 * Determines to show / hide the children components
		 */
		visible: PropTypes.bool,
		/**
		 * Children components of the FadeView
		 * it can be a text node, an image, or an icon
		 * or an Array with a combination of them
		 */
		children: PropTypes.any,
		/**
		 * Styles to be applied to the FadeView
		 */
		style: ViewPropTypes.style
	};

	visibility = new Animated.Value(this.props.visible ? 1 : 0);

	componentDidUpdate() {
		this.updateComponentAfterPropChange();
	}

	updateComponentAfterPropChange() {
		if (this.props.visible) {
			this.setState({ visible: true });
		}
		Animated.timing(this.visibility, {
			toValue: this.props.visible ? 1 : 0,
			duration: 300
		}).start(() => {
			this.setState({ visible: this.props.visible });
		});
	}

	render() {
		const { style, children, ...rest } = this.props;

		const containerStyle = {
			opacity: this.visibility.interpolate({
				inputRange: [0, 1],
				outputRange: [0, 1]
			})
		};

		const combinedStyle = [containerStyle, style];
		return (
			<Animated.View style={this.state.visible ? combinedStyle : containerStyle} {...rest}>
				{this.state.visible ? children : null}
			</Animated.View>
		);
	}
}
