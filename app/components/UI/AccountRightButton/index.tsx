import React, { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Device from '../../../util/device';
import AvatarAccount, {
  AvatarAccountType,
} from '../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { AccountRightButtonProps } from './AccountRightButton.types';
import AvatarNetwork from '../../../component-library/components/Avatars/Avatar/variants/AvatarNetwork';
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
  let onPressButton = onPress;

  if (!selectedAddress && isNetworkVisible) {
    onPressButton = () => dispatch(toggleNetworkModal(false));
  }
  const networkName = useMemo(
    () => getNetworkNameFromProvider(networkProvider),
    [networkProvider],
  );

  const networkImageSource = useMemo(
    () => getNetworkImageSource(networkProvider.chainId),
    [networkProvider.chainId],
  );

  const renderAvatarAccount = () => (
    <AvatarAccount type={accountAvatarType} accountAddress={selectedAddress} />
  );

  return (
    <TouchableOpacity
      style={styles.leftButton}
      onPress={onPressButton}
      testID={'navbar-account-button'}
    >
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
        <AvatarNetwork name={networkName} imageSource={networkImageSource} />
      )}
    </TouchableOpacity>
  );
};

export default AccountRightButton;
