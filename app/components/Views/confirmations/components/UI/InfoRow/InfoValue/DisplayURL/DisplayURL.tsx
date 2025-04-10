import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../../../component-library/components/Icons/Icon';
import Text from '../../../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../../../component-library/hooks';
import styleSheet from './DisplayURL.styles';

interface DisplayURLProps {
  url: string;
}

function extractHostname(url: string) {
  // eslint-disable-next-line no-useless-escape
  const match = url.match(/^(?:https?:\/\/)?([^\/:]+)/);
  return match ? match[1] : null;
}

const DisplayURL = ({ url }: DisplayURLProps) => {
  const [isHTTP, setIsHTTP] = useState(false);

  useEffect(() => {
    let urlObject;
    try {
      urlObject = new URL(url);
    } catch (e) {
      console.error(e as Error, `DisplayURL: new URL(url) cannot parse ${url}`);
    }
    setIsHTTP(urlObject?.protocol === 'http:');
  }, [url]);

  const hostName = extractHostname(url);

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
      <Text style={styles.value}>{hostName}</Text>
    </View>
  );
};

export default DisplayURL;
