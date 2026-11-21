/**
 * Displays the EEA regulatory disclaimers when a quote includes `MICA_EEA_BUY` or
 * `MICA_EEA_SELL` in termsIds, per FMA requirements.
 */

import React from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { useStyles } from '../../../../hooks/useStyles';
import { Text, TextVariant } from '@metamask/design-system-react-native';
import { Theme } from '../../../../../util/theme/models';
import { strings } from '../../../../../../locales/i18n';
import Logger from '../../../../../util/Logger';

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
    link: {
      color: colors.primary.default,
      textDecorationLine: 'underline',
    },
  });
};

const MicaDisclaimer: React.FC<MicaDisclaimerProps> = ({ termsIds, style }) => {
  const { styles } = useStyles(styleSheet, {});

  const disclaimersToShow =
    termsIds?.filter((id) => id === 'MICA_EEA_BUY' || id === 'MICA_EEA_SELL') ??
    [];

  if (disclaimersToShow.length === 0) {
    return null;
  }

  const handleLinkPress = (url: string) => {
    Linking.openURL(url).catch((err) =>
      Logger.error(err as Error, 'Failed to open link'),
    );
  };

  return (
    <>
      {disclaimersToShow.map((termId) => {
        const disclaimerText =
          termId === 'MICA_EEA_BUY'
            ? strings('deposit.mica.buyDisclaimer', {
                fmaLink: strings('deposit.mica.fmaLink'),
                euLink: strings('deposit.mica.euLink'),
              })
            : strings('deposit.mica.sellDisclaimer', {
                fmaLink: strings('deposit.mica.fmaLink'),
                euLink: strings('deposit.mica.euLink'),
              });

        const fmaLink = strings('deposit.mica.fmaLink');
        const euLink = strings('deposit.mica.euLink');

        return (
          <View key={termId} style={[styles.container, style]}>
            <Text variant={TextVariant.BodySm} style={styles.text}>
              {disclaimerText.split(fmaLink)[0]}
              <Text
                variant={TextVariant.BodySm}
                style={styles.link}
                onPress={() => handleLinkPress(fmaLink)}
              >
                {fmaLink}
              </Text>
              {disclaimerText.split(fmaLink)[1]?.split(euLink)[0]}
              <Text
                variant={TextVariant.BodySm}
                style={styles.link}
                onPress={() => handleLinkPress(euLink)}
              >
                {euLink}
              </Text>
              {disclaimerText.split(euLink)[1]}
            </Text>
          </View>
        );
      })}
    </>
  );
};

export default MicaDisclaimer;
