import React from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet } from 'react-native';
import Text from '../../../Base/Text';
import StyledButton from '../../StyledButton';

const styles = StyleSheet.create({
	header: {
		marginTop: 20,
	},
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	caption: {
		marginBottom: 10,
	},
	button: {
		flex: 1,
		width: 200,
	},
});

const GetStarted = ({ navigation }) => (
	<View style={styles.container}>
		<Text centered big black style={styles.header}>
			Critical Path (Fiat On-Ramp)
		</Text>
		<View style={styles.container}>
			<Text style={styles.caption}>Lets APE into some hidden gems!</Text>
			<StyledButton type={'confirm'} onPress={() => navigation.navigate('PaymentMethod')} style={styles.button}>
				Start
			</StyledButton>
		</View>
	</View>
);

GetStarted.navigationOptions = ({ navigation, route }) => ({ headerLeft: () => null });

GetStarted.propTypes = {
	navigation: PropTypes.object,
};

export default GetStarted;
