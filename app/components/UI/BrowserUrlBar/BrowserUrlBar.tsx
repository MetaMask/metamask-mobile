import React, { forwardRef, useRef, useState } from 'react';
import { TextInput, TouchableOpacity, View } from 'react-native';

import { useStyles } from '../../../component-library/hooks';
import { getURLProtocol } from '../../../util/general';
import { PROTOCOLS } from '../../../constants/deeplinks';
import { isGatewayUrl } from '../../../lib/ens-ipfs/resolver';
import AppConstants from '../../../core/AppConstants';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import { BrowserUrlBarProps } from './BrowserUrlBar.types';
import stylesheet from './BrowserUrlBar.styles';
import { BrowserViewSelectorsIDs } from '../../../../e2e/selectors/Browser/BrowserView.selectors';
import Url from 'url-parse';
import { regex } from '../../../../app/util/regex';

const BrowserUrlBar = forwardRef<TextInput, BrowserUrlBarProps>(
  ({ isSecureConnection, onSubmitEditing, onPress, onCancel }, ref) => {
    // const inputState = useRef<InputState>(InputState.IDLE);
    const inputValueRef = useRef<string>('');
    // const getDappMainUrl = () => {
    //   if (!url) return;

    //   const urlObj = new Url(url);
    //   const ensUrl = route.params?.currentEnsName ?? '';

    //   if (
    //     isGatewayUrl(urlObj) &&
    //     url.search(`${AppConstants.IPFS_OVERRIDE_PARAM}=false`) === -1 &&
    //     Boolean(ensUrl)
    //   ) {
    //     return ensUrl.toLowerCase().replace(regex.startUrl, '');
    //   }
    //   return urlObj.host.toLowerCase().replace(regex.startUrl, '') || url;
    // };

    // const contentProtocol = getURLProtocol(url);
    // const isHttps = contentProtocol === PROTOCOLS.HTTPS;

    const secureConnectionIcon = isSecureConnection
      ? IconName.Lock
      : IconName.LockSlash;

    // const mainUrl = getDappMainUrl();

    const { styles, theme } = useStyles(stylesheet, {});

    return (
      <TouchableOpacity
        style={{ flex: 1, paddingHorizontal: 16 }}
        onPress={onPress}
      >
        <View style={styles.main} testID={BrowserViewSelectorsIDs.URL_INPUT}>
          <Icon
            color={theme.colors.icon.alternative}
            name={secureConnectionIcon}
            size={IconSize.Sm}
          />
          <TextInput
            autoCapitalize={'none'}
            autoCorrect={false}
            ref={ref}
            numberOfLines={1}
            style={styles.text}
            onSubmitEditing={({ nativeEvent: { text } }) => {
              const trimmedText = text.trim();
              inputValueRef.current = trimmedText;
              if (!!trimmedText) {
                onSubmitEditing(trimmedText);
              }
            }}
            onBlur={() => {
              if (!inputValueRef.current) {
                onCancel();
              }
              // Reset the input value
              inputValueRef.current = '';
            }}
          />
        </View>
      </TouchableOpacity>
    );
  },
);

export default BrowserUrlBar;
