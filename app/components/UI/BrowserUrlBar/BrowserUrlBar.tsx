import React from 'react';
import { TouchableOpacity, View } from 'react-native';

import { useStyles } from '../../../component-library/hooks';
import { getURLProtocol } from '../../../util/general';
import { PROTOCOLS } from '../../../constants/deeplinks';
import { isGatewayUrl } from '../../../lib/ens-ipfs/resolver';
import AppConstants from '../../../core/AppConstants';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import Text from '../../../component-library/components/Texts/Text';

import { BrowserUrlBarProps } from './BrowserUrlBar.types';
import stylesheet from './BrowserUrlBar.styles';
import { BrowserViewSelectorsIDs } from '../../../../e2e/selectors/Browser/BrowserView.selectors';
import Url from 'url-parse';
import { regex } from '../../../../app/util/regex';

const BrowserUrlBar = ({ url, route, onPress }: BrowserUrlBarProps) => {
  const getDappMainUrl = () => {
    if (!url) return;

    const urlObj = new Url(url);
    const ensUrl = route.params?.currentEnsName ?? '';

    if (
      isGatewayUrl(urlObj) &&
      url.search(`${AppConstants.IPFS_OVERRIDE_PARAM}=false`) === -1 &&
      Boolean(ensUrl)
    ) {
      return ensUrl.toLowerCase().replace(regex.startUrl, '');
    }
    return urlObj.host.toLowerCase().replace(regex.startUrl, '');
  };

  const contentProtocol = getURLProtocol(url);
  const isHttps = contentProtocol === PROTOCOLS.HTTPS;

  const secureConnectionIcon = isHttps ? IconName.Lock : IconName.LockSlash;

  const mainUrl = getDappMainUrl();

  const { styles, theme } = useStyles(stylesheet, {});

  return (
    <TouchableOpacity onPress={onPress}>
      <View style={styles.main} testID={BrowserViewSelectorsIDs.URL_INPUT}>
        <Icon
          color={theme.colors.icon.alternative}
          name={secureConnectionIcon}
          size={IconSize.Sm}
        />
        <Text numberOfLines={1} style={styles.text} ellipsizeMode="head">
          {mainUrl}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default BrowserUrlBar;
