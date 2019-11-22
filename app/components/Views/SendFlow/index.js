import React, { PureComponent } from 'react';
import { colors } from '../../../styles/common';
import { getTransactionOptionsTitle } from '../../UI/Navbar';
import AddressList from './AddressList';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import { AddressFrom, AddressTo } from './AddressInputs';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		backgroundColor: colors.white
	},
	imputWrapper: {
		flex: 0,
		borderBottomWidth: 1,
		borderBottomColor: colors.grey050
	},
	addressListWrapper: {
		flex: 1
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
		<View style={styles.wrapper}>
			<View style={styles.imputWrapper}>
				<AddressFrom />
				<AddressTo highlighted />
			</View>
			<View style={styles.addressListWrapper}>
				<AddressList />
			</View>
		</View>
	);
}
