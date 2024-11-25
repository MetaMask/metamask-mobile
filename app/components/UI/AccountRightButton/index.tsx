import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Keyboard,
  Platform,
  EmitterSubscription,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Device from '../../../util/device';
import AvatarAccount, {
  AvatarAccountType,
} from '../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { AccountRightButtonProps } from './AccountRightButton.types';
import Avatar, {
  AvatarVariant,
  AvatarSize,
} from '../../../component-library/components/Avatars/Avatar';
import { getDecimalChainId } from '../../../util/networks';
import Badge, {
  BadgeVariant,
} from '../../../component-library/components/Badges/Badge';
import BadgeWrapper from '../../../component-library/components/Badges/BadgeWrapper';
import { selectProviderConfig } from '../../../selectors/networkController';
import Routes from '../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { AccountOverviewSelectorsIDs } from '../../../../e2e/selectors/AccountOverview.selectors';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { useNetworkInfo } from '../../../selectors/selectedNetworkController';
import UrlParser from 'url-parse';

const styles = StyleSheet.create({
  leftButton: {
    marginTop: 12,
    marginRight: Device.isAndroid() ? 7 : 16,
    marginLeft: Device.isAndroid() ? 7 : 0,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderInput: {
    height: 0,
    width: 0,
    paddingVertical: 0,
  },
});

/**
 * UI PureComponent that renders on the top right of the navbar
 * showing an identicon for the selectedAddress
 */
const AccountRightButton = ({
  selectedAddress,
  onPress,
  isNetworkVisible,
}: AccountRightButtonProps) => {
  // Placeholder ref for dismissing keyboard. Works when the focused input is within a Webview.
  const placeholderInputRef = useRef<TextInput>(null);
  const { navigate } = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState<boolean>(false);

  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accountAvatarType = useSelector((state: any) =>
    state.settings.useBlockieIcon
      ? AvatarAccountType.Blockies
      : AvatarAccountType.JazzIcon,
  );
  /**
   * Current network
   */
  const providerConfig = useSelector(selectProviderConfig);

  const handleKeyboardVisibility = useCallback(
    (visibility: boolean) => () => {
      setIsKeyboardVisible(visibility);
    },
    [setIsKeyboardVisible],
  );

  // Listen to keyboard events.
  useEffect(() => {
    let hideSubscription: EmitterSubscription;
    let showSubscription: EmitterSubscription;
    if (Platform.OS === 'android') {
      showSubscription = Keyboard.addListener('keyboardDidShow', () =>
        handleKeyboardVisibility(true),
      );
      hideSubscription = Keyboard.addListener('keyboardDidHide', () =>
        handleKeyboardVisibility(false),
      );
    } else {
      showSubscription = Keyboard.addListener('keyboardWillShow', () =>
        handleKeyboardVisibility(true),
      );
      hideSubscription = Keyboard.addListener('keyboardWillHide', () =>
        handleKeyboardVisibility(false),
      );
    }
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [handleKeyboardVisibility]);

  const dismissKeyboard = useCallback(() => {
    if (!isKeyboardVisible) return;
    placeholderInputRef.current?.focus();
    placeholderInputRef.current?.blur();
  }, [isKeyboardVisible]);

  const handleButtonPress = useCallback(() => {
    dismissKeyboard();
    if (!selectedAddress && isNetworkVisible) {
      navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.NETWORK_SELECTOR,
      });
      trackEvent(
        createEventBuilder(MetaMetricsEvents.NETWORK_SELECTOR_PRESSED)
          .addProperties({
            chain_id: getDecimalChainId(providerConfig.chainId),
          })
          .build(),
      );
    } else {
      onPress?.();
    }
  }, [
    dismissKeyboard,
    selectedAddress,
    isNetworkVisible,
    onPress,
    navigate,
    providerConfig.chainId,
    trackEvent,
    createEventBuilder,
  ]);

  const route = useRoute<RouteProp<Record<string, { url: string }>, string>>();
  // url is defined if opened while in a dapp
  const currentUrl = route.params?.url;
  let hostname;
  if (currentUrl) {
    hostname = new UrlParser(currentUrl)?.hostname;
  }

  const { networkName, networkImageSource } = useNetworkInfo(hostname);

  const renderAvatarAccount = () => (
    <AvatarAccount type={accountAvatarType} accountAddress={selectedAddress} />
  );

  return (
    <TouchableOpacity
      style={styles.leftButton}
      onPress={handleButtonPress}
      testID={AccountOverviewSelectorsIDs.ACCOUNT_BUTTON}
    >
      <TextInput style={styles.placeholderInput} ref={placeholderInputRef} />
      {selectedAddress ? (
        isNetworkVisible ? (
          <BadgeWrapper
            badgeElement={
              <Badge
                variant={BadgeVariant.Network}
                name={networkName}
                imageSource={networkImageSource}
              />
            }
          >
            {renderAvatarAccount()}
          </BadgeWrapper>
        ) : (
          renderAvatarAccount()
        )
      ) : (
        <Avatar
          variant={AvatarVariant.Network}
          size={AvatarSize.Md}
          name={networkName}
          imageSource={networkImageSource}
        />
      )}
    </TouchableOpacity>
  );
};

export default AccountRightButton;
