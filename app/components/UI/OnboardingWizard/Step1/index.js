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
	bottom: {
		flex: 1,
		height: 200,
		bottom: 0,
		left: 0,
		right: 0
	},
	left: {
		backgroundColor: colors.dimmed,
		flex: 0.05,

		borderColor: colors.red
	},
	right: {
		backgroundColor: colors.dimmed,
		flex: 0.05
	},
	middle: {
		flex: 1,
		borderRadius: 10
	},
	empty: {
		flexDirection: 'row',
		height: 40
	},
	belowTooltip: {
		height: 35
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
	}
});

export default class Step1 extends Component {
	static propTypes = {
		navigate: PropTypes.func,
		onClose: PropTypes.func
	};

	onNext = () => {
		const { navigate } = this.props;
		navigate && navigate('Step2');
	};

	onBack = () => {
		this.onClose();
	};

	onClose = () => {
		const { onClose } = this.props;
		onClose && onClose();
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
					title={'OnboardingWizard Step1'}
					content={'Text test'}
					onNext={this.onNext}
					onBack={this.onBack}
					onClose={this.onClose}
					style={styles.some}
					topIndicatorPosition={'topCenter'}
					bottomIndicatorPosition={'bottomLeft'}
				/>
				<View style={[styles.some, styles.belowTooltip]} />

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
