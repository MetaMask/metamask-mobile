import React, { Component } from 'react';
import {
	BackHandler,
	TouchableOpacity,
	InteractionManager,
	Animated,
	Platform,
	Text,
	ActivityIndicator,
	View,
	SafeAreaView,
	StyleSheet
} from 'react-native';
import { withNavigation } from 'react-navigation';

import Icon from 'react-native-vector-icons/FontAwesome';
import IonIcon from 'react-native-vector-icons/Ionicons';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { strings } from '../../../../locales/i18n';
import { colors, fontStyles } from '../../../styles/common';
import StyledButton from '../../UI/StyledButton';
import { getEtherscanTransactionUrl } from '../../../util/etherscan';
import { hasBlockExplorer } from '../../../util/networks';

const styles = StyleSheet.create({
	mainWrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	wrapper: {
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
	},
	closeIcon: {
		marginLeft: 20
	}
});

/**
 * Component that provides ability to render transaction submitted view
 */
class TransactionSubmitted extends Component {
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

	componentDidMount() {
		BackHandler.addEventListener('hardwareBackPress', this.handleBackPress);
		this.animateIcon();
	}

	componentWillUnmount() {
		BackHandler.removeEventListener('hardwareBackPress', this.handleBackPress);
	}

	handleBackPress = () => {
		this.goBack();
		return true;
	};

	renderLoader() {
		return (
			<View style={styles.loader}>
				<ActivityIndicator size="small" />
			</View>
		);
	}

	iconSpringVal = new Animated.Value(0.4);

	goBack = () => {
		this.props.navigation.popToTop();
	};

	animateIcon() {
		Animated.spring(this.iconSpringVal, {
			toValue: 1,
			friction: 2,
			useNativeDriver: true,
			isInteraction: false
		}).start();
	}

	goToEtherscan = () => {
		const { navigation, network } = this.props;
		const hash = navigation.getParam('hash', null);
		const url = getEtherscanTransactionUrl(network, hash);
		InteractionManager.runAfterInteractions(() => {
			this.props.navigation.push('BrowserView', {
				url,
				title: 'etherscan.io'
			});
		});
	};

	renderView(hash) {
		return (
			<View style={styles.content}>
				<Text style={styles.subtitle}>{strings('transaction_submitted.your_tx_hash_is')}</Text>
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
				{hasBlockExplorer(this.props.network) && (
					<StyledButton type={'normal'} onPress={this.goToEtherscan} containerStyle={styles.button}>
						{strings('transaction_submitted.view_on_etherscan')}
					</StyledButton>
				)}
			</View>
		);
	}

	render = () => {
		const { navigation } = this.props;
		const hash = navigation.getParam('hash', null);

		return (
			<SafeAreaView style={styles.mainWrapper}>
				<View>
					<TouchableOpacity style={styles.closeIcon} onPress={this.goBack}>
						<IonIcon name={'ios-close'} size={50} color={colors.primary} />
					</TouchableOpacity>
				</View>
				<View style={styles.wrapper} testID={'transaction-submitted-screen'}>
					{hash ? this.renderView(hash) : this.renderLoader()}
				</View>
			</SafeAreaView>
		);
	};
}

const mapStateToProps = state => ({ network: state.engine.backgroundState.NetworkController.provider.type });
export default connect(mapStateToProps)(withNavigation(TransactionSubmitted));
