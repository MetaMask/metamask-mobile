/**
 * Displays the EEA regulatory disclaimers when a quote includes `MICA_EEA_BUY` or
 * `MICA_EEA_SELL` in termsIds, per FMA requirements.
 */

import React from 'react';
import { StyleSheet, Linking } from 'react-native';
import { useStyles } from '../../../../hooks/useStyles';
import {
  BannerAlert,
  BannerAlertSeverity,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
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
          <BannerAlert
            key={termId}
            testID={`mica-disclaimer-${termId}`}
            severity={BannerAlertSeverity.Warning}
            twClassName="my-3"
            style={style}
          >
            <Text variant={TextVariant.BodySm}>
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
          </BannerAlert>
        );
      })}
    </>
  );
};

export default MicaDisclaimer;
