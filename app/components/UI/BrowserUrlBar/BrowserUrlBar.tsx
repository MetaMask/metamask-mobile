import React from 'react';
import { Platform, TouchableOpacity, View } from 'react-native';

import { useStyles } from '../../../component-library/hooks';
import { getURLProtocol } from '../../../util/general';
import { PROTOCOLS } from '../../../constants/deeplinks';
import { isGatewayUrl } from '../../../lib/ens-ipfs/resolver';
import AppConstants from '../../../core/AppConstants';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icon';
import Text from '../../../component-library/components/Texts/Text';

import { BrowserUrlBarProps } from './BrowserUrlBar.types';
import stylesheet from './BrowserUrlBar.styles';
import generateTestId from '../../../../wdio/utils/generateTestId';
import { NAVBAR_TITLE_NETWORK } from '../../../../wdio/screen-objects/testIDs/BrowserScreen/BrowserScreen.testIds';

const BrowserUrlBar = ({ url, route, onPress }: BrowserUrlBarProps) => {
  const getDappMainUrl = () => {
    if (!url) return;

    const urlObj = new URL(url);
    const ensUrl = route.params?.currentEnsName ?? '';

    if (
      isGatewayUrl(urlObj) &&
      url.search(`${AppConstants.IPFS_OVERRIDE_PARAM}=false`) === -1 &&
      Boolean(ensUrl)
    ) {
      return ensUrl.toLowerCase().replace(/^www\./, '');
    }
    return urlObj.host.toLowerCase().replace(/^www\./, '');
  };

  const contentProtocol = getURLProtocol(url);
  const isHttps = contentProtocol === PROTOCOLS.HTTPS;

  const secureConnectionIcon = isHttps
    ? IconName.LockFilled
    : IconName.LockSlashFilled;

  const mainUrl = getDappMainUrl();

  const { styles, theme } = useStyles(stylesheet, {});

  return (
    <TouchableOpacity onPress={onPress}>
      <View
        style={styles.main}
        {...generateTestId(Platform, NAVBAR_TITLE_NETWORK)}
      >
        <Icon
          color={theme.colors.icon.alternative}
          name={secureConnectionIcon}
          size={IconSize.Sm}
        />
        <Text numberOfLines={1} style={styles.text}>
          {mainUrl}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default BrowserUrlBar;
