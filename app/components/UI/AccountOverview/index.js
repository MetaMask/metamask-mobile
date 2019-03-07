import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Platform, ScrollView, TextInput, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import Identicon from '../Identicon';
import Engine from '../../../core/Engine';
import { setTokensTransaction } from '../../../actions/transaction';
import { connect } from 'react-redux';
import { renderFiat } from '../../../util/number';
import { renderAccountName, renderShortAddress } from '../../../util/address';

const styles = StyleSheet.create({
	scrollView: {
		maxHeight: 170
	},
	wrapper: {
		maxHeight: 170,
		paddingTop: 20,
		paddingHorizontal: 20,
		paddingBottom: 0,
		alignItems: 'center'
	},
	info: {
		justifyContent: 'center',
		alignItems: 'center'
	},
	label: {
		paddingTop: 7,
		fontSize: 24,
		...fontStyles.normal
	},
	address: {
		fontSize: 14,
		paddingVertical: 10,
		color: colors.gray,
		fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
		letterSpacing: 1.5
	},
	amountFiat: {
		fontSize: 12,
		paddingTop: 5,
		color: colors.fontSecondary,
		...fontStyles.normal
	}
});

/**
 * View that's part of the <Wallet /> component
 * which shows information about the selected account
 */
class AccountOverview extends Component {
	static propTypes = {
		/**
		 * String that represents the selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		/* Identities object required to get account name
		*/
		identities: PropTypes.object,
		/**
		 * Object that represents the selected account
		 */
		account: PropTypes.object,
		/**
		/* Selected currency
		*/
		currentCurrency: PropTypes.string
	};

	state = {
		accountLabelEditable: false,
		accountLabel: '',
		originalAccountLabel: ''
	};

	input = React.createRef();

	componentDidMount = () => {
		const { identities, selectedAddress } = this.props;
		const accountLabel = renderAccountName(selectedAddress, identities);
		this.setState({ accountLabel });
	};

	setAccountLabel = () => {
		const { PreferencesController } = Engine.context;
		const { selectedAddress } = this.props;
		const { accountLabel } = this.state;
		PreferencesController.setAccountLabel(selectedAddress, accountLabel);
		this.setState({ accountLabelEditable: false });
	};

	onAccountLabelChange = accountLabel => {
		this.setState({ accountLabel });
	};

	setAccountLabelEditable = () => {
		this.setState({ accountLabelEditable: true });
		setTimeout(() => {
			this.input && this.input.current && this.input.current.focus();
		}, 100);
	};

	cancelAccountLabelEdition = () => {
		const { identities, selectedAddress } = this.props;
		const accountLabel = renderAccountName(selectedAddress, identities);
		this.setState({ accountLabelEditable: false, accountLabel });
	};

	render() {
		const {
			account: { name, address },
			currentCurrency
		} = this.props;

		const fiatBalance = renderFiat(Engine.getTotalFiatAccountBalance(), currentCurrency);

		if (!address) return null;
		const { accountLabelEditable, accountLabel } = this.state;

		return (
			<ScrollView
				bounces={false}
				keyboardShouldPersistTaps={'never'}
				style={styles.scrollView}
				contentContainerStyle={styles.wrapper}
				testID={'account-overview'}
			>
				<View style={styles.info}>
					<Identicon address={address} size="38" />
					<View>
						{accountLabelEditable ? (
							<TextInput
								style={styles.label}
								editable={accountLabelEditable}
								onChangeText={this.onAccountLabelChange}
								onSubmitEditing={this.setAccountLabel}
								onBlur={this.setAccountLabel}
								testID={'account-label-text-input'}
								value={accountLabel}
								selectTextOnFocus
								ref={this.input}
								returnKeyType={'done'}
								autoCapitalize={'none'}
								autoComplete={'off'}
								autoCorrect={false}
							/>
						) : (
							<TouchableOpacity onLongPress={this.setAccountLabelEditable}>
								<Text style={styles.label}>{name}</Text>
							</TouchableOpacity>
						)}
					</View>
					<Text style={styles.address}>{renderShortAddress(address)}</Text>
					<Text style={styles.amountFiat}>{fiatBalance}</Text>
				</View>
			</ScrollView>
		);
	}
}

const mapStateToProps = state => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	identities: state.engine.backgroundState.PreferencesController.identities
});

const mapDispatchToProps = dispatch => ({
	setTokensTransaction: asset => dispatch(setTokensTransaction(asset))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(AccountOverview);
