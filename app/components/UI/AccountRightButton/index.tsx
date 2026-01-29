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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Device from '../../../util/device';
import AvatarAccount from '../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { AccountRightButtonProps } from './AccountRightButton.types';
import Avatar, {
  AvatarVariant,
  AvatarSize,
} from '../../../component-library/components/Avatars/Avatar';
import {
  getDecimalChainId,
  getNetworkImageSource,
} from '../../../util/networks';
import Routes from '../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { AccountOverviewSelectorsIDs } from './AccountOverview.testIds';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { useNetworkInfo } from '../../../selectors/selectedNetworkController';
import UrlParser from 'url-parse';
import { selectEvmChainId } from '../../../selectors/networkController';
import {
  selectIsEvmNetworkSelected,
  selectNonEvmNetworkConfigurationsByChainId,
  selectSelectedNonEvmNetworkChainId,
} from '../../../selectors/multichainNetworkController';
import { selectAvatarAccountType } from '../../../selectors/settings';

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
}: AccountRightButtonProps) => {
  // Placeholder ref for dismissing keyboard. Works when the focused input is within a Webview.
  const placeholderInputRef = useRef<TextInput>(null);
  const { navigate } = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState<boolean>(false);

  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const avatarAccountType = useSelector(selectAvatarAccountType);
  /**
   * Current network
   */
  const chainId = useSelector(selectEvmChainId);
  const selectedNonEvmNetworkChainId = useSelector(
    selectSelectedNonEvmNetworkChainId,
  );
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const nonEvmNetworkConfigurations = useSelector(
    selectNonEvmNetworkConfigurationsByChainId,
  );

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
    if (!selectedAddress) {
      navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.NETWORK_SELECTOR,
        params: {
          chainId: isEvmSelected ? chainId : selectedNonEvmNetworkChainId,
        },
      });
      trackEvent(
        createEventBuilder(MetaMetricsEvents.NETWORK_SELECTOR_PRESSED)
          .addProperties({
            chain_id: getDecimalChainId(chainId),
          })
          .build(),
      );
    } else {
      onPress?.();
    }
  }, [
    dismissKeyboard,
    selectedAddress,
    navigate,
    trackEvent,
    createEventBuilder,
    chainId,
    onPress,
    selectedNonEvmNetworkChainId,
    isEvmSelected,
  ]);

  const route = useRoute<RouteProp<Record<string, { url: string }>, string>>();
  // url is defined if opened while in a dapp
  const currentUrl = route.params?.url;
  let hostname;
  if (currentUrl) {
    hostname = new UrlParser(currentUrl)?.origin;
  }

  const { networkName, networkImageSource } = useNetworkInfo(hostname);

  const nonEvmNetworkImageSource = useMemo(() => {
    if (!isEvmSelected && selectedNonEvmNetworkChainId) {
      return getNetworkImageSource({ chainId: selectedNonEvmNetworkChainId });
    }
  }, [isEvmSelected, selectedNonEvmNetworkChainId]);

  const renderAvatarAccount = () => (
    <AvatarAccount type={avatarAccountType} accountAddress={selectedAddress} />
  );

  return (
    <TouchableOpacity
      style={styles.leftButton}
      onPress={handleButtonPress}
      testID={AccountOverviewSelectorsIDs.ACCOUNT_BUTTON}
    >
      <TextInput style={styles.placeholderInput} ref={placeholderInputRef} />
      {selectedAddress ? (
        renderAvatarAccount()
      ) : (
        <Avatar
          variant={AvatarVariant.Network}
          size={AvatarSize.Md}
          name={
            isEvmSelected
              ? networkName
              : nonEvmNetworkConfigurations?.[selectedNonEvmNetworkChainId]
                  ?.name
          }
          imageSource={
            isEvmSelected ? networkImageSource : nonEvmNetworkImageSource
          }
        />
      )}
    </TouchableOpacity>
  );
};

const AccountRightButtonMemoized = React.memo(AccountRightButton);
AccountRightButtonMemoized.displayName = 'AccountRightButton';

export default AccountRightButton;
