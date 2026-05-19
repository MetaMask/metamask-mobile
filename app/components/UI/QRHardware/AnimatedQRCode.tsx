import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'react-native-qrcode-svg';
import { StyleSheet, View } from 'react-native';
import { UR, UREncoder } from '@ngraveio/bc-ur';
import { useTheme } from '../../../util/theme';
import { Theme } from '../../../util/theme/models';

interface IAnimatedQRCodeProps {
  cbor: string;
  type: string;
  shouldPause: boolean;
  size?: number;
}

// For NGRAVE ZERO support please keep to a maximum fragment size of 200
const MAX_FRAGMENT_LENGTH = 200;
const DEFAULT_QR_CODE_SIZE = 250;
const DEFAULT_WRAPPER_SIZE = 300;

const createStyles = (theme: Theme, size: number) =>
  StyleSheet.create({
    wrapper: {
      width: size,
      height: size,
      backgroundColor: theme.brandColors.white,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

const AnimatedQRCode = ({
  cbor,
  type,
  shouldPause,
  size = DEFAULT_QR_CODE_SIZE,
}: IAnimatedQRCodeProps) => {
  const theme = useTheme();
  const wrapperSize =
    size === DEFAULT_QR_CODE_SIZE ? DEFAULT_WRAPPER_SIZE : size;
  const qrCodeSize =
    size === DEFAULT_QR_CODE_SIZE ? DEFAULT_QR_CODE_SIZE : size;
  const styles = createStyles(theme, wrapperSize);
  const urEncoder = useMemo(
    () =>
      new UREncoder(
        new UR(Buffer.from(cbor, 'hex'), type),
        MAX_FRAGMENT_LENGTH,
      ),
    [cbor, type],
  );

  const [currentQRCode, setCurrentQRCode] = useState(urEncoder.nextPart());

  useEffect(() => {
    if (!shouldPause) {
      const id = setInterval(() => {
        setCurrentQRCode(urEncoder.nextPart());
      }, 250);
      return () => {
        clearInterval(id);
      };
    }
  }, [urEncoder, shouldPause]);

  return (
    <View style={styles.wrapper}>
      <QRCode value={currentQRCode.toUpperCase()} size={qrCodeSize} />
    </View>
  );
};

export default AnimatedQRCode;
