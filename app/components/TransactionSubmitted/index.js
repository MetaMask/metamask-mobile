import React, { Component } from 'react';
import { Animated, InteractionManager, Platform, Text, ActivityIndicator, View, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { strings } from '../../../locales/i18n';
import { colors, fontStyles } from '../../styles/common';
import Screen from '../Screen';
import { getModalNavbarOptions } from '../Navbar';
import StyledButton from '../StyledButton';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
		padding: 20
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
class TransactionSubmitted extends Component {
	static navigationOptions = ({ navigation }) =>
		getModalNavbarOptions(strings('transactionSubmitted.title'), navigation);

	static propTypes = {
		/**
		/* navigation object required to push and pop other views
		*/
		navigation: PropTypes.object,
		/**
		/* String that represents the current network
		*/
		network: PropTypes.string
	};

	renderLoader() {
		return (
			<View style={styles.loader}>
				<ActivityIndicator size="small" />
			</View>
		);
	}

	iconSpringVal = new Animated.Value(0.6);

	componentDidMount() {
		this.animateIcon();
	}

	animateIcon() {
		InteractionManager.runAfterInteractions(() => {
			Animated.spring(this.iconSpringVal, {
				toValue: 1,
				friction: 2.5,
				useNativeDriver: true
			}).start();
		});
	}

	goToEtherscan = () => {
		const { navigation } = this.props;
		const hash = navigation.getParam('hash', null);
		const isRopsten = this.props.network === 'ropsten';
		const url = `https://${isRopsten ? 'ropsten.' : ''}etherscan.io/tx/${hash}`;
		this.props.navigation.pop();
		InteractionManager.runAfterInteractions(() => {
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
				<Animated.View
					style={[
						styles.iconWrapper,
						{
							transform: [{ scale: this.iconSpringVal }]
						}
					]}
				>
					<Icon name="check-circle" size={150} style={styles.icon} />
				</Animated.View>
				<StyledButton type={'normal'} onPress={this.goToEtherscan} containerStyle={styles.button}>
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

const mapStateToProps = state => ({ network: state.backgroundState.NetworkController.provider.type });
export default connect(mapStateToProps)(TransactionSubmitted);
