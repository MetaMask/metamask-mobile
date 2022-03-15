import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'react-native-qrcode-svg';
import { StyleSheet, View } from 'react-native';
import { UR, UREncoder } from '@ngraveio/bc-ur';
import { colors } from '../../../styles/common';

interface IAnimatedQRCodeProps {
	cbor: string;
	type: string;
	pause: boolean;
}

const MAX_FRAGMENT_LENGTH = 400;
const QR_CODE_SIZE = 250;

const styles = StyleSheet.create({
	wrapper: {
		width: 300,
		height: 300,
		backgroundColor: colors.white,
		alignItems: 'center',
		justifyContent: 'center',
	},
});

const AnimatedQRCode = ({ cbor, type, pause }: IAnimatedQRCodeProps) => {
	const urEncoder = useMemo(
		() => new UREncoder(new UR(Buffer.from(cbor, 'hex'), type), MAX_FRAGMENT_LENGTH),
		[cbor, type]
	);
	const [currentQRCode, setCurrentQRCode] = useState(urEncoder.nextPart());
	useEffect(() => {
		if (!pause) {
			const id = setInterval(() => {
				setCurrentQRCode(urEncoder.nextPart());
			}, 100);
			return () => {
				clearInterval(id);
			};
		}
	}, [urEncoder, pause]);
	return (
		<View style={styles.wrapper}>
			<QRCode value={currentQRCode.toUpperCase()} size={QR_CODE_SIZE} />
		</View>
	);
};

export default AnimatedQRCode;
