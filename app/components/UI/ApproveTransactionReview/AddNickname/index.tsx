import React from 'react';
import { SafeAreaView, View, StyleSheet, TextInput } from 'react-native';
import AntDesignIcon from 'react-native-vector-icons/AntDesign';
import { colors, fontStyles } from '../../../../styles/common';
import EthereumAddress from '../../EthereumAddress';
import StyledButton from '../../StyledButton';
import Text from '../../../Base/Text';
import { strings } from '../../../../../locales/i18n';

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	headerWrapper: {
		position: 'relative',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginHorizontal: 15,
		marginVertical: 5,
		paddingVertical: 10,
	},
	icon: {
		position: 'absolute',
		right: 0,
		padding: 10,
	},
	headerText: {
		color: colors.black,
		textAlign: 'center',
		fontSize: 15,
	},
	addressWrapper: {
		backgroundColor: colors.blue000,
		borderRadius: 40,
		paddingVertical: 5,
		paddingHorizontal: 15,
	},
	address: {
		fontSize: 12,
		color: colors.grey400,
		// ...fontStyles.normal,
		letterSpacing: 0.8,
	},
	label: {
		fontSize: 14,
		paddingVertical: 12,
		color: colors.fontPrimary,
		...fontStyles.bold,
	},
	input: {
		...fontStyles.normal,
		fontSize: 12,
		borderColor: colors.grey200,
		borderRadius: 5,
		borderWidth: 2,
		padding: 10,
		flexDirection: 'row',
		alignItems: 'center',
	},
	bodyWrapper: {
		marginHorizontal: 20,
		marginBottom: 'auto',
	},
	updateButton: {
		marginHorizontal: 20,
	},
});

interface HeaderProps {
	onUpdateContractNickname: () => void;
}

interface AddNicknameProps {
	onUpdateContractNickname: () => void;
	contractAddress: string;
}

const Header = (props: HeaderProps) => {
	const { onUpdateContractNickname } = props;
	return (
		<View style={styles.headerWrapper}>
			<Text style={styles.headerText}>Add nickname</Text>
			<AntDesignIcon name={'close'} size={20} style={styles.icon} onPress={() => onUpdateContractNickname()} />
		</View>
	);
};

const AddNickname = (props: AddNicknameProps) => {
	const { onUpdateContractNickname, contractAddress } = props;
	const [nickname, setNickname] = React.useState('');
	return (
		<SafeAreaView style={styles.container}>
			<Header onUpdateContractNickname={onUpdateContractNickname} />
			<View style={styles.bodyWrapper}>
				<Text style={styles.label}>{strings('address_book.name')}</Text>
				<View style={styles.addressWrapper}>
					<EthereumAddress address={contractAddress} style={styles.address} />
				</View>
				<Text style={styles.label}>{strings('address_book.name')}</Text>
				<TextInput
					autoCapitalize={'none'}
					autoCorrect={false}
					onChangeText={setNickname}
					placeholder={strings('address_book.nickname')}
					placeholderTextColor={colors.grey100}
					spellCheck={false}
					numberOfLines={1}
					style={styles.input}
					value={nickname}
					testID={'contact-name-input'}
				/>
			</View>
			<View style={styles.updateButton}>
				<StyledButton
					type={'confirm'}
					// containerStyle={styles.addContact}
					// onPress={() => {}}
					testID={'add-contact-button'}
				>
					{strings('address_book.add_contact')}
				</StyledButton>
			</View>
		</SafeAreaView>
	);
};

export default AddNickname;
