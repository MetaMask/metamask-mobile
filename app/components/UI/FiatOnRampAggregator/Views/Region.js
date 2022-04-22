import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
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

const Region = () => {
	const navigation = useNavigation();
	const { colors } = useTheme();
	const { selectedRegion, setSelectedRegion } = useFiatOnRampSDK();
	const [isRegionModalVisible, , showRegionModal, hideRegionModal] = useModalHandler(false);

	const [showAlert, setShowAlert] = useState(false);
	const [selectedUnsupportedLocation, setSelectedUnsupportedLocation] = useState({});
	const [{ data, isFetching, error }] = useSDKMethod('getCountries');
	useEffect(() => {
		navigation.setOptions(getFiatOnRampAggNavbar(navigation, { title: 'Region', showBack: false }, colors));
	}, [navigation, colors]);

	const handleOnPress = useCallback(() => {
		navigation.navigate('PaymentMethod');
	}, [navigation]);

	const handleRegionPress = useCallback(
		(region) => {
			setSelectedRegion(region);
			hideRegionModal();
		},
		[hideRegionModal, setSelectedRegion]
	);

	const updatedRegion = useMemo(() => {
		if (!selectedRegion || !data) return null;
		const allRegions = data.reduce((acc, region) => [...acc, region, ...(region.states || [])], []);
		return allRegions.find((region) => region.id === selectedRegion.id) ?? null;
	}, [data, selectedRegion]);

	useEffect(() => {
		if (updatedRegion && updatedRegion.unsupported) {
			setShowAlert(true);
			setSelectedUnsupportedLocation(updatedRegion);
			setSelectedRegion(null);
		}
	}, [updatedRegion, setSelectedRegion]);

	// TODO: replace this with loading screen
	if (isFetching || !data) {
		return (
			<ScreenLayout>
				<ScreenLayout.Body></ScreenLayout.Body>
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
				dismiss={() => setShowAlert(false)}
				title={strings('fiat_on_ramp_aggregator.region.unsupported')}
				body={strings('fiat_on_ramp_aggregator.region.unsupported_description')}
				link={strings('fiat_on_ramp_aggregator.region.unsupported_link')}
			/>
			<ScreenLayout.Body>
				<ScreenLayout.Content>
					<TouchableOpacity onPress={showRegionModal}>
						<Box>
							<ListItem.Content>
								<ListItem.Body>
									{updatedRegion ? (
										<Text>
											{updatedRegion.emoji} {'   '}
											{updatedRegion.name}
										</Text>
									) : (
										<Text>{strings('fiat_on_ramp_aggregator.region.select_region')}</Text>
									)}
								</ListItem.Body>
								<ListItem.Amounts>
									<FontAwesome name="caret-down" size={15} color={colors.icon.default} />
								</ListItem.Amounts>
							</ListItem.Content>
						</Box>
					</TouchableOpacity>
				</ScreenLayout.Content>
				<RegionModal
					isVisible={isRegionModalVisible}
					title={strings('fiat_on_ramp_aggregator.region.title')}
					description={strings('fiat_on_ramp_aggregator.region.description')}
					data={data}
					dismiss={hideRegionModal}
					onRegionPress={handleRegionPress}
				/>
			</ScreenLayout.Body>
			<ScreenLayout.Footer>
				<ScreenLayout.Content>
					<View>
						<StyledButton type="confirm" onPress={handleOnPress} disabled={!updatedRegion}>
							{strings('swaps.continue')}
						</StyledButton>
					</View>
				</ScreenLayout.Content>
			</ScreenLayout.Footer>
		</ScreenLayout>
	);
};

export default Region;
