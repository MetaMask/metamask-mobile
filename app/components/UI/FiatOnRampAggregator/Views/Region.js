import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import CheckBox from '@react-native-community/checkbox';
import Text from '../../../Base/Text';
import ListItem from '../../../Base/ListItem';
import useModalHandler from '../../../Base/hooks/useModalHandler';
import ScreenLayout from '../components/ScreenLayout';
import Box from '../components/Box';
import RegionModal from '../components/RegionModal';
import StyledButton from '../../StyledButton';
import { getFiatOnRampAggNavbar } from '../../Navbar';
import { useTheme } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';
import { useFiatOnRampSDK, useSDKMethod } from '../sdk';
import RegionAlert from '../components/RegionAlert';

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
	const navigation = useNavigation();
	const { colors } = useTheme();
	const [rememberRegion, setRememberRegion] = useState(false);
	const [isRegionModalVisible, toggleRegionModal, , hideRegionModal] = useModalHandler(false);
	const { setSelectedCountry, setSelectedRegion, selectedCountry, selectedRegion } = useFiatOnRampSDK();

	const [showAlert, setShowAlert] = useState(false);
	const [selectedUnsupportedLocation, setSelectedUnsupportedLocation] = useState({});
	const [{ data, isFetching, error }] = useSDKMethod('getCountries');

	useEffect(() => {
		navigation.setOptions(getFiatOnRampAggNavbar(navigation, { title: 'Region' }, colors));
	}, [navigation, colors]);

	const handleChangeRememberRegion = () => {
		setRememberRegion((currentRememberRegion) => !currentRememberRegion);
	};

	const handleRegionButton = () => {
		toggleRegionModal();
	};

	const handleOnPress = useCallback(() => {
		navigation.navigate('PaymentMethod');
	}, [navigation]);

	const handleCountryPress = (country) => {
		setSelectedCountry(country);
		hideRegionModal();
	};

	const handleRegionPress = useCallback(
		(region, country) => {
			if (region.unsupported) {
				setShowAlert(true);
				setSelectedUnsupportedLocation(region);
			} else {
				setSelectedRegion(region);
				setSelectedCountry(country);
				hideRegionModal();
			}
		},
		[hideRegionModal, setSelectedCountry, setSelectedRegion]
	);

	const handleUnsetRegion = useCallback(() => {
		setSelectedRegion(undefined);
	}, [setSelectedRegion]);

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
			<RegionAlert
				isVisible={showAlert}
				subtitle={`${selectedUnsupportedLocation.emoji}   ${selectedUnsupportedLocation.name}`}
				dismiss={() => setShowAlert(!showAlert)}
				title={strings('fiat_on_ramp_aggregator.region.unsupported')}
				body={strings('fiat_on_ramp_aggregator.region.unsupported_description')}
				link={strings('fiat_on_ramp_aggregator.region.unsupported_link')}
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
									<FontAwesome name="caret-down" size={15} color={colors.primary.inverse} />
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
					isVisible={isRegionModalVisible}
					title={strings('fiat_on_ramp_aggregator.region.title')}
					description={strings('fiat_on_ramp_aggregator.region.description')}
					data={data}
					dismiss={toggleRegionModal}
					onCountryPress={handleCountryPress}
					onRegionPress={handleRegionPress}
					unsetRegion={handleUnsetRegion}
				/>
			</ScreenLayout.Body>
			<ScreenLayout.Footer>
				<ScreenLayout.Content>
					<View>
						<StyledButton type="confirm" onPress={handleOnPress} disabled={!selectedCountry?.id}>
							Continue
						</StyledButton>
					</View>
				</ScreenLayout.Content>
			</ScreenLayout.Footer>
		</ScreenLayout>
	);
};

export default Region;
