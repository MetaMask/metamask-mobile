import React, { PureComponent } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../../styles/common';
import Device from '../../../util/device';

const styles = StyleSheet.create({
	view: {
		position: 'relative',
		height: Device.isAndroid() ? 41.5 : 40,
		width: Device.isAndroid() ? 41.5 : 40,
		top: Device.isAndroid() ? -6 : -5.5,
		left: Device.isAndroid() ? -6 : -5.5,
	},
	static: {
		borderWidth: 3.5,
		borderColor: colors.spinnerBackground,
		borderRadius: 64,
		width: 36,
		height: 36,
	},
});

export default class AnimatedSpinner extends PureComponent {
	spinValue = new Animated.Value(0);

	state = {
		spinning: false,
	};

	componentDidMount() {
		this.mounted = true;
		this.spin();
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	spin = () => {
		this.spinValue.setValue(0);

		if (this.state.spinning === false) {
			this.setState({ spinning: true });
			this.animation();
		} else {
			this.setState({ spinning: false });
		}
	};

	animation = () => {
		this.spinValue.setValue(0);

		Animated.timing(this.spinValue, {
			toValue: 1,
			duration: 1000,
			easing: Easing.linear,
			useNativeDriver: true,
			isInteraction: false,
		}).start(() => {
			if (this.state.spinning && this.mounted) {
				this.animation();
			} else {
				this.mounted && this.setState({ spinning: false });
			}
		});
	};

	render() {
		const spin = this.spinValue.interpolate({
			inputRange: [0, 1],
			outputRange: ['0deg', '360deg'],
		});

		return (
			<View style={styles.static}>
				<Animated.View style={[styles.view, { transform: [{ rotate: spin }] }]}>
					<Icon name="loading" size={36} color={colors.spinnerColor} />
				</Animated.View>
			</View>
		);
	}
}
