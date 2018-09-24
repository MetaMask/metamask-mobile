import React, { Component } from 'react';
import { InteractionManager, Platform, Text, ActivityIndicator, View, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import PropTypes from 'prop-types';
import { strings } from '../../../locales/i18n';
import { colors, fontStyles } from '../../styles/common';
import Screen from '../Screen';
import { getModalNavbarOptions } from '../Navbar';
import StyledButton from '../StyledButton';
import Engine from '../../core/Engine';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
		padding: 30
	},
	loader: {
		backgroundColor: colors.white,
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	content: {
		alignItems: 'center'
	},
	subtitle: {
		fontSize: 17,
		marginTop: 20,
		marginBottom: 20,
		color: colors.fontPrimary,
		justifyContent: 'center',
		textAlign: 'center',
		...fontStyles.bold
	},
	hash: {
		fontSize: Platform.OS === 'android' ? 15 : 20,
		marginBottom: 50,
		color: colors.fontPrimary,
		justifyContent: 'center',
		textAlign: 'center',
		...fontStyles.bold
	},
	icon: {
		color: colors.success,
		marginBottom: 30
	}
});

/**
 * Copmonent that provides ability to add a bookmark
 */
export default class TransactionSubmitted extends Component {
	static navigationOptions = ({ navigation }) =>
		getModalNavbarOptions(strings('transactionSubmitted.title'), navigation);

	static propTypes = {
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object
	};

	renderLoader() {
		return (
			<View style={styles.loader}>
				<ActivityIndicator size="small" />
			</View>
		);
	}

	goToEtherscan = () => {
		this.props.navigation.pop();
		InteractionManager.runAfterInteractions(() => {
			const { navigation } = this.props;
			const hash = navigation.getParam('hash', null);
			const { NetworkController } = Engine.context;
			const isRopsten = NetworkController.provider.type === 'ropsten';
			const url = `https://${isRopsten ? 'ropsten.' : ''}etherscan.io/tx/${hash}`;
			this.props.navigation.navigate('BrowserView', {
				url
			});
		});
	};

	renderView(hash) {
		return (
			<View style={styles.content}>
				<Text style={styles.subtitle}>{strings('transactionSubmitted.yourTxHashIs')}</Text>
				<Text style={styles.hash}>{hash}</Text>
				<Icon name="check-circle" size={150} style={styles.icon} />
				<StyledButton
					type={'normal'}
					onPress={this.goToEtherscan}
					containerStyle={[styles.button, styles.cancel]}
				>
					{strings('transactionSubmitted.viewOnEtherscan')}
				</StyledButton>
			</View>
		);
	}

	render() {
		const { navigation } = this.props;
		const hash = navigation.getParam('hash', null);

		return (
			<Screen>
				<View style={styles.wrapper} testID={'transaction-submitted-screen'}>
					{hash ? this.renderView(hash) : this.renderLoader()}
				</View>
			</Screen>
		);
	}
}
