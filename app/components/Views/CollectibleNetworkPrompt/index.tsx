/* eslint-disable react/prop-types */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { getNetworkNavbarOptions } from '../../../components/UI/Navbar';
import { colors } from '../../../styles/common';
import Text from '../../Base/Text';
import CollectibleMedia from '../../../components/UI/CollectibleMedia';
import StyledButton from '../../UI/StyledButton';

// import { strings } from '../../../../locales/i18n';
import Device from '../../../util/device';

const usableWidth = Device.getDeviceWidth() - 80;

const styles = StyleSheet.create({
	container: {
		backgroundColor: colors.white,
		flex: 1,
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingBottom: 30,
	},
	main: {
		justifyContent: 'center',
		paddingHorizontal: 40,
	},
	// eslint-disable-next-line react-native/no-color-literals
	media: {
		width: usableWidth,
		height: usableWidth,
		borderWidth: 0.5,
		borderColor: '#00000020',
		marginBottom: 8,
		alignSelf: 'center',
	},
	nftInfo: {
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
		marginBottom: 24,
	},
	networkContainer: {
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 12,
	},
	network: {
		fontSize: 24,
	},
	description: {
		marginBottom: 8,
	},
	pixel: {
		height: 1,
		width: 1,
	},
	// differentNetwork: {
	// 	marginBottom: 16,
	// },
	row: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		width: usableWidth,
	},
});

const CollectibleNetworkPrompt = ({ route }) => {
	const { media, name, description, traits } = route.params;

	return (
		<View style={styles.container}>
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

				<View style={styles.nftInfo}>
					<Text bold style={styles.network}>
						{name}
					</Text>
					<Text bold>{'Description'}</Text>
					<Text style={styles.description}>{description}</Text>
					{traits.map(({ trait_type, value }, index) => (
						<View style={styles.row} key={index}>
							<Text bold>{trait_type}</Text>
							<Text>{value}</Text>
						</View>
					))}
				</View>

				<View style={styles.networkContainer}>
					<Text small disclaimer grey centered>
						{
							"We are using Rarible's Lazy minting so the gas is free for now. You will only pay gas fee once you sell the NFT."
						}
					</Text>
				</View>

				{/* <View style={styles.differentNetwork}>
					<Text small blue>
						{'Use a different network'}
					</Text>
				</View> */}

				{/* <Text small centered grey>
					{
						'Ethereum Mainnet is the gold standard for NFTs but gas fees can be high. NFTs created on Ethereum Mainnet are available for use on NFT marketplaces like OpenSea.'
					}
				</Text> */}
			</View>

			<StyledButton type={'sign'} onPress={() => null}>
				{'Lazy mint on Rarible'}
			</StyledButton>
		</View>
	);
};

CollectibleNetworkPrompt.navigationOptions = ({ navigation }) =>
	getNetworkNavbarOptions(`add_asset.create_nft`, true, navigation);

export default CollectibleNetworkPrompt;
