import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import {
  AvatarAccount,
  AvatarAccountSize,
  AvatarNetwork,
  AvatarNetworkSize,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { useStyles } from '../../../../hooks';
import { formatAddress } from '../../../../../util/address';
import { getNetworkImageSource } from '../../../../../util/networks';
import { selectAvatarAccountType } from '../../../../../selectors/settings';
import { strings } from '../../../../../../locales/i18n';
import createStyles from '../MultichainAccountSelectorList.styles';
import { EXTERNAL_ACCOUNT_CELL_TEST_IDS } from './ExternalAccountCell.testIds';
import { getAvatarAccountVariant } from '../../avatarAccountVariant';

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
  isDisabled?: boolean;
}

const ExternalAccountCell: React.FC<ExternalAccountCellProps> = ({
  address,
  onPress,
  chainId,
  isSelected = false,
  isDisabled = false,
}) => {
  const { styles } = useStyles(createStyles, { isSelected });
  const avatarAccountType = useSelector(selectAvatarAccountType);
  const avatarAccountVariant = getAvatarAccountVariant(avatarAccountType);
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
          disabled={isDisabled}
          style={[
            styles.externalAccountContainer,
            isDisabled && styles.externalAccountContainerDisabled,
          ]}
          testID={EXTERNAL_ACCOUNT_CELL_TEST_IDS.CONTAINER}
        >
          <AvatarAccount
            address={address}
            variant={avatarAccountVariant}
            size={AvatarAccountSize.Md}
          />
          <View style={styles.textContainer}>
            <Text
              variant={TextVariant.BodyMd}
              color={isDisabled ? TextColor.TextMuted : TextColor.TextDefault}
              fontWeight={FontWeight.Medium}
              numberOfLines={1}
            >
              {strings('bridge.external_account')}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={
                isDisabled ? TextColor.TextMuted : TextColor.TextAlternative
              }
              numberOfLines={1}
            >
              {formattedAddress}
            </Text>
          </View>
          {networkImageSource && (
            <View style={styles.networkAvatarContainer}>
              <AvatarNetwork
                size={AvatarNetworkSize.Xs}
                src={networkImageSource}
                testID={EXTERNAL_ACCOUNT_CELL_TEST_IDS.NETWORK_AVATAR}
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
