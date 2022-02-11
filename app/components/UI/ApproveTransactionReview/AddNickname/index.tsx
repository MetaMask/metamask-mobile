import React from 'react';
import { SafeAreaView, View, StyleSheet, TextInput } from 'react-native';
import AntDesignIcon from 'react-native-vector-icons/AntDesign';
import { colors, fontStyles } from '../../../../styles/common';
import EthereumAddress from '../../EthereumAddress';
import Engine from '../../../../core/Engine';
import AnalyticsV2 from '../../../../util/analyticsV2';
import { toChecksumAddress } from 'ethereumjs-util';
import { connect } from 'react-redux';
import StyledButton from '../../StyledButton';
import Text from '../../../Base/Text';
import { showSimpleNotification } from '../../../../actions/notification';
import Identicon from '../../../UI/Identicon';
import CopyIcon from 'react-native-vector-icons/FontAwesome';
import ExportIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { strings } from '../../../../../locales/i18n';

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.white,
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
	addressWrapperPrimary: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 10,
	},
	addressWrapper: {
		backgroundColor: colors.blue100,
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 40,
		paddingVertical: 10,
		paddingHorizontal: 15,
		width: '90%',
	},
	address: {
		fontSize: 12,
		color: colors.grey400,
		letterSpacing: 0.8,
		marginLeft: 10,
	},
	label: {
		fontSize: 14,
		paddingVertical: 12,
		color: colors.fontPrimary,
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
	addressIdenticon: {
		alignItems: 'center',
		marginVertical: 10,
	},
	actionIcon: {
		color: colors.blue,
	},
});

interface HeaderProps {
	onUpdateContractNickname: () => void;
	nicknameExists: boolean;
}

interface AddNicknameProps {
	onUpdateContractNickname: () => void;
	contractAddress: string;
	network: number;
	nicknameExists: boolean;
	nickname: string;
	addressBook: [];
}

const Header = (props: HeaderProps) => {
	const { onUpdateContractNickname, nicknameExists } = props;
	return (
		<View style={styles.headerWrapper}>
			<Text bold style={styles.headerText}>
				{nicknameExists ? strings('nickname.edit_nickname') : strings('nickname.add_nickname')}
			</Text>
			<AntDesignIcon name={'close'} size={20} style={styles.icon} onPress={() => onUpdateContractNickname()} />
		</View>
	);
};

const getAnalyticsParams = () => {
	try {
		const { NetworkController } = Engine.context as any;
		const { type } = NetworkController?.state?.provider || {};
		return {
			network_name: type,
		};
	} catch (error) {
		return {};
	}
};

const AddNickname = (props: AddNicknameProps) => {
	const { onUpdateContractNickname, contractAddress, network, nicknameExists, nickname } = props;
	const [newNickname, setNewNickname] = React.useState(nickname);

	const saveTokenNickname = () => {
		const { AddressBookController } = Engine.context;
		if (!newNickname || !contractAddress) return;
		AddressBookController.set(toChecksumAddress(contractAddress), newNickname, network);
		onUpdateContractNickname();
		AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.CONTRACT_ADDRESS_NICKNAME, getAnalyticsParams());
	};

	return (
		<SafeAreaView style={styles.container}>
			<Header onUpdateContractNickname={onUpdateContractNickname} nicknameExists={nicknameExists} />
			<View style={styles.bodyWrapper}>
				<View style={styles.addressIdenticon}>
					<Identicon address={contractAddress} diameter={25} />
				</View>
				<Text style={styles.label}>{strings('nickname.address')}</Text>
				<View style={styles.addressWrapperPrimary}>
					<View style={styles.addressWrapper}>
						<CopyIcon style={styles.actionIcon} name="copy" size={18} />
						<EthereumAddress address={contractAddress} type="mid" style={styles.address} />
					</View>
					<ExportIcon style={styles.actionIcon} name="export-variant" size={22} />
				</View>
				<Text style={styles.label}>{strings('nickname.name')}</Text>
				<TextInput
					autoCapitalize={'none'}
					autoCorrect={false}
					onChangeText={setNewNickname}
					placeholder={strings('nickname.name_placeholder')}
					placeholderTextColor={colors.grey100}
					spellCheck={false}
					numberOfLines={1}
					style={styles.input}
					value={newNickname}
					testID={'contact-name-input'}
				/>
			</View>
			<View style={styles.updateButton}>
				<StyledButton
					type={'confirm'}
					disabled={!newNickname}
					onPress={saveTokenNickname}
					testID={'nickname.save_nickname'}
				>
					{strings('nickname.save_nickname')}
				</StyledButton>
			</View>
		</SafeAreaView>
	);
};

const mapStateToProps = (state: any) => ({
	addressBook: state.engine.backgroundState.AddressBookController.addressBook,
	network: state.engine.backgroundState.NetworkController.network,
});

const mapDispatchToProps = (dispatch: any) => ({
	showSimpleNotification: (notification: Notification) => dispatch(showSimpleNotification(notification)),
});

export default connect(mapStateToProps, mapDispatchToProps)(AddNickname);
