import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet } from 'react-native';
import SelectorButton from '../../../Base/SelectorButton';
import Text from '../../../Base/Text';
import CountrySelectorModal from './CountrySelectorModal';
import useModalHandler from '../../../Base/hooks/useModalHandler';

import { SUPPORTED_COUNTRIES } from '../orderProcessor/wyreApplePay';

const styles = StyleSheet.create({
	flagText: {
		marginVertical: 3,
		marginHorizontal: 0,
	},
});

function CountrySelector({ selectedCountry, setCountry, ...props }) {
	const [isVisible, , showModal, hideModal] = useModalHandler(false);
	const countriesArray = useMemo(() => Object.values(SUPPORTED_COUNTRIES), []);
	const country = useMemo(
		() => countriesArray.find((country) => country.code === selectedCountry),
		[selectedCountry, countriesArray]
	);
	const handleCountryPress = useCallback(
		(countryCode) => {
			setCountry(countryCode);
			hideModal();
		},
		[setCountry, hideModal]
	);
	return (
		<>
			<SelectorButton {...props} onPress={showModal}>
				<Text reset style={styles.flagText}>
					{country?.label || '⚠️'}
				</Text>
			</SelectorButton>
			<CountrySelectorModal
				isVisible={isVisible}
				dismiss={hideModal}
				countries={countriesArray}
				onItemPress={handleCountryPress}
			/>
		</>
	);
}

CountrySelector.propTypes = {
	selectedCountry: PropTypes.string,
	setCountry: PropTypes.func.isRequired,
};

export default CountrySelector;
