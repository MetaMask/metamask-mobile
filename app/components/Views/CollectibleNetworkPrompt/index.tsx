/* eslint-disable react/prop-types */
import React from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import { getNetworkNavbarOptions } from '../../../components/UI/Navbar';
import { colors } from '../../../styles/common';
import Text from '../../Base/Text';
import CollectibleMedia from '../../../components/UI/CollectibleMedia';
// import { strings } from '../../../../locales/i18n';
import Device from '../../../util/device';

const styles = StyleSheet.create({
	container: {
		backgroundColor: colors.white,
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	// eslint-disable-next-line react-native/no-color-literals
	media: {
		width: Device.getDeviceWidth / 2,
		height: Device.getDeviceWidth / 2,
		borderWidth: 0.5,
		borderColor: '#00000020',
		marginBottom: 12,
	},
});

const CollectibleNetworkPrompt = ({ route }) => {
	const { media } = route.params;
	console.warn(media);

	return (
		<SafeAreaView style={styles.container}>
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
			<Text>{'Collectible Network Prompt'}</Text>
		</SafeAreaView>
	);
};

CollectibleNetworkPrompt.navigationOptions = ({ navigation }) =>
	getNetworkNavbarOptions(`add_asset.create_nft`, true, navigation);

export default CollectibleNetworkPrompt;
