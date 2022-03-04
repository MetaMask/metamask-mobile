import React, { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import CheckBox from '@react-native-community/checkbox';
import Text from '../../../Base/Text';
import ScreenLayout from '../components/ScreenLayout';
import useModalHandler from '../../../Base/hooks/useModalHandler';
import { useFiatOnRampSDK, useSDKMethod } from '../SDK';
import { strings } from '../../../../../locales/i18n';
import StyledButton from '../../StyledButton';
import Box from '../components/Box';
import ListItem from '../../../Base/ListItem';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { colors } from '../../../../styles/common';

import RegionModal from '../components/RegionModal';

const styles = StyleSheet.create({
	titleAlign: {
		textAlign: 'center',
	},

	box: {
		marginVertical: 16,
	},
	checkbox: {
		width: 15,
		height: 15,
		marginTop: 3,
	},
	checkboxView: {
		flexDirection: 'row',
	},
	checkboxMargin: {
		marginLeft: 7,
	},
});

const Region = () => {
	const [rememberRegion, setRememberRegion] = useState(false);
	const [isTokenSelectorModalVisible, toggleTokenSelectorModal, , hideTokenSelectorModal] = useModalHandler(false);
	const { setSelectedCountry, setSelectedRegion } = useFiatOnRampSDK();
	// eslint-disable-next-line no-unused-vars
	const [showAlert, setShowAlert] = useState(false);
	const [{ data, isFetching, error }] = useSDKMethod('getCountries');
	const [selectedRegionObject, setSelectedRegionObject] = useState({});

	const handleCheckBox = () => {
		setRememberRegion(!rememberRegion);
	};

	const handleRegionButton = () => {
		toggleTokenSelectorModal();
	};

	const handleCountryPress = useCallback(
		(country) => {
			//const countryObject = data.filter((item) => item.name === country);

			if (country.unsupported) {
				setShowAlert(true);
			} else {
				setSelectedRegionObject(country);
				setSelectedCountry(country.name);
				hideTokenSelectorModal();
			}
		},
		[hideTokenSelectorModal, setSelectedCountry]
	);

	const handleRegionPress = useCallback(
		(region) => {
			//const countryObject = data.filter((item) => item.name === country);
			if (region.unsupported) {
				setShowAlert(true);
			} else {
				setSelectedRegion(region.name);
				setSelectedRegionObject(region);
				hideTokenSelectorModal();
			}
		},
		[hideTokenSelectorModal, setSelectedRegion]
	);

	if (isFetching || !data) {
		return (
			<ScreenLayout>
				<ScreenLayout.Body>
					<Text>Loading...</Text>
				</ScreenLayout.Body>
			</ScreenLayout>
		);
	}
	if (error) {
		return (
			<ScreenLayout>
				<ScreenLayout.Body>
					<Text>{error}</Text>
				</ScreenLayout.Body>
			</ScreenLayout>
		);
	}

	return (
		<ScreenLayout>
			<ScreenLayout.Body>
				<ScreenLayout.Content>
					<Text big primary style={styles.titleAlign}>
						Your Region
					</Text>

					<Text style={styles.titleAlign}>
						Text here about how a certain payment method will be available depending on your region
					</Text>
					<TouchableOpacity onPress={handleRegionButton}>
						<Box style={styles.box}>
							<ListItem.Content>
								<ListItem.Body>
									{Object.keys(selectedRegionObject).length !== 0 ? (
										<Text>
											{selectedRegionObject.emoji} {'   '}
											{selectedRegionObject.name}
										</Text>
									) : (
										<Text>Select your region</Text>
									)}
								</ListItem.Body>
								<ListItem.Amounts>
									<FontAwesome name="caret-down" size={15} />
								</ListItem.Amounts>
							</ListItem.Content>
						</Box>
					</TouchableOpacity>

					<View style={styles.checkboxView}>
						<CheckBox
							boxType="square"
							animationDuration={0.2}
							onAnimationType="fill"
							offAnimationType="fill"
							onFillColor={colors.blue500}
							onCheckColor={colors.white}
							style={styles.checkbox}
							onChange={handleCheckBox}
						/>
						<Text black style={styles.checkboxMargin}>
							Remember my Region
						</Text>
					</View>
				</ScreenLayout.Content>

				<RegionModal
					isVisible={isTokenSelectorModalVisible}
					title={strings('fiat_on_ramp_aggregator.region.title')}
					description={strings('fiat_on_ramp_aggregator.region.description')}
					data={data}
					dismiss={toggleTokenSelectorModal}
					onCountryPress={handleCountryPress}
					onRegionPress={handleRegionPress}
				/>
			</ScreenLayout.Body>
			<ScreenLayout.Footer>
				<ScreenLayout.Content>
					<View style={styles.row}>
						<StyledButton type="confirm" disabled={Object.keys(selectedRegionObject).length === 0}>
							Continue
						</StyledButton>
					</View>
				</ScreenLayout.Content>
			</ScreenLayout.Footer>
		</ScreenLayout>
	);
};

Region.navigationOptions = ({ navigation, route }) => ({
	title: strings('fiat_on_ramp_aggregator.onboarding.buy_crypto_token'),
});

export default Region;
