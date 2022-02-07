import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet } from 'react-native';
import Text from '../../../Base/Text';
import StyledButton from '../../StyledButton';
import ScreenRegion from '../components/ScreenRegion';

const styles = StyleSheet.create({
	button: {
		width: 200,
	},
});

const GetStarted = ({ navigation }) => {
	const handleOnPress = useCallback(() => {
		navigation.navigate('PaymentMethod');
	}, [navigation]);

	return (
		<ScreenRegion>
			<ScreenRegion.Header
				bold
				title="Your Region"
				description="Text here about how certain payment methods will be available depending on your region"
			/>

			<ScreenRegion.Body>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
				<Text>Critical Path (Fiat On-Ramp)</Text>
			</ScreenRegion.Body>

			<ScreenRegion.Footer>
				<StyledButton type={'confirm'} onPress={handleOnPress} style={styles.button}>
					Start
				</StyledButton>
			</ScreenRegion.Footer>
		</ScreenRegion>
	);
};

GetStarted.navigationOptions = ({ navigation, route }) => ({ headerLeft: () => null });

GetStarted.propTypes = {
	navigation: PropTypes.object,
};

export default GetStarted;
