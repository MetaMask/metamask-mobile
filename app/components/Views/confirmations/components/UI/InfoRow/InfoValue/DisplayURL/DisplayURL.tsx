import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../../../component-library/components/Icons/Icon';
import Text from '../../../../../../../../component-library/components/Texts/Text';
// import Logger from '../../../../../../../../util/Logger';
import { useStyles } from '../../../../../../../../component-library/hooks';
import styleSheet from './DisplayURL.styles';

interface DisplayURLProps {
  url: string;
}

const DisplayURL = ({ url }: DisplayURLProps) => {
  const [isHTTP, setIsHTTP] = useState(false);

  useEffect(() => {
    let urlObject;
    try {
      urlObject = new URL(url);
    } catch (e) {
      // Commenting out the line below till issue of missing protocol in origin is addressed
      // https://github.com/MetaMask/metamask-mobile/issues/13580#issuecomment-2671458216
      // Logger.error(e as Error, `DisplayURL: new URL(url) cannot parse ${url}`);
    }
    setIsHTTP(urlObject?.protocol === 'http:');
  }, [url]);

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
