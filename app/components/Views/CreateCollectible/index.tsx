import React, { useCallback, useState } from 'react';
import { View, StyleSheet, TextInput, Platform } from 'react-native';
import PropTypes from 'prop-types';
import { getNetworkNavbarOptions } from '../../../components/UI/Navbar';
import { colors, fontStyles } from '../../../styles/common';
import Text from '../../Base/Text';
import AssetActionButton from '../../../components/UI/AssetActionButton';
import MediaSelector from '../../../components/UI/MediaSelector';
import ActionView from '../../../components/UI/ActionView';
import { strings } from '../../../../locales/i18n';

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
		marginBottom: 20,
		...fontStyles.normal,
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
});

const CreateCollectible = ({ navigation }) => {
	const [media, setMedia] = useState('');
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [traits, setTraits] = useState([{ trait_type: '', value: '' }]);

	const addTrait = useCallback(() => {
		const newTraits = [...traits, { trait_type: '', value: '' }];
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
			newTraits[index].trait_type = value;
			setTraits(newTraits);
		},
		[traits]
	);

	const setMediaToSend = useCallback((mediaToSend) => {
		setMedia(mediaToSend);
	}, []);

	const handleSubmit = useCallback(async () => {
		const formData = new FormData();

		const params = {
			name: media.fileName || 'nft',
			type: media.type,
			uri: Platform.OS === 'ios' ? media.uri.replace('file://', '') : media.uri,
		};
		console.log('params', params);
		formData.append('file', params);

		const ipfsAddMediaResponse = await fetch('https://ipfs.infura.io:5001/api/v0/add', {
			method: 'POST',
			body: formData,
		});
		const ipfsAddMediaResponseJson = await ipfsAddMediaResponse.json();

		console.log(ipfsAddMediaResponseJson);

		const metadata = { name, description, image: `ipfs://${ipfsAddMediaResponseJson.Hash}` };
		console.log('metadata', metadata, JSON.stringify(metadata));

		try {
			const formDataMetadata = new FormData();
			formDataMetadata.append('file', JSON.stringify(metadata));
			const ipfsAddMetadataResponse = await fetch('https://ipfs.infura.io:5001/api/v0/add', {
				method: 'POST',
				body: formDataMetadata,
			});
			const ipfsAddMetadataResponseJson = await ipfsAddMetadataResponse.json();

			console.log(ipfsAddMetadataResponseJson);
		} catch (e) {
			console.log('ERROR', e);
		}
	}, [description, media, name]);

	const handleCancel = useCallback(() => {
		navigation.goBack();
	}, [navigation]);

	return (
		<ActionView
			style={styles.wrapper}
			cancelTestID={'create-custom-asset-cancel-button'}
			confirmTestID={'creaate-custom-asset-confirm-button'}
			cancelText={strings('add_asset.collectibles.cancel_add_collectible')}
			confirmText={'Create NFT'}
			onCancelPress={handleCancel}
			onConfirmPress={handleSubmit}
		>
			<View style={styles.container}>
				<Text>NFT Image or Video</Text>
				<MediaSelector setMediaToSend={setMediaToSend} />
				<Text>Name</Text>
				<TextInput
					style={styles.textInput}
					placeholder={'Name'}
					placeholderTextColor={colors.grey100}
					value={name}
					onChangeText={(value) => setName(value)}
				/>
				<Text>Description</Text>
				<TextInput
					style={styles.textInput}
					placeholder={'Description'}
					placeholderTextColor={colors.grey100}
					value={description}
					onChangeText={(value) => setDescription(value)}
				/>
				<Text>Attributes</Text>
				{traits.map((trait, index) => (
					<View style={styles.traitsRow} key={index}>
						<TextInput
							style={[styles.textInput, styles.traitKey]}
							placeholder={'Trait Type'}
							placeholderTextColor={colors.grey100}
							value={trait.trait_type}
							onChangeText={(value) => changeTraitType(index, value)}
						/>
						<TextInput
							style={[styles.textInput, styles.traitValue]}
							placeholder={'Value'}
							placeholderTextColor={colors.grey100}
							value={trait.value}
							onChangeText={(value) => changeTraitValue(index, value)}
						/>
					</View>
				))}
				<AssetActionButton icon="add" label={'Add another trait'} onPress={addTrait} />
			</View>
		</ActionView>
	);
};

CreateCollectible.propTypes = {
	navigation: PropTypes.object,
};

CreateCollectible.navigationOptions = ({ navigation }) =>
	getNetworkNavbarOptions(`add_asset.create_nft`, true, navigation);

export default CreateCollectible;
