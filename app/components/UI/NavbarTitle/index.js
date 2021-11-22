import React, { useRef } from 'react';
import { useSelector } from 'react-redux';
import { TouchableOpacity, View, StyleSheet, Text } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import Networks from '../../../util/networks';
import { strings } from '../../../../locales/i18n';
import Device from '../../../util/device';
import { useNavigation } from '@react-navigation/core';

const styles = StyleSheet.create({
	wrapper: {
		alignItems: 'center',
		flex: 1,
	},
	network: {
		flexDirection: 'row',
	},
	networkName: {
		fontSize: 11,
		color: colors.grey400,
		...(fontStyles.normal as any),
	},
	networkIcon: {
		width: 5,
		height: 5,
		borderRadius: 100,
		marginRight: 5,
		marginTop: Device.isIos() ? 4 : 5,
	},
	title: {
		fontSize: 18,
		...(fontStyles.normal as any),
		color: colors.black,
	},
	otherNetworkIcon: {
		backgroundColor: colors.transparent,
		borderColor: colors.grey100,
		borderWidth: 1,
	},
});

interface Props {
	/**
	 * Name of the current view
	 */
	title: string;
	/**
	 * Boolean that specifies if the title needs translation
	 */
	translate?: boolean;
	/**
	 * Boolean that specifies if the network can be changed
	 */
	disableNetwork: boolean;
}

/**
 * UI PureComponent that renders inside the navbar
 * showing the view title and the selected network
 */
const NavbarTitle = (props: Props) => {
	const { disableNetwork, title, translate = true } = props;
	const navigation = useNavigation();
	const animatingRef = useRef(false);

	const network = useSelector((state: any) => state.engine.backgroundState.NetworkController);

	const openNetworkList = () => {
		if (!disableNetwork) {
			if (!animatingRef.current) {
				animatingRef.current = true;
				navigation.navigate('NetworkSwitcherModal');
				setTimeout(() => {
					animatingRef.current = false;
				}, 500);
			}
		}
	};

	let name = null;
	const color = (Networks[network.provider.type] && Networks[network.provider.type].color) || null;

	if (network.provider.nickname) {
		name = network.provider.nickname;
	} else {
		name =
			(Networks[network.provider.type] && Networks[network.provider.type].name) ||
			{ ...Networks.rpc, color: null }.name;
	}

	const realTitle = translate ? strings(title) : title;

	return (
		<TouchableOpacity
			onPress={openNetworkList}
			style={styles.wrapper}
			activeOpacity={disableNetwork ? 1 : 0.2}
			testID={'open-networks-button'}
		>
			{title ? (
				<Text numberOfLines={1} style={styles.title}>
					{realTitle}
				</Text>
			) : null}
			<View style={styles.network}>
				<View style={[styles.networkIcon, color ? { backgroundColor: color } : styles.otherNetworkIcon]} />
				<Text style={styles.networkName} testID={'navbar-title-network'}>
					{name}
				</Text>
			</View>
		</TouchableOpacity>
	);
};

export default NavbarTitle;
