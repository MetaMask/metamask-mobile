import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Keyboard,
  Platform,
  EmitterSubscription,
} from 'react-native';
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
import { toggleNetworkModal } from '../../../actions/modals';
import { BadgeVariants } from '../../../component-library/components/Badges/Badge/Badge.types';
import BadgeWrapper from '../../../component-library/components/Badges/BadgeWrapper';

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
  const [isKeyboardVisible, setIsKeyboardVisible] = useState<boolean>(false);
  const accountAvatarType = useSelector((state: any) =>
    state.settings.useBlockieIcon
      ? AvatarAccountType.Blockies
      : AvatarAccountType.JazzIcon,
  );
  /**
   * Current network
   */
  const networkProvider = useSelector(
    (state: any) => state.engine.backgroundState.NetworkController.provider,
  );
  const dispatch = useDispatch();

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
      dispatch(toggleNetworkModal(false));
    } else {
      onPress?.();
    }
  }, [dismissKeyboard, selectedAddress, isNetworkVisible, dispatch, onPress]);

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
            badgeProps={{
              variant: BadgeVariants.Network,
              name: networkName,
              imageSource: networkImageSource,
            }}
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
