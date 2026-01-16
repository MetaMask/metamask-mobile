import React from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import TouchableOpacity from '../../../../../components/Base/TouchableOpacity';

import { useStyles } from '../../../../hooks';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../components/Texts/Text';
import AvatarAccount from '../../../../components/Avatars/Avatar/variants/AvatarAccount';
import Avatar, { AvatarVariant } from '../../../../components/Avatars/Avatar';
import { AvatarSize } from '../../../../components/Avatars/Avatar/Avatar.types';
import { formatAddress } from '../../../../../util/address';
import { getNetworkImageSource } from '../../../../../util/networks';
import { selectAvatarAccountType } from '../../../../../selectors/settings';
import { strings } from '../../../../../../locales/i18n';
import createStyles from '../MultichainAccountSelectorList.styles';

/**
 * ExternalAccountCell Component
 * A lightweight cell for displaying external accounts that aren't in the wallet.
 * Reuses AccountCell styling but doesn't depend on account tree selectors.
 */
export interface ExternalAccountCellProps {
  address: string;
  onPress: () => void;
  chainId?: string;
  isSelected?: boolean;
}

const ExternalAccountCell: React.FC<ExternalAccountCellProps> = ({
  address,
  onPress,
  chainId,
  isSelected = false,
}) => {
  const { styles } = useStyles(createStyles, { isSelected });
  const avatarAccountType = useSelector(selectAvatarAccountType);
  const formattedAddress = formatAddress(address, 'short');

  // Get network image if chainId is provided
  const networkImageSource = chainId
    ? getNetworkImageSource({ chainId })
    : undefined;

  return (
    <View style={styles.accountItem}>
      {isSelected && <View style={styles.selectedIndicator} />}
      <View style={styles.accountCellWrapper}>
        <TouchableOpacity
          onPress={onPress}
          style={styles.externalAccountContainer}
        >
          <AvatarAccount
            accountAddress={address}
            type={avatarAccountType}
            size={AvatarSize.Md}
          />
          <View style={styles.textContainer}>
            <Text
              variant={TextVariant.BodyMDMedium}
              color={TextColor.Default}
              numberOfLines={1}
            >
              {strings('bridge.external_account')}
            </Text>
            <Text
              variant={TextVariant.BodySM}
              color={TextColor.Alternative}
              numberOfLines={1}
            >
              {formattedAddress}
            </Text>
          </View>
          {networkImageSource && (
            <View style={styles.networkAvatarContainer}>
              <Avatar
                variant={AvatarVariant.Network}
                size={AvatarSize.Xs}
                imageSource={networkImageSource}
              />
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

ExternalAccountCell.displayName = 'ExternalAccountCell';

export default React.memo(ExternalAccountCell);
