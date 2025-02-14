import React from 'react';
import { View } from 'react-native';

import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../../../component-library/components/Icons/Icon';
import Text from '../../../../../../../../component-library/components/Texts/Text';
import Logger from '../../../../../../../../util/Logger';
import { useStyles } from '../../../../../../../../component-library/hooks';
import styleSheet from './DisplayURL.styles';

interface DisplayURLProps {
  url: string;
}

const DisplayURL = ({ url }: DisplayURLProps) => {
  let urlObject;

  try {
    urlObject = new URL(url);
  } catch (e) {
    // eslint-disable-next-line no-console
    Logger.error(e as Error, `DisplayURL: new URL(url) cannot parse ${url}`);
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

export default DisplayURL;
