import React, { PureComponent } from 'react';
import { ActivityIndicator, SafeAreaView, Image, Text, View, StyleSheet, Platform } from 'react-native';
import { colors, fontStyles } from '../../../../styles/common';
import PropTypes from 'prop-types';
import StyledButton from '../../../UI/StyledButton';
import DeviceSize from '../../../../util/DeviceSize';
import { strings } from '../../../../../locales/i18n';
import AsyncStorage from '@react-native-community/async-storage';
import { delay } from '../../../../core/InstaPay/utils';


const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.white,
		paddingBottom: DeviceSize.isIphoneX() ? 32 : 8
	},
	frame: {
		justifyContent: 'center',
		marginTop: DeviceSize.isSmallDevice() ? 5 : 80,
		marginBottom: 10,
		marginHorizontal: 35,
		alignSelf: 'center',
		width: DeviceSize.isSmallDevice() ? '80%' : '100%'
	},
	content: {
		flex: 1,
		marginHorizontal: 25,
		marginVertical: DeviceSize.isIphoneX() ? 10 : 0
	},
	text: {
		...fontStyles.normal,
		fontSize: 16,
		lineHeight: 24,
		color: colors.fontPrimary,
		textAlign: 'center'
	},
	text2: {
		marginTop: 30
	},
	title: {
		fontSize: 24,
		...fontStyles.bold,
		color: colors.fontPrimary,
		textAlign: 'center',
		marginBottom: 20
	},
	button: {
		flexDirection: 'row',
		alignSelf: 'center',
		width: '100%'
	},
	buttonWrapper: {
		margin: 30,
		marginBottom: 30
	},
	spacer: {
		marginTop: Platform.OS === 'ios' ? 24 : 14,
		height: 50
	}
});

const welcomeImage = require('../../../../images/payment-channel-welcome.png'); // eslint-disable-line import/no-commonjs

/**
 * View show a welcome screen for payment channels
 */
export default class InstaPayWelcome extends PureComponent {
	static propTypes = {
		/**
		 * The navigator object
		 */
		navigation: PropTypes.object
	};

	constructor(props) {
		super(props);
		this.state = {
			migrated: false,
			needsMigration: 'checking',
			loading: false
		};
	}

	componentDidMount() {
		this.checkMigrationStatus();
	}

	checkMigrationStatus = async () => {
		const instapayVersion = await AsyncStorage.getItem('@MetaMask:InstaPayVersion');
		if (instapayVersion) {
			this.setState({migrated: true});
		} else {
			this.checkIfMigrationNeeded();
		}
	};

	checkIfMigrationNeeded = () => {
		// TODO CHECK IF ANY ACCOUNT ON V1 HAS A BALANCE

	}

	next = async () => {
		if(this.state.migrated){
			this.close()
		} else {
			if(this.state.needsMigration  === 'checking'){
				this.setState({loading: true});
			}
			// Wait until we figure out the balances
			while(this.state.needsMigration  === 'checking'){
				await delay(500);
			}

			this.setState({loading: false});

			if(this.state.needsMigration === 'needed'){
				this.props.navigation.navigate('InstaPayUpdate');
			} else {
				this.close();
			}
		}

	};

	close = () => {
		this.props.navigation.popToTop();
		this.props.navigation.goBack(null);
	};

	render() {
		return (
			<SafeAreaView style={styles.container}>
				<View style={styles.content}>
					<View style={styles.spacer} />
					<Text style={styles.title}>{strings('payment_channel.welcome.title')}</Text>
					<Text style={styles.text}>{strings('payment_channel.welcome.desc_1')}</Text>
					<Text style={[styles.text, styles.text2]}>{strings('payment_channel.welcome.desc_2')}</Text>
					<Image source={welcomeImage} style={styles.frame} resizeMode={'contain'} />
				</View>
				<View style={styles.buttonWrapper}>

						<StyledButton type={'normal'} onPress={this.next} containerStyle={styles.button}>
							{this.state.loading ? (
								<ActivityIndicator size="small" color="white" />
								) : (
									strings('payment_channel.welcome.next')
								)}
						</StyledButton>

				</View>
			</SafeAreaView>
		);
	}
}
