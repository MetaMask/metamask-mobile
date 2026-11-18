/**
 * Displays the EEA pricing disclaimer when a quote includes `MICA_EEA_BUY` or
 * `MICA_EEA_SELL` in termsIds, per FMA requirements.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useStyles } from '../../../../hooks/useStyles';
import { Text, TextVariant } from '@metamask/design-system-react-native';
import { Theme } from '../../../../../util/theme/models';
import { strings } from '../../../../../../locales/i18n';

interface MicaDisclaimerProps {
  termsIds?: string[];
  style?: object;
}

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      backgroundColor: colors.warning.muted,
      borderLeftWidth: 4,
      borderLeftColor: colors.warning.default,
      padding: 12,
      marginVertical: 12,
      borderRadius: 4,
    },
    text: {
      color: colors.text.default,
    },
  });
};

const MicaDisclaimer: React.FC<MicaDisclaimerProps> = ({ termsIds, style }) => {
  const { styles } = useStyles(styleSheet, {});

  const isMicaBuy = termsIds?.includes('MICA_EEA_BUY');
  const isMicaSell = termsIds?.includes('MICA_EEA_SELL');

  if (!isMicaBuy && !isMicaSell) {
    return null;
  }

  const disclaimerText = isMicaBuy
    ? strings('deposit.mica.buyDisclaimer')
    : strings('deposit.mica.sellDisclaimer');

  return (
    <View style={[styles.container, style]}>
      <Text variant={TextVariant.BodySM} style={styles.text}>
        {disclaimerText}
      </Text>
    </View>
  );
};

export default MicaDisclaimer;
