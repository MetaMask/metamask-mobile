/* eslint-disable react/prop-types */
import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { getNetworkNavbarOptions } from '../../../components/UI/Navbar';
import { colors } from '../../../styles/common';
import Text from '../../Base/Text';
import CollectibleMedia from '../../../components/UI/CollectibleMedia';
import StyledButton from '../../UI/StyledButton';

// import { strings } from '../../../../locales/i18n';
import Device from '../../../util/device';

const styles = StyleSheet.create({
	container: {
		backgroundColor: colors.white,
		flex: 1,
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	main: {
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 40,
	},
	// eslint-disable-next-line react-native/no-color-literals
	media: {
		width: Device.getDeviceWidth() / 2,
		height: Device.getDeviceWidth() / 2,
		borderWidth: 0.5,
		borderColor: '#00000020',
		marginBottom: 16,
	},
	selectedNetwork: {
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 12,
	},
	networkContainer: {
		marginBottom: 12,
	},
	network: {
		fontSize: 24,
		lineHeight: 22,
	},
	row: {
		flexDirection: 'row',
		justifyContent: 'center',
	},
	pixel: {
		height: 1,
		width: 1,
	},
	differentNetwork: {
		marginBottom: 16,
	},
});

const GAS_FEE_PLACEHOLDER = '$ChangeME!';

const CollectibleNetworkPrompt = ({ route }) => {
	const { media } = route.params;

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.pixel} />

			<View style={styles.main}>
				<CollectibleMedia
					collectible={{
						name: 'NFT',
						tokenId: 1,
						address: '0x',
						image: media.uri,
						animation: media.uri,
					}}
					cover
					renderAnimation
					style={styles.media}
				/>

				<View style={styles.selectedNetwork}>
					<Text>{'Create NFT on'}</Text>
					<Text bold style={styles.network}>
						{'Ethereum Mainnet'}
					</Text>
				</View>

				<View style={styles.networkContainer}>
					<View style={styles.row}>
						<Text bold grey>
							{'Estimated Gas Fee:'}
						</Text>
						<Text grey>{GAS_FEE_PLACEHOLDER}</Text>
					</View>
					<Text small disclaimer grey>
						{'Gas is a network fee, not a MetaMask fee'}
					</Text>
				</View>

				<View style={styles.differentNetwork}>
					<Text small blue>
						{'Use a different network'}
					</Text>
				</View>

				<Text small centered grey>
					{
						'Ethereum Mainnet is the gold standard for NFTs but gas fees can be high. NFTs created on Ethereum Mainnet are available for use on NFT marketplaces like OpenSea.'
					}
				</Text>
			</View>

			<StyledButton type={'normal'} onPress={() => null}>
				{'Continue on Ethereum Mainnet'}
			</StyledButton>
		</SafeAreaView>
	);
};

CollectibleNetworkPrompt.navigationOptions = ({ navigation }) =>
	getNetworkNavbarOptions(`add_asset.create_nft`, true, navigation);

export default CollectibleNetworkPrompt;
