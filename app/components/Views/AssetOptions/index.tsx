import React, { useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import ReusableModal, { ReusableModalRef } from '../../UI/ReusableModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontStyles } from '../../../styles/common';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RPC } from '../../../constants/network';
import { findBlockExplorerForRpc } from '../../../util/networks';
import { getEtherscanAddressUrl, getEtherscanBaseUrl } from '../../../util/etherscan';
import { strings } from '../../../../locales/i18n';

const styles = StyleSheet.create({
	screen: { justifyContent: 'flex-end' },
	sheet: {
		backgroundColor: colors.white,
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10,
	},
	notch: {
		width: 48,
		height: 5,
		borderRadius: 4,
		backgroundColor: colors.grey,
		marginTop: 16,
		alignSelf: 'center',
		marginBottom: 24,
	},
	divider: {
		height: 1,
		backgroundColor: colors.grey,
	},
	optionButton: {
		height: 60,
		alignItems: 'center',
		justifyContent: 'center',
	},
	optionLabel: {
		...(fontStyles.normal as any),
		color: colors.blue,
		fontSize: 16,
	},
});

interface Option {
	label: string;
	onPress: () => void;
}

interface Props {
	route: {
		params: {
			address: string;
		};
	};
}

const AssetOptions = (props: Props) => {
	const { address } = props.route.params;
	const safeAreaInsets = useSafeAreaInsets();
	const navigation = useNavigation();
	const modalRef = useRef<ReusableModalRef>(null);
	const network = useSelector((state: any) => state.engine.backgroundState.NetworkController);
	const frequentRpcList = useSelector(
		(state: any) => state.engine.backgroundState.PreferencesController.frequentRpcList
	);

	const goToBrowserUrl = (url: string, title: string) => {
		modalRef.current?.dismissModal(() => {
			navigation.navigate('Webview', {
				screen: 'SimpleWebview',
				params: {
					url,
					title,
				},
			});
		});
	};

	const openOnEtherscan = () => {
		const { rpcTarget, type } = network.provider;
		if (network.provider.type === RPC) {
			const blockExplorer = findBlockExplorerForRpc(rpcTarget, frequentRpcList);
			const url = `${blockExplorer}/token/${address}`;
			const title = new URL(blockExplorer).hostname;
			goToBrowserUrl(url, title);
		} else {
			const url = getEtherscanAddressUrl(type, address);
			const etherscanUrl = getEtherscanBaseUrl(type).replace('https://', '');
			goToBrowserUrl(url, etherscanUrl);
		}
	};

	const openTokenDetails = () => {
		modalRef.current?.dismissModal(() => {
			navigation.navigate('AssetDetails');
		});
	};

	const renderOptions = () => {
		const options: Option[] = [
			{ label: strings('asset_details.options.view_on_block'), onPress: openOnEtherscan },
			{ label: strings('asset_details.options.token_details'), onPress: openTokenDetails },
		];
		return (
			<>
				{options.map((option) => {
					const { label, onPress } = option;
					return (
						<View key={label}>
							<View style={styles.divider} />
							<TouchableOpacity style={styles.optionButton} onPress={onPress}>
								<Text style={styles.optionLabel}>{label}</Text>
							</TouchableOpacity>
						</View>
					);
				})}
			</>
		);
	};

	return (
		<ReusableModal ref={modalRef} style={styles.screen}>
			<View style={[styles.sheet, { paddingBottom: safeAreaInsets.bottom }]}>
				<View style={styles.notch} />
				{renderOptions()}
			</View>
		</ReusableModal>
	);
};

export default AssetOptions;
