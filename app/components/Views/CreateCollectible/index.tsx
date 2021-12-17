import React, { useCallback, useState } from 'react';
import { View, StyleSheet, TextInput, Platform, ActivityIndicator } from 'react-native';
import { getNetworkNavbarOptions } from '../../../components/UI/Navbar';
import { colors, fontStyles } from '../../../styles/common';
import Text from '../../Base/Text';
import MediaSelector from '../../../components/UI/MediaSelector';
import ActionView from '../../../components/UI/ActionView';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { strings } from '../../../../locales/i18n';
import Engine from '../../../core/Engine';
import { NftMediaData, NftMetaData } from '@metamask/controllers/src/assets/CollectibleMintingController';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
		padding: 20,
	},
	textInput: {
		borderWidth: 1,
		borderRadius: 4,
		borderColor: colors.grey100,
		padding: 16,
		marginTop: 8,
		marginBottom: 20,
		...fontStyles.normal,
	},
	description: {
		minHeight: 90,
		paddingTop: 16,
	},
	traitKey: {
		flex: 1,
		marginRight: 6,
	},
	traitValue: {
		flex: 1,
	},
	traitsRow: {
		flexDirection: 'row',
	},
	container: {
		marginBottom: 50,
	},
	indicatorContainer: {
		flex: 1,
		backgroundColor: colors.white,
		justifyContent: 'center',
		alignItems: 'center',
	},
});

// eslint-disable-next-line react/prop-types
const CreateCollectible = ({ navigation }) => {
	const [media, setMedia] = useState('');
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [traits, setTraits] = useState([{ name: '', value: '' }]);
	const [isUploading, setIsUploading] = useState(false);

	const addTrait = useCallback(() => {
		const newTraits = [...traits, { name: '', value: '' }];
		setTraits(newTraits);
	}, [traits]);

	const changeTraitValue = useCallback(
		(index, value) => {
			const newTraits = [...traits];
			newTraits[index].value = value;
			setTraits(newTraits);
		},
		[traits]
	);

	const changeTraitType = useCallback(
		(index, value) => {
			const newTraits = [...traits];
			newTraits[index].name = value;
			setTraits(newTraits);
		},
		[traits]
	);

	const setMediaToSend = useCallback((mediaToSend) => {
		setMedia(mediaToSend);
	}, []);

	const handleSubmit = useCallback(async () => {
		setIsUploading(true);
		try {
			const params: NftMediaData = {
				name: media.fileName || 'nft',
				type: media.type,
				uri: Platform.OS === 'ios' ? media.uri.replace('file://', '') : media.uri,
			};

			const { CollectibleMintingController } = Engine.context as any;

			const ipfsAddMediaResponse = await CollectibleMintingController.uploadDataToIpfs(params);

			const metadata: NftMetaData = { name, description, image: `ipfs://${ipfsAddMediaResponse.Hash}` };

			const ipfsAddMetadataResponse = await CollectibleMintingController.uploadDataToIpfs(metadata);
			const tokenUri = `ipfs://${ipfsAddMetadataResponse.Hash}`;

			setIsUploading(false);
			navigation.push('CollectibleNetworkPrompt', {
				navigation,
				media,
				name,
				description,
				traits,
				tokenUri,
				imageUri: `ipfs://${ipfsAddMediaResponse.Hash}`,
			});
		} catch (e) {
			// eslint-disable-next-line no-console
			console.log('ERROR', e);
		}
	}, [description, media, name, navigation, traits]);

	return isUploading ? (
		<View style={styles.indicatorContainer}>
			<ActivityIndicator color={colors.blue} />
			<Text small blue>{`Uploading to IPFS`}</Text>
		</View>
	) : (
		<ActionView
			style={styles.wrapper}
			cancelTestID={'create-custom-asset-cancel-button'}
			confirmTestID={'creaate-custom-asset-confirm-button'}
			confirmText={strings('wallet.button_continue')}
			onConfirmPress={handleSubmit}
			showCancelButton={false}
			confirmDisabled={!name}
			confirmButtonMode={'sign'}
		>
			<View style={styles.container}>
				<MediaSelector setMediaToSend={setMediaToSend} />
				<Text bold>{`${strings('wallet.name')}*`}</Text>
				<TextInput
					style={styles.textInput}
					placeholder={strings('wallet.name_nft')}
					placeholderTextColor={colors.grey100}
					value={name}
					onChangeText={(value) => setName(value)}
				/>
				<Text bold>{strings('wallet.description')}</Text>
				<TextInput
					style={[styles.textInput, styles.description]}
					placeholder={strings('wallet.enter_description')}
					placeholderTextColor={colors.grey100}
					value={description}
					onChangeText={(value) => setDescription(value)}
					multiline
					numberOfLines={3}
				/>
				<Text bold>{strings('wallet.attributes')}</Text>
				{traits.map((trait, index) => (
					<View style={styles.traitsRow} key={index}>
						<TextInput
							style={[styles.textInput, styles.traitKey]}
							placeholder={strings('wallet.type')}
							placeholderTextColor={colors.grey100}
							value={trait.trait_type}
							onChangeText={(value) => changeTraitType(index, value)}
						/>
						<TextInput
							style={[styles.textInput, styles.traitValue]}
							placeholder={strings('wallet.value')}
							placeholderTextColor={colors.grey100}
							value={trait.value}
							onChangeText={(value) => changeTraitValue(index, value)}
						/>
					</View>
				))}
				<TouchableOpacity onPress={addTrait}>
					<Text blue>{`+ ${strings('wallet.add_attribute')}`}</Text>
				</TouchableOpacity>
			</View>
		</ActionView>
	);
};

CreateCollectible.navigationOptions = ({ navigation }) =>
	getNetworkNavbarOptions(`add_asset.create_nft`, true, navigation);

export default CreateCollectible;
