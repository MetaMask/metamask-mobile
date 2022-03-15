import React, { useCallback, useEffect } from 'react';
import { getSendFlowTitle } from '../../../UI/Navbar';
import QRSigningDetails from '../../../UI/QRHardware/QRSigningDetails';
import { mockTheme, useAppThemeFromContext } from '../../../../util/theme';

interface IConnectQRHardwareProps {
	navigation: any;
	route: any;
}

const QRHardwareSigner = ({ navigation, route }: IConnectQRHardwareProps) => {
	const QRState = route.params.QRState;

	const { colors } = useAppThemeFromContext() || mockTheme;

	const updateNavBar = useCallback(() => {
		navigation.setOptions(getSendFlowTitle('send.sign', navigation, route, colors));
	}, [colors, navigation, route]);

	useEffect(() => {
		updateNavBar();
	}, [updateNavBar]);

	const cancelCallback = useCallback(() => {
		navigation.goBack();
	}, [navigation]);

	const successCallback = useCallback(() => {
		navigation.goBack();
	}, [navigation]);

	return (
		<QRSigningDetails
			QRState={QRState}
			confirmButtonMode={'sign'}
			cancelCallback={cancelCallback}
			successCallback={successCallback}
		/>
	);
};

export default QRHardwareSigner;
