import React, { useCallback, useRef, useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { getNetworkNavbarOptions } from '../../../components/UI/Navbar';
import { colors, fontStyles } from '../../../styles/common';
import Text from '../../Base/Text';
import AssetActionButton from '../../../components/UI/AssetActionButton';
import ActionSheet from 'react-native-actionsheet';
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
	mediaButton: {
		borderWidth: 1,
		borderColor: colors.blue,
		padding: 30,
		borderRadius: 5,
		marginBottom: 20,
	},
	buttonText: {
		color: colors.blue,
		fontSize: 16,
		textAlign: 'center',
	},
});

const CreateCollectible = () => {
	//const [mediaURL, setMediaURL] = useState('');
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [traits, setTraits] = useState([{ trait_type: '', value: '' }]);

	const actionSheetRef = useRef();

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

	return (
		<View style={styles.wrapper}>
			<Text>NFT Image or Video</Text>
			<TouchableOpacity style={styles.mediaButton} onPress={() => actionSheetRef.current?.show()}>
				<Text style={styles.buttonText}>Choose NFT Media</Text>
			</TouchableOpacity>

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
			<Text>Traits</Text>
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

			<ActionSheet
				ref={actionSheetRef}
				title={'Select action'}
				options={[strings('wallet.cancel'), 'Take image', 'Record video', 'Select from gallery']}
				cancelButtonIndex={0}
				// eslint-disable-next-line react/jsx-no-bind
				onPress={() => null}
			/>
		</View>
	);
};

CreateCollectible.navigationOptions = ({ navigation }) =>
	getNetworkNavbarOptions(`add_asset.create_nft`, true, navigation);

export default CreateCollectible;
