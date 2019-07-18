import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Animated, ViewPropTypes } from 'react-native';

/**
 * View that has the ability to fade in / out
 * his children by using the visible prop
 */
export default class FadeView extends PureComponent {
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

	constructor(props) {
		super(props);
		this.state = {
			visible: props.visible
		};
		this.visibility = new Animated.Value(props.visible ? 1 : 0);
	}

	componentDidMount() {
		this.mounted = true;
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	componentDidUpdate() {
		Animated.timing(this.visibility, {
			toValue: this.props.visible ? 1 : 0,
			duration: 300,
			useNativeDriver: true,
			isInteraction: false
		}).start(() => {
			if (this.props.visible !== this.state.visible) {
				setTimeout(() => {
					this.mounted && this.setState({ visible: this.props.visible });
				}, 500);
			}
		});
	}

	render = () => {
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
	};
}
