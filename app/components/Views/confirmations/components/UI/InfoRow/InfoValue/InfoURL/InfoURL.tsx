import React from 'react';
import { Text, View } from 'react-native';

import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../../../component-library/components/Icons/Icon';
import Logger from '../../../../../../../../util/Logger';
import { useStyles } from '../../../../../../../../component-library/hooks';
import styleSheet from './InfoURL.styles';

interface InfoURLProps {
  url: string;
}

const InfoURL = ({ url }: InfoURLProps) => {
  let urlObject;

  try {
    urlObject = new URL(url);
  } catch (e) {
    // eslint-disable-next-line no-console
    Logger.error(e as Error, `InfoURL: new URL(url) cannot parse ${url}`);
  }

  const isHTTP = urlObject?.protocol === 'http:';

  const urlWithoutProtocol = url?.replace(/https?:\/\//u, '');

  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.container}>
      {isHTTP && (
        <View style={styles.warningContainer}>
          <Icon
            color={IconColor.Warning}
            size={IconSize.Md}
            name={IconName.Danger}
          />
          <Text style={styles.warningText}>HTTP</Text>
        </View>
      )}
      <Text style={styles.value}>{urlWithoutProtocol}</Text>
    </View>
  );
};

export default InfoURL;
