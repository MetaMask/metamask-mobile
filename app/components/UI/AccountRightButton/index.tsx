import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSelector } from 'react-redux';
import {
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Keyboard,
  Platform,
  EmitterSubscription,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Device from '../../../util/device';
import AvatarAccount, {
  AvatarAccountType,
} from '../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { AccountRightButtonProps } from './AccountRightButton.types';
import Avatar, {
  AvatarVariants,
  AvatarSize,
} from '../../../component-library/components/Avatars/Avatar';
import {
  getNetworkImageSource,
  getNetworkNameFromProvider,
} from '../../../util/networks';
import Badge, {
  BadgeVariant,
} from '../../../component-library/components/Badges/Badge';
import BadgeWrapper from '../../../component-library/components/Badges/BadgeWrapper';
import { selectProviderConfig } from '../../../selectors/networkController';
import { ProviderConfig } from '@metamask/network-controller';
import Routes from '../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../core/Analytics';
import Analytics from '../../../core/Analytics/Analytics';

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
  const [isKeyboardVisible, setIsKeyboardVisible] = useState<boolean>(false);

  const accountAvatarType = useSelector((state: any) =>
    state.settings.useBlockieIcon
      ? AvatarAccountType.Blockies
      : AvatarAccountType.JazzIcon,
  );
  /**
   * Current network
   */
  const networkProvider: ProviderConfig = useSelector(selectProviderConfig);

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
      Analytics.trackEventWithParameters(
        MetaMetricsEvents.NETWORK_SELECTOR_PRESSED,
        {
          chain_id: networkProvider.chainId,
        },
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
    networkProvider.chainId,
  ]);

  const networkName = useMemo(
    () => getNetworkNameFromProvider(networkProvider),
    [networkProvider],
  );

  const networkImageSource = useMemo(
    () =>
      getNetworkImageSource({
        networkType: networkProvider.type,
        chainId: networkProvider.chainId,
      }),
    [networkProvider],
  );

  const renderAvatarAccount = () => (
    <AvatarAccount type={accountAvatarType} accountAddress={selectedAddress} />
  );

  return (
    <TouchableOpacity
      style={styles.leftButton}
      onPress={handleButtonPress}
      testID={'navbar-account-button'}
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
          variant={AvatarVariants.Network}
          size={AvatarSize.Md}
          name={networkName}
          imageSource={networkImageSource}
        />
      )}
    </TouchableOpacity>
  );
};

export default AccountRightButton;
