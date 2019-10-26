import byteArrayToHex from '../../../util/bytes';
import Engine from '../../Engine';
import AsyncStorage from '@react-native-community/async-storage';
const MESSAGE_2_SIGN = 'InstaPayMnemonic';
const SPACE_KEY = 'instapay_data';

export async function encryptMnenomic(encryptor, mnemonic) {
	const password = await signMessageWithAccount0(MESSAGE_2_SIGN);
	return encryptor.encrypt(password, mnemonic);
}

export async function decryptMnemonic(encryptor, encryptedMnemonic) {
	const password = await signMessageWithAccount0(MESSAGE_2_SIGN);
	return encryptor.decrypt(password, encryptedMnemonic);
}

export async function backupMnemonic(space, encryptedMnemonic) {
	return space.privateSetSpace(SPACE_KEY, encryptedMnemonic);
}

export async function getMnemonicFromBackup(space) {
	return space.privateGetSpace(SPACE_KEY);
}

export async function saveMnemonic(encryptor, mnemonic) {
	const encryptedMnemonic = await encryptMnenomic(encryptor, mnemonic);
	return AsyncStorage.setItem('@MetaMask:InstaPayMnemonic', encryptedMnemonic);
}

async function signMessageWithAccount0(message) {
	const { KeyringController } = Engine.context;
	const hexMessage = byteArrayToHex(message);
	const allKeyrings = Engine.context.KeyringController.state.keyrings;
	const accountsOrdered = allKeyrings.reduce((list, keyring) => list.concat(keyring.accounts), []);
	const rawSig = await KeyringController.signPersonalMessage({
		data: hexMessage,
		from: accountsOrdered[0]
	});
	return rawSig;
}
