/* eslint-disable react/prop-types */
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { getNetworkNavbarOptions } from '../../../components/UI/Navbar';
import { colors } from '../../../styles/common';
import Text from '../../Base/Text';
import CollectibleMedia from '../../../components/UI/CollectibleMedia';
import StyledButton from '../../UI/StyledButton';
import Engine from '../../../core/Engine';
import SelectComponent from '../../UI/SelectComponent';

// import { strings } from '../../../../locales/i18n';
import Device from '../../../util/device';

const usableWidth = Device.getDeviceWidth() - 80;

const styles = StyleSheet.create({
	container: {
		backgroundColor: colors.white,
		minHeight: '100%',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 30,
		paddingTop: 10,
	},
	main: {
		justifyContent: 'center',
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
	description: {
		marginBottom: 8,
	},
	networkContainer: {
		justifyContent: 'center',
		alignItems: 'center',
	},
	network: {
		fontSize: 24,
	},
	networkDescription: {
		paddingVertical: 20,
		paddingHorizontal: 10,
	},
	pixel: {
		height: 1,
		width: 1,
	},
	row: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		width: usableWidth,
	},
	picker: {
		borderColor: colors.grey200,
		borderRadius: 5,
		borderWidth: 2,
		width: '80%',
		minWidth: 250,
		height: 44,
	},
});

const CollectibleNetworkPrompt = ({ route }) => {
	const { navigation, media, name, description, traits, tokenUri, imageUri } = route.params;
	const mintOptions = [
		{
			value: 'MetaMaskMint',
			label: 'MetaMask Mint',
			key: 'MetaMaskMint',
			description: `By Minting with MetaMask you'll deploy your own smart contract to the blockchain and the NFT will be available for use on NFT marketplaces. You'll need to pay network gas fees to deploy the contract - those are not MetaMask fees.`,
		},
		{
			value: 'RaribleLazyMint',
			label: 'Rarible Lazy Mint',
			key: 'RaribleLazyMint',
			description: `By using Rarible's Lazy minting the gas is free for now. You will only pay a gas fee once you sell the NFT and it gets added to the blockchain. Your NFT might not show up in other wallets and marketplaces before that.`,
		},
	];
	const [mintOption, setMintOption] = useState('MetaMaskMint');

	const mint = async () => {
		const { CollectibleMintingController, CollectiblesController } = Engine.context as any;
		const lazyMinting = true;

		const response = await CollectibleMintingController.mint(
			tokenUri,
			{ nftType: 'rarible' },
			{
				royalties: [],
				creatorProfitPercentage: 10000,
				lazy: lazyMinting,
			}
		);

		const { contract, tokenId } = response;
		CollectiblesController.addCollectible(contract, tokenId, { name, description, image: imageUri });
		navigation?.popToTop();
	};

	const selectOption = (selection: string) => {
		setMintOption(selection);
	};

	return (
		<ScrollView contentContainerStyle={styles.container}>
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
					{traits.map(({ title, value }, index) => (
						<View style={styles.row} key={index}>
							<Text bold>{title}</Text>
							<Text>{value}</Text>
						</View>
					))}
				</View>

				<View style={styles.networkContainer}>
					<Text small disclaimer grey centered>
						{'Choose how you want to mint your NFT'}
					</Text>
				</View>
			</View>

			<View style={styles.picker}>
				<SelectComponent
					selectedValue={mintOption}
					onValueChange={selectOption}
					label={'Select A Minting Option'}
					options={mintOptions}
				/>
			</View>

			<Text small centered grey style={styles.networkDescription}>
				{mintOptions.find((option) => option.value === mintOption)?.description}
			</Text>

			<StyledButton type={'sign'} onPress={mint}>
				{'Mint NFT'}
			</StyledButton>
		</ScrollView>
	);
};

CollectibleNetworkPrompt.navigationOptions = ({ navigation }) =>
	getNetworkNavbarOptions(`add_asset.create_nft`, true, navigation);

export default CollectibleNetworkPrompt;
