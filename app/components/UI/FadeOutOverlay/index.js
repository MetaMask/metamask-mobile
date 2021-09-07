import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Animated, StyleSheet } from 'react-native';
import { colors } from '../../../styles/common';
import Device from '../../../util/device';

const styles = StyleSheet.create({
	view: {
		backgroundColor: colors.white,
		position: 'absolute',
		top: 0,
		bottom: 0,
		left: 0,
		right: 0,
	},
});

/**
 * View that is displayed to first time (new) users
 */
export default class FadeOutOverlay extends PureComponent {
	static propTypes = {
		style: PropTypes.any,
		duration: PropTypes.number,
	};

	state = {
		done: false,
	};

	opacity = new Animated.Value(1);

	componentDidMount() {
		Animated.timing(this.opacity, {
			toValue: 0,
			duration: this.props.duration,
			useNativeDriver: true,
			isInteraction: false,
		}).start(() => {
			this.setState({ done: true });
		});
	}

	render() {
		if (this.state.done) return null;
		return <Animated.View style={[{ opacity: this.opacity }, styles.view, this.props.style]} />;
	}
}

FadeOutOverlay.defaultProps = {
	style: null,
	duration: Device.isAndroid() ? 300 : 300,
};
