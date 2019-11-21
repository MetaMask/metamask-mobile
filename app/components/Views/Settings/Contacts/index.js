import React, { PureComponent } from 'react';
import { SafeAreaView, StyleSheet, TextInput, View } from 'react-native';
import { colors } from '../../../../styles/common';
import PropTypes from 'prop-types';
import { strings } from '../../../../../locales/i18n';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import StyledButton from '../../../UI/StyledButton';
import Engine from '../../../../core/Engine';
import { toChecksumAddress } from 'ethereumjs-util';
import { connect } from 'react-redux';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	input: {
		flexDirection: 'row',
		alignItems: 'center',
		marginHorizontal: 6
	},
	textInput: {
		flex: 1,
		height: 60,
		borderColor: colors.black,
		borderWidth: 1,
		padding: 8
	}
});

/**
 * View that contains app information
 */
class Contacts extends PureComponent {
	static navigationOptions = ({ navigation }) =>
		getNavigationOptionsTitle(strings('app_settings.info_title'), navigation);

	static propTypes = {
		/**
		 * Network id
		 */
		network: PropTypes.string
	};

	state = {
		name: '',
		address: ''
	};

	onChangeName = name => {
		this.setState({ name });
	};

	onChangeAddress = address => {
		this.setState({ address });
	};

	clearFields = () => {
		this.setState({ address: undefined, name: undefined });
	};

	addContact = () => {
		const { name, address } = this.state;
		const { network } = this.props;
		const { AddressBookController } = Engine.context;
		if (!name || !address) return;
		AddressBookController.set(toChecksumAddress(address), name, network);
		this.clearFields();
	};

	render = () => (
		<SafeAreaView style={styles.wrapper}>
			<View style={styles.input}>
				<TextInput
					autoCapitalize="none"
					autoCorrect={false}
					onChangeText={this.onChangeName}
					placeholder={'Nickname'}
					placeholderTextColor={colors.grey100}
					spellCheck={false}
					style={styles.textInput}
					numberOfLines={1}
					onBlur={this.onBlur}
					onFocus={this.onInputFocus}
					onSubmitEditing={this.onFocus}
				/>
			</View>
			<View style={styles.input}>
				<TextInput
					autoCapitalize="none"
					autoCorrect={false}
					onChangeText={this.onChangeAddress}
					placeholder={'Public address (0x), or ENS'}
					placeholderTextColor={colors.grey100}
					spellCheck={false}
					style={styles.textInput}
					numberOfLines={1}
					onBlur={this.onBlur}
					onFocus={this.onInputFocus}
					onSubmitEditing={this.onFocus}
				/>
			</View>
			<StyledButton type={'confirm'} onPress={this.addContact}>
				{'Add contact'}
			</StyledButton>
		</SafeAreaView>
	);
}

const mapStateToProps = state => ({
	network: state.engine.backgroundState.NetworkController.network
});

export default connect(mapStateToProps)(Contacts);
