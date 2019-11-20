import React, { PureComponent } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { colors } from '../../../styles/common';
import { getTransactionOptionsTitle } from '../../UI/Navbar';
import AddressInput from './AddressInput';
import AddressList from './AddressList';
import PropTypes from 'prop-types';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white
	},
	addressesWrapper: {
		borderBottomWidth: 1,
		borderBottomColor: colors.grey050
	}
});

/**
 * View that wraps the wraps the "Send" screen
 */
export default class SendFlow extends PureComponent {
	static navigationOptions = ({ navigation }) => getTransactionOptionsTitle('send.title', navigation);

	static propTypes = {
		/**
		 * Object that represents the navigator
		 */
		navigation: PropTypes.object
	};

	componentDidMount = () => {
		const { navigation } = this.props;
		navigation && navigation.setParams({ mode: 'edit' });
	};

	render = () => (
		<SafeAreaView style={styles.wrapper}>
			<View style={styles.addressesWrapper}>
				<AddressInput addressTo />
				<AddressInput />
			</View>
			<AddressList />
		</SafeAreaView>
	);
}
