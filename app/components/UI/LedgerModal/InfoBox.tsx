import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Text from '../../Base/Text';
import { mockTheme, useAppThemeFromContext } from '../../../util/theme';
import { Colors } from '../../../util/theme/models';
import { strings } from '../../../../locales/i18n';

const createStyles = (colors: Colors) =>
	StyleSheet.create({
		infoBoxContainer: {
			backgroundColor: '#367bcf14',
			minWidth: '70%',
			marginTop: 35,
			alignItems: 'center',
			borderRadius: 10,
			borderColor: '#367bcf33',
			borderWidth: 1,
		},
		infoBoxText: {
			marginVertical: 15,
			marginHorizontal: 10,
		},
	});

const InfoBox = () => {
	const { colors } = useAppThemeFromContext() || mockTheme;
	const styles = useMemo(() => createStyles(colors), [colors]);
	return (
		<View style={styles.infoBoxContainer}>
			<View style={styles.infoBoxText}>
				<Text bold>• {strings('ledger.bluetooth_enabled_message')}</Text>
				<Text bold>• {strings('ledger.device_unlocked_message')}</Text>
				<Text bold>• {strings('ledger.blind_signing_message')}</Text>
			</View>
		</View>
	);
};

export default InfoBox;
