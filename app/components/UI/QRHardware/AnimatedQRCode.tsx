import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'react-native-qrcode-svg';
import { StyleSheet, View } from 'react-native';
import { UR, UREncoder } from '@ngraveio/bc-ur';
import { colors } from '../../../styles/common';

interface IAnimatedQRCodeProps {
	cbor: string;
	type: string;
	shouldPause: boolean;
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

const AnimatedQRCode = ({ cbor, type, shouldPause }: IAnimatedQRCodeProps) => {
	const urs = useMemo(
		() => new UREncoder(new UR(Buffer.from(cbor, 'hex'), type), MAX_FRAGMENT_LENGTH).encodeWhole(),
		[cbor, type]
	);
	const [currentIndex, setCurrentIndex] = useState(0);
	useEffect(() => {
		if (!shouldPause) {
			const id = setInterval(() => {
				setCurrentIndex((i) => (i + 1) % urs.length);
			}, 250);
			return () => {
				clearInterval(id);
			};
		}
	}, [urs, shouldPause]);
	return (
		<View style={styles.wrapper}>
			<QRCode value={urs[currentIndex].toUpperCase()} size={QR_CODE_SIZE} ecl={'L'} />
		</View>
	);
};

export default AnimatedQRCode;
