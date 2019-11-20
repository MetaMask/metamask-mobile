import React, { PureComponent } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { colors } from '../../../styles/common';
import { getTransactionOptionsTitle } from '../../UI/Navbar';
import AddressInput from './AddressInput';
import AddressList from './AddressList';
import PropTypes from 'prop-types';

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
			<AddressInput addressTo />
			<AddressInput />
			<AddressList />
		</SafeAreaView>
	);
}
