import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet } from 'react-native';
import SelectorButton from '../../../Base/SelectorButton';
import Text from '../../../Base/Text';

const styles = StyleSheet.create({
	flagText: {
		marginVertical: 3,
		marginHorizontal: 0
	}
});

function CountrySelector({ selectedCurrency, setCurrency, ...props }) {
	return (
		<>
			<SelectorButton {...props}>
				<Text reset style={styles.flagText}>
					🇺🇸
				</Text>
			</SelectorButton>
		</>
	);
}

CountrySelector.propTypes = {
	selectedCurrency: PropTypes.string,
	setCurrency: PropTypes.func.isRequired
};

export default CountrySelector;
