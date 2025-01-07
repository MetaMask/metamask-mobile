import React, { forwardRef, useMemo, useRef, useState } from 'react';
import {
  NativeSyntheticEvent,
  TextInput,
  TextInputSubmitEditingEventData,
  TouchableOpacity,
  View,
} from 'react-native';
import { useStyles } from '../../../component-library/hooks';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import { BrowserUrlBarProps, ConnectionType } from './BrowserUrlBar.types';
import stylesheet from './BrowserUrlBar.styles';
import { BrowserViewSelectorsIDs } from '../../../../e2e/selectors/Browser/BrowserView.selectors';
import { strings } from '../../../../locales/i18n';
import { BrowserURLBarSelectorsIDs } from '../../../../e2e/selectors/Browser/BrowserURLBar.selectors';
import AccountRightButton from '../AccountRightButton';
import Text from '../../../component-library/components/Texts/Text';
import { selectAccountsLength } from '../../../selectors/accountTrackerController';
import { useSelector } from 'react-redux';
import { selectNetworkConfigurations } from '../../../selectors/networkController';
import { useMetrics } from '../../hooks/useMetrics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';
import URLParse from 'url-parse';
// import { getURLProtocol } from '../../../util/general';
// import { PROTOCOLS } from '../../../constants/deeplinks';
// import { isGatewayUrl } from '../../../lib/ens-ipfs/resolver';
// import AppConstants from '../../../core/AppConstants';
// import Url from 'url-parse';
// import { regex } from '../../../../app/util/regex';

const BrowserUrlBar = forwardRef<TextInput, BrowserUrlBarProps>(
  (
    {
      connectionType,
      onSubmitEditing,
      onCancel,
      onFocus,
      onBlur,
      onChangeText,
      connectedAccounts,
      activeUrlRef,
    },
    ref,
  ) => {
    const inputValueRef = useRef<string>('');
    const [isUrlBarFocused, setIsUrlBarFocused] = useState(false);
    const accountsLength = useSelector(selectAccountsLength);
    const networkConfigurations = useSelector(selectNetworkConfigurations);
    const { trackEvent, createEventBuilder } = useMetrics();
    const navigation = useNavigation();
    const selectedAddress = connectedAccounts?.[0];
    const {
      styles,
      theme: { colors, themeAppearance },
    } = useStyles(stylesheet, {});

    // TODO: Decide if this logic is still needed
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
    // const mainUrl = getDappMainUrl();

    /**
     * Gets browser url bar icon based on connection type
     */
    const connectionTypeIcon = useMemo(() => {
      // Default to search icon
      let iconName = IconName.Search;
      if (isUrlBarFocused) {
        return iconName;
      }
      switch (connectionType) {
        case ConnectionType.SECURE:
          iconName = IconName.Lock;
          break;
        case ConnectionType.UNSECURE:
          iconName = IconName.LockSlash;
          break;
        case ConnectionType.UNKNOWN:
        default:
          iconName = IconName.Loading;
      }
      return iconName;
    }, [connectionType, isUrlBarFocused]);

    const onBlurInput = () => {
      setIsUrlBarFocused(false);
      onBlur();
      if (!inputValueRef.current) {
        onCancel();
      }
      // Reset the input value
      inputValueRef.current = '';
    };

    const onFocusInput = () => {
      setIsUrlBarFocused(true);
      onFocus();
    };

    const onSubmitEditingInput = ({
      nativeEvent: { text },
    }: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => {
      const trimmedText = text.trim();
      inputValueRef.current = trimmedText;
      onSubmitEditing(trimmedText);
    };

    const handleAccountRightButtonPress = () => {
      const nonTestnetNetworks = Object.keys(networkConfigurations).length + 1;
      const numberOfConnectedAccounts = connectedAccounts.length;

      // TODO: This is currently tracking two events, we should consolidate
      trackEvent(
        createEventBuilder(MetaMetricsEvents.OPEN_DAPP_PERMISSIONS)
          .addProperties({
            number_of_accounts: accountsLength,
            number_of_accounts_connected: numberOfConnectedAccounts,
            number_of_networks: nonTestnetNetworks,
          })
          .build(),
      );
      // Track Event: "Opened Acount Switcher"
      trackEvent(
        createEventBuilder(MetaMetricsEvents.BROWSER_OPEN_ACCOUNT_SWITCH)
          .addProperties({
            number_of_accounts: numberOfConnectedAccounts,
          })
          .build(),
      );

      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.ACCOUNT_PERMISSIONS,
        params: {
          hostInfo: {
            metadata: {
              // TODO: This is not an origin, it's a hostname
              origin:
                activeUrlRef.current &&
                new URLParse(activeUrlRef.current).hostname,
            },
          },
        },
      });
    };

    return (
      <View style={styles.browserUrlBarWrapper}>
        <View style={styles.main} testID={BrowserViewSelectorsIDs.URL_INPUT}>
          <Icon
            color={colors.icon.alternative}
            name={connectionTypeIcon}
            size={IconSize.Sm}
          />
          <TextInput
            testID={BrowserURLBarSelectorsIDs.URL_INPUT}
            keyboardType={'web-search'}
            autoCapitalize={'none'}
            autoCorrect={false}
            ref={ref}
            numberOfLines={1}
            placeholder={strings('autocomplete.placeholder')}
            placeholderTextColor={colors.text.muted}
            returnKeyType={'go'}
            selectTextOnFocus
            keyboardAppearance={themeAppearance}
            style={styles.textInput}
            onChangeText={onChangeText}
            onSubmitEditing={onSubmitEditingInput}
            onBlur={onBlurInput}
            onFocus={onFocusInput}
          />
        </View>
        <View style={styles.rightButton}>
          {isUrlBarFocused ? (
            <TouchableOpacity
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.cancelButton}
              testID={BrowserURLBarSelectorsIDs.CANCEL_BUTTON_ON_BROWSER_ID}
              // TODO: Change this to cancel
              onPress={onBlurInput}
            >
              <Text style={styles.cancelButtonText}>
                {strings('browser.cancel')}
              </Text>
            </TouchableOpacity>
          ) : (
            <AccountRightButton
              selectedAddress={selectedAddress}
              isNetworkVisible
              onPress={handleAccountRightButtonPress}
            />
          )}
        </View>
      </View>
    );
  },
);

export default BrowserUrlBar;
