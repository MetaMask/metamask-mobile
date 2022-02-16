import React, { useCallback } from 'react';
import { getSendFlowTitle } from '../../../UI/Navbar';
import QRSigningDetails from '../../../UI/QRHardware/QRSigningDetails';

interface IConnectQRHardwareProps {
	navigation: any;
	route: any;
}

const QRHardwareSigner = ({ navigation, route }: IConnectQRHardwareProps) => {
	const QRState = route.params?.QRState;

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

QRHardwareSigner.navigationOptions = ({ navigation, route }: IConnectQRHardwareProps) =>
	getSendFlowTitle('send.sign', navigation, route);

export default QRHardwareSigner;
