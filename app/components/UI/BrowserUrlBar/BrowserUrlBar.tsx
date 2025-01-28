import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
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
import {
  BrowserUrlBarProps,
  BrowserUrlBarRef,
  ConnectionType,
} from './BrowserUrlBar.types';
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
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../component-library/components/Buttons/ButtonIcon';

const BrowserUrlBar = forwardRef<BrowserUrlBarRef, BrowserUrlBarProps>(
  (
    {
      connectionType,
      onSubmitEditing,
      onCancel,
      onFocus,
      onBlur,
      onChangeText,
      connectedAccounts,
      activeUrl,
      setIsUrlBarFocused,
      isUrlBarFocused,
    },
    ref,
  ) => {
    const inputValueRef = useRef<string>('');
    const inputRef = useRef<TextInput>(null);
    const shouldTriggerBlurCallbackRef = useRef(true);
    const accountsLength = useSelector(selectAccountsLength);
    const networkConfigurations = useSelector(selectNetworkConfigurations);
    const { trackEvent, createEventBuilder } = useMetrics();
    const navigation = useNavigation();
    const selectedAddress = connectedAccounts?.[0];
    const {
      styles,
      theme: { colors, themeAppearance },
    } = useStyles(stylesheet, { isUrlBarFocused });
    const isConnectionIconVisible =
      connectionType !== ConnectionType.UNKNOWN && !isUrlBarFocused;

    const unfocusInput = () => {
      setIsUrlBarFocused(false);
      // Reset the input value
      inputValueRef.current = '';
    };

    const onCancelInput = () => {
      shouldTriggerBlurCallbackRef.current = false;
      inputRef?.current?.blur();
      unfocusInput();
      onCancel();
    };

    useImperativeHandle(ref, () => ({
      hide: () => onCancelInput(),
      blur: () => inputRef?.current?.blur(),
      focus: () => inputRef?.current?.focus(),
      setNativeProps: (props: object) =>
        inputRef?.current?.setNativeProps(props),
    }));

    /**
     * Gets browser url bar icon based on connection type
     */
    const connectionTypeIcon = useMemo(() => {
      // Default to unsecure icon
      let iconName = IconName.LockSlash;

      switch (connectionType) {
        case ConnectionType.SECURE:
          iconName = IconName.Lock;
          break;
        case ConnectionType.UNSECURE:
          iconName = IconName.LockSlash;
          break;
      }
      return iconName;
    }, [connectionType]);

    const onBlurInput = () => {
      if (!shouldTriggerBlurCallbackRef.current) {
        shouldTriggerBlurCallbackRef.current = true;
        return;
      }
      unfocusInput();
      onBlur();
    };

    const onFocusInput = () => {
      setIsUrlBarFocused(true);
      onFocus();
    };

    const onChangeTextInput = (text: string) => {
      inputRef?.current?.setNativeProps({ text });
      onChangeText(text);
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
              origin: activeUrl && new URLParse(activeUrl).hostname,
            },
          },
        },
      });
    };

    /**
     * Clears the input value and calls the onChangeText callback
     */
    const onClearInput = () => {
      const clearedText = '';
      inputRef?.current?.clear();
      inputValueRef.current = clearedText;
      onChangeText(clearedText);
    };

    return (
      <View style={styles.browserUrlBarWrapper}>
        <View style={styles.main} testID={BrowserViewSelectorsIDs.URL_INPUT}>
          {isConnectionIconVisible ? (
            <Icon
              color={colors.icon.alternative}
              name={connectionTypeIcon}
              size={IconSize.Sm}
              style={styles.connectionIcon}
            />
          ) : null}
          <View style={styles.textInputWrapper}>
            <TextInput
              testID={BrowserURLBarSelectorsIDs.URL_INPUT}
              keyboardType={'web-search'}
              autoCapitalize={'none'}
              autoCorrect={false}
              ref={inputRef}
              numberOfLines={1}
              placeholder={strings('autocomplete.placeholder')}
              placeholderTextColor={colors.text.muted}
              returnKeyType={'go'}
              selectTextOnFocus
              keyboardAppearance={themeAppearance}
              style={styles.textInput}
              onChangeText={onChangeTextInput}
              onSubmitEditing={onSubmitEditingInput}
              onBlur={onBlurInput}
              onFocus={onFocusInput}
            />
          </View>
          {isUrlBarFocused ? (
            <ButtonIcon
              iconName={IconName.CircleX}
              onPress={onClearInput}
              iconColor={colors.icon.alternative}
              size={ButtonIconSizes.Md}
              style={styles.clearButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              testID={BrowserURLBarSelectorsIDs.URL_CLEAR_ICON}
            />
          ) : null}
        </View>
        <View style={styles.rightButton}>
          {isUrlBarFocused ? (
            <TouchableOpacity
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.cancelButton}
              testID={BrowserURLBarSelectorsIDs.CANCEL_BUTTON_ON_BROWSER_ID}
              onPress={onCancelInput}
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
