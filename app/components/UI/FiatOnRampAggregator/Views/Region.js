import React, { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import CheckBox from '@react-native-community/checkbox';
import Text from '../../../Base/Text';
import ScreenLayout from '../components/ScreenLayout';
import useModalHandler from '../../../Base/hooks/useModalHandler';
import { useFiatOnRampSDK, useSDKMethod } from '../sdk';
import { strings } from '../../../../../locales/i18n';
import StyledButton from '../../StyledButton';
import Box from '../components/Box';
import ListItem from '../../../Base/ListItem';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { colors } from '../../../../styles/common';
import { useNavigation } from '@react-navigation/native';

import RegionModal from '../components/RegionModal';

const styles = StyleSheet.create({
	checkbox: {
		width: 15,
		height: 15,
		marginTop: 3,
	},
	checkboxView: {
		marginVertical: 16,
		flexDirection: 'row',
	},
	checkboxMargin: {
		marginLeft: 7,
	},
});

const Region = () => {
	const [rememberRegion, setRememberRegion] = useState(false);
	const [isTokenSelectorModalVisible, toggleTokenSelectorModal, , hideTokenSelectorModal] = useModalHandler(false);
	const { setSelectedCountry, setSelectedRegion, selectedCountry, selectedRegion } = useFiatOnRampSDK();
	// eslint-disable-next-line no-unused-vars
	const [showAlert, setShowAlert] = useState(false);
	const [{ data, isFetching, error }] = useSDKMethod('getCountries');

	const navigation = useNavigation();

	const handleChangeRememberRegion = () => {
		setRememberRegion((currentRememberRegion) => !currentRememberRegion);
	};

	const handleRegionButton = () => {
		toggleTokenSelectorModal();
	};

	const handleOnPress = useCallback(() => {
		navigation.navigate('PaymentMethod');
	}, [navigation]);

	const handleCountryPress = useCallback(
		(country) => {
			if (country.unsupported) {
				setShowAlert(true);
			} else {
				setSelectedCountry(country);
				hideTokenSelectorModal();
			}
		},
		[hideTokenSelectorModal, setSelectedCountry]
	);

	const handleRegionPress = useCallback(
		(region) => {
			if (region.unsupported) {
				setShowAlert(true);
			} else {
				setSelectedRegion(region);
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
			<ScreenLayout.Header
				title={strings('fiat_on_ramp_aggregator.region.your_region')}
				description={strings('fiat_on_ramp_aggregator.region.subtitle_description')}
			/>

			<ScreenLayout.Body>
				<ScreenLayout.Content>
					<TouchableOpacity onPress={handleRegionButton}>
						<Box>
							<ListItem.Content>
								<ListItem.Body>
									{selectedRegion?.id ? (
										<Text>
											{selectedRegion.emoji} {'   '}
											{selectedRegion.name}
										</Text>
									) : selectedCountry?.id ? (
										<Text>
											{selectedCountry.emoji} {'   '}
											{selectedCountry.name}
										</Text>
									) : (
										<Text>{strings('fiat_on_ramp_aggregator.region.select_region')}</Text>
									)}
								</ListItem.Body>
								<ListItem.Amounts>
									<FontAwesome name="caret-down" size={15} />
								</ListItem.Amounts>
							</ListItem.Content>
						</Box>
					</TouchableOpacity>

					<TouchableOpacity onPress={handleChangeRememberRegion} style={styles.checkboxView}>
						<CheckBox
							value={rememberRegion}
							onValueChange={handleChangeRememberRegion}
							boxType="square"
							animationDuration={0.2}
							onAnimationType="fill"
							offAnimationType="fill"
							onFillColor={colors.blue500}
							onCheckColor={colors.white}
							style={styles.checkbox}
						/>
						<Text black style={styles.checkboxMargin}>
							{strings('fiat_on_ramp_aggregator.region.remember_region')}
						</Text>
					</TouchableOpacity>
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
					<View>
						<StyledButton
							type="confirm"
							onPress={handleOnPress}
							disabled={Object.keys(selectedRegion).length === 0}
						>
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
