/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable import/no-commonjs */
/* eslint-disable @typescript-eslint/no-var-requires */
import React, { useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import StyledButton from '../../StyledButton';
import Text from '../../../Base/Text';
import { strings } from '../../../../../locales/i18n';
import Device from '../../../../util/device';
import { useAssetFromTheme } from '../../../../util/theme';

const ledgerConnectLightImage = require('../../../../images/ledger-connect-light.png');
const ledgerConnectDarkImage = require('../../../../images/ledger-connect-dark.png');

const createStyles = () =>
  StyleSheet.create({
    modalTitle: {
      marginTop: 30,
    },
    ledgerImageStyle: {
      resizeMode: 'cover',
      width: 100,
      height: 54,
      overflow: 'visible',
    },
    openLedgerTextWrapper: {
      marginTop: 30,
      flex: 1,
      alignItems: 'center',
      marginHorizontal: 30,
    },
    rejectButtonOpenLedgerView: {
      width: Device.getDeviceWidth() * 0.8,
    },
  });

export interface OpenETHAppStepProps {
  onReject: () => void;
}

const OpenETHAppStep = ({ onReject }: OpenETHAppStepProps) => {
  const styles = useMemo(() => createStyles(), []);
  const ledgerImage = useAssetFromTheme(
    ledgerConnectLightImage,
    ledgerConnectDarkImage,
  );

  return (
    <>
      <Image
        source={ledgerImage}
        style={styles.ledgerImageStyle}
        resizeMode="contain"
      />
      <View style={styles.modalTitle}>
        <Text bold big>
          {strings('ledger.open_eth_app')}
        </Text>
      </View>
      <View style={styles.openLedgerTextWrapper}>
        <Text>
          <Text>{strings('ledger.open_eth_app_message_one')}</Text>
          <Text bold>{strings('ledger.open_eth_app_message_two')}</Text>
        </Text>
      </View>
      <StyledButton
        type="cancel"
        onPress={onReject}
        style={styles.rejectButtonOpenLedgerView}
      >
        {strings('transaction.reject')}
      </StyledButton>
    </>
  );
};

export default React.memo(OpenETHAppStep);
