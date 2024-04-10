// Third parties dependencies
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

// External dependencies
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { formatAddress, safeToChecksumAddress } from '../../../util/address';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import ClipboardManager from '../../../core/ClipboardManager';
import { showAlert } from '../../../actions/alert';
import { protectWalletModalVisible } from '../../../actions/user';
import { strings } from '../../../../locales/i18n';
import { Platform, View } from 'react-native';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useStyles } from '../../../component-library/hooks';
import generateTestId from '../../../../wdio/utils/generateTestId';

// Internal dependencies
import styleSheet from './AddressCopy.styles';
import { AddressCopyProps } from './AddressCopy.types';
import { selectIdentities } from '../../../selectors/preferencesController';
import selectSelectedInternalAccount from '../../../selectors/accountsController';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { toChecksumAddress } from 'ethereumjs-util';

const AddressCopy = ({ formatAddressType = 'full' }: AddressCopyProps) => {
  const { styles } = useStyles(styleSheet, {});

  const dispatch = useDispatch();
  const { trackEvent } = useMetrics();

  const handleShowAlert = (config: {
    isVisible: boolean;
    autodismiss: number;
    content: string;
    data: { msg: string };
  }) => dispatch(showAlert(config));

  const handleProtectWalletModalVisible = () =>
    dispatch(protectWalletModalVisible());

  /**
   * A string that represents the selected address
   */
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);

  /**
   * An object containing each identity in the format address => account
   */
  const identities = useSelector(selectIdentities);
  const checksummedSelectedAddress = toChecksumAddress(
    selectedInternalAccount.address,
  );

  const account = {
    ...identities[checksummedSelectedAddress],
    address: checksummedSelectedAddress,
  };

  const copyAccountToClipboard = async () => {
    await ClipboardManager.setString(checksummedSelectedAddress);
    handleShowAlert({
      isVisible: true,
      autodismiss: 1500,
      content: 'clipboard-alert',
      data: { msg: strings('account_details.account_copied_to_clipboard') },
    });
    setTimeout(() => handleProtectWalletModalVisible(), 2000);

    trackEvent(MetaMetricsEvents.WALLET_COPIED_ADDRESS);
  };
  return (
    <View style={styles.address}>
      <Text variant={TextVariant.BodySMBold}>
        {strings('asset_overview.address')}:
      </Text>
      <TouchableOpacity
        style={styles.copyButton}
        onPress={copyAccountToClipboard}
        {...generateTestId(Platform, 'wallet-account-copy-button')}
      >
        <Text
          color={TextColor.Primary}
          variant={TextVariant.BodySM}
          {...generateTestId(Platform, 'wallet-account-address')}
        >
          {formatAddress(account.address, formatAddressType)}
        </Text>
        <Icon
          name={IconName.Copy}
          size={IconSize.Sm}
          color={IconColor.Primary}
          style={styles.icon}
        />
      </TouchableOpacity>
    </View>
  );
};
export default AddressCopy;
