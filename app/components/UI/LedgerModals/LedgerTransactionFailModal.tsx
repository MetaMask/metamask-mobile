import React, { useMemo } from 'react';
import { Image, SafeAreaView, StyleSheet, View } from 'react-native';
import { mockTheme, useAppThemeFromContext } from '../../../util/theme';
import Text from '../../Base/Text';
import StyledButton from '../StyledButton';
import { strings } from '../../../../locales/i18n';
import { Colors } from '../../../util/theme/models';
import InfoBox from './InfoBox';
import Device from '../../../util/device';

const createStyles = (colors: Colors) =>
	StyleSheet.create({
		wrapper: {
			backgroundColor: colors.background.default,
			borderTopLeftRadius: 10,
			borderTopRightRadius: 10,
			minHeight: 400,
		},
		contentWrapper: {
			flex: 1,
			alignItems: 'center',
			marginTop: 35,
		},
		confirmTransactionTextContainer: {
			marginTop: 10,
		},
		activityIndicatorContainer: {
			marginTop: 35,
		},
		buttonContainer: {
			marginTop: 35,
			width: '90%',
			flexDirection: 'row',
			justifyContent: 'space-evenly',
		},
		buttonStyle: {
			width: Device.getDeviceWidth() * 0.3,
		},
	});

const ledgerConnectImage = require('../../../images/ledger-connect-error.png');

const LedgerTransactionFailModal = () => {
	const { colors } = useAppThemeFromContext() || mockTheme;
	const styles = useMemo(() => createStyles(colors), [colors]);

	return (
		<SafeAreaView style={styles.wrapper}>
			<View style={styles.contentWrapper}>
				<Image source={ledgerConnectImage} />
				<View style={styles.confirmTransactionTextContainer}>
					<Text bold big>
						{strings('ledger.confirm_transaction_on_ledger')}
					</Text>
				</View>
				<InfoBox />
				<View style={styles.buttonContainer}>
					<StyledButton type="cancel" onPress={() => null} style={styles.buttonStyle}>
						{strings('transaction.reject')}
					</StyledButton>
					<StyledButton type="blue" onPress={() => null} style={styles.buttonStyle}>
						{strings('transaction.reject')}
					</StyledButton>
				</View>
			</View>
		</SafeAreaView>
	);
};

export default LedgerTransactionFailModal;
