import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet } from 'react-native';
import LoadingAnimation from '../../Swaps/components/LoadingAnimation';

import ScreenView from '../../FiatOrders/components/ScreenView';

const styles = StyleSheet.create({
	screen: {
		flexGrow: 1,
		justifyContent: 'space-between',
	},
});

const GetQuotes = ({ navigation }) => (
	<ScreenView contentContainerStyle={styles.screen} scrollEnabled={false}>
		<LoadingAnimation
			finish={false}
			// eslint-disable-next-line no-empty-function
			onAnimationEnd={() => {}}
			// eslint-disable-next-line no-empty-function
			aggregatorMetadata={() => {}}
			headPan={false}
		/>
	</ScreenView>
);

GetQuotes.propTypes = {
	navigation: PropTypes.object,
};

export default GetQuotes;
