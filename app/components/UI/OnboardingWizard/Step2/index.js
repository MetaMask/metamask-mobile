import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../../../styles/common';
import Tooltip from '../Tooltip';

const styles = StyleSheet.create({
	main: {
		flex: 1
	},
	some: {
		backgroundColor: colors.dimmed
	},
	first: {
		height: 100
	},
	middle: {
		flex: 1,
		borderRadius: 10
	},
	empty: {
		flexDirection: 'row',
		height: 40
	},
	left: {
		backgroundColor: colors.dimmed,
		flex: 0.2,

		borderColor: colors.red
	},
	right: {
		backgroundColor: colors.dimmed,
		flex: 0.2
	},
	leftFeatured: {
		backgroundColor: colors.dimmed,
		flex: 0.1
	},
	rightFeatured: {
		backgroundColor: colors.dimmed,
		flex: 1.2
	},
	middleFeatured: {
		flex: 1,
		height: 100
	},
	emptyFeatured: {
		flexDirection: 'row',
		height: 45
	},
	bottom: {
		flex: 1,
		height: 200,
		bottom: 0,
		left: 0,
		right: 0
	}
});

export default class Step2 extends Component {
	static propTypes = {
		navigate: PropTypes.func,
		screenProps: PropTypes.object
	};

	onNext = () => {
		const { navigate } = this.props;
		navigate && navigate('Step3');
	};

	onBack = () => {
		const { navigate } = this.props;
		navigate && navigate('Step1');
	};

	onClose = () => {
		const { close } = this.props.screenProps;
		close && close();
	};

	render() {
		return (
			<View style={styles.main}>
				<View style={[styles.some, styles.first]} />
				<View style={styles.empty}>
					<View style={[styles.left]} />
					<View style={[styles.middle]} />
					<View style={[styles.right]} />
				</View>
				<Tooltip
					title={'OnboardingWizard Step2'}
					content={'Text test'}
					onNext={this.onNext}
					onBack={this.onBack}
					onClose={this.onClose}
					style={styles.some}
				/>
				<View style={styles.emptyFeatured}>
					<View style={[styles.leftFeatured]} />
					<View style={[styles.middleFeatured]} />
					<View style={[styles.rightFeatured]} />
				</View>
				<View style={[styles.some, styles.bottom]} />
			</View>
		);
	}
}
