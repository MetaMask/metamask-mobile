import React, { PureComponent } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { colors } from '../../../../styles/common';
import PropTypes from 'prop-types';
import { strings } from '../../../../../locales/i18n';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import { connect } from 'react-redux';
import AddressList from '../../SendFlow/AddressList';
import StyledButton from '../../../UI/StyledButton';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	addContact: {
		marginHorizontal: 24
	}
});

const EDIT = 'edit';

/**
 * View that contains app information
 */
class Contacts extends PureComponent {
	static navigationOptions = ({ navigation }) =>
		getNavigationOptionsTitle(strings('app_settings.contacts_title'), navigation);

	static propTypes = {
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object
	};

	onAddressPress = address => {
		this.props.navigation.navigate('ContactsAdd', { mode: EDIT, address });
	};

	goToAddContact = () => {
		this.props.navigation.navigate('ContactsAdd');
	};

	goToEditContact = () => {
		this.props.navigation.navigate('ContactsEdit');
	};

	render = () => (
		<SafeAreaView style={styles.wrapper}>
			<AddressList onlyRenderAddressBook onAccountPress={this.onAddressPress} />
			<StyledButton type={'confirm'} containerStyle={styles.addContact} onPress={this.goToAddContact}>
				{strings('address_book.add_contact')}
			</StyledButton>
		</SafeAreaView>
	);
}

const mapStateToProps = state => ({
	network: state.engine.backgroundState.NetworkController.network
});

export default connect(mapStateToProps)(Contacts);
