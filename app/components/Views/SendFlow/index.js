import React, { PureComponent } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { colors } from '../../../styles/common';
import { getTransactionOptionsTitle } from '../../UI/Navbar';
import AddressInput from './AddressInput';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white
	}
});

/**
 * View that wraps the wraps the "Send" screen
 */
export default class SendFlow extends PureComponent {
	static navigationOptions = ({ navigation }) => getTransactionOptionsTitle('send.title', navigation);

	static propTypes = {};

	render = () => (
		<SafeAreaView style={styles.wrapper}>
			<AddressInput addressTo />
			<AddressInput />
		</SafeAreaView>
	);
}
