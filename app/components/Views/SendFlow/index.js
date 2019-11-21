import React, { PureComponent } from 'react';
import { colors } from '../../../styles/common';
import { getTransactionOptionsTitle } from '../../UI/Navbar';
import AddressInput from './AddressInput';
import AddressList from './AddressList';
import PropTypes from 'prop-types';
import { View } from 'react-native';

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
				<AddressInput />
				<AddressInput addressTo />
			</View>
			<View style={styles.addressListWrapper}>
				<AddressList />
			</View>
		</View>
	);
}
