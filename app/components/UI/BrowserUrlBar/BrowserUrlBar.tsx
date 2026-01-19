import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import {
  NativeSyntheticEvent,
  TextInput,
  TextInputSubmitEditingEventData,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useStyles } from '../../../component-library/hooks';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import Device from '../../../util/device';
import {
  BrowserUrlBarProps,
  BrowserUrlBarRef,
  ConnectionType,
} from './BrowserUrlBar.types';
import stylesheet from './BrowserUrlBar.styles';
import { BrowserViewSelectorsIDs } from '../../Views/BrowserTab/BrowserView.testIds';
import { strings } from '../../../../locales/i18n';
import { BrowserURLBarSelectorsIDs } from './BrowserURLBar.testIds';
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
import { hasProperty } from '@metamask/utils';
import TabCountIcon from '../Tabs/TabCountIcon';

const BrowserUrlBar = React.memo(
  forwardRef<BrowserUrlBarRef, BrowserUrlBarProps>(
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
        showCloseButton,
        showTabs,
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

      const unfocusInput = useCallback(() => {
        setIsUrlBarFocused(false);
        // Reset the input value
        inputValueRef.current = '';
      }, [setIsUrlBarFocused]);

      const onCancelInput = useCallback(() => {
        shouldTriggerBlurCallbackRef.current = false;
        inputRef?.current?.blur();
        unfocusInput();
        onCancel();
      }, [unfocusInput, onCancel]);

      const handleAccountRightButtonPress = useCallback(() => {
        const nonTestnetNetworks =
          Object.keys(networkConfigurations).length + 1;
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
                origin: activeUrl && new URLParse(activeUrl).origin,
              },
            },
          },
        });
      }, [
        networkConfigurations,
        connectedAccounts,
        trackEvent,
        createEventBuilder,
        accountsLength,
        navigation,
        activeUrl,
      ]);

      const renderRightButton = useCallback(() => {
        if (!isUrlBarFocused) {
          return (
            <AccountRightButton
              selectedAddress={selectedAddress}
              onPress={handleAccountRightButtonPress}
            />
          );
        }

        if (showCloseButton) {
          return (
            <ButtonIcon
              iconName={IconName.Close}
              onPress={onCancelInput}
              iconColor={colors.icon.default}
              size={ButtonIconSizes.Lg}
              style={styles.closeButton}
              testID={BrowserURLBarSelectorsIDs.CANCEL_BUTTON_ON_BROWSER_ID}
            />
          );
        }

        return (
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
        );
      }, [
        isUrlBarFocused,
        showCloseButton,
        selectedAddress,
        handleAccountRightButtonPress,
        onCancelInput,
        colors.icon.default,
        styles.closeButton,
        styles.cancelButton,
        styles.cancelButtonText,
      ]);

      useImperativeHandle(ref, () => ({
        hide: () => onCancelInput(),
        blur: () => inputRef?.current?.blur(),
        focus: () => inputRef?.current?.focus(),
        setNativeProps: (props: object) => {
          const inputText = hasProperty(props, 'text') ? props.text : null;

          if (typeof inputText === 'string') {
            inputValueRef.current = inputText;
          }
          inputRef?.current?.setNativeProps(props);
        },
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

      const onBlurInput = useCallback(() => {
        if (!shouldTriggerBlurCallbackRef.current) {
          shouldTriggerBlurCallbackRef.current = true;
          return;
        }
        unfocusInput();
        onBlur();
      }, [unfocusInput, onBlur]);

      const onFocusInput = useCallback(() => {
        setIsUrlBarFocused(true);
        onFocus();
      }, [setIsUrlBarFocused, onFocus]);

      const onChangeTextInput = useCallback(
        (text: string) => {
          inputRef?.current?.setNativeProps({ text });
          onChangeText(text);
        },
        [onChangeText],
      );

      const onSubmitEditingInput = useCallback(
        ({
          nativeEvent: { text },
        }: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => {
          const trimmedText = text.trim();
          inputValueRef.current = trimmedText;
          onSubmitEditing(trimmedText);
        },
        [onSubmitEditing],
      );

      /**
       * Clears the input value and calls the onChangeText callback
       */
      const onClearInput = useCallback(() => {
        const clearedText = '';
        inputRef?.current?.clear();
        inputValueRef.current = clearedText;
        onChangeText(clearedText);
      }, [onChangeText]);

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
                style={[styles.textInput, !isUrlBarFocused && styles.hidden]}
                onChangeText={onChangeTextInput}
                onSubmitEditing={onSubmitEditingInput}
                onBlur={onBlurInput}
                onFocus={onFocusInput}
              />
              <TouchableWithoutFeedback onPress={onFocusInput}>
                <Text
                  style={styles.urlBarText}
                  numberOfLines={1}
                  ellipsizeMode="head"
                >
                  {inputValueRef.current || activeUrl}
                </Text>
              </TouchableWithoutFeedback>
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
          {!isUrlBarFocused && showTabs && (
            <TouchableOpacity
              onPress={showTabs}
              testID="browser-tabs-button"
              style={[
                styles.tabsButton,
                Device.isAndroid()
                  ? styles.tabsButtonAndroid
                  : styles.tabsButtonIOS,
              ]}
            >
              <TabCountIcon style={styles.tabIcon} />
            </TouchableOpacity>
          )}
          <View style={styles.rightButton}>{renderRightButton()}</View>
        </View>
      );
    },
  ),
);

BrowserUrlBar.displayName = 'BrowserUrlBar';

export default BrowserUrlBar;
