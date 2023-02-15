// Third party dependencies.
import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { KeyringTypes } from '@metamask/keyring-controller';

// External dependencies.
import SheetActions from '../../../../component-library/components-temp/SheetActions';
import SheetHeader from '../../../../component-library/components/Sheet/SheetHeader';
import { strings } from '../../../../../locales/i18n';
import Cell, {
  CellVariants,
} from '../../../../component-library/components/Cells/Cell';
import TagUrl from '../../../../component-library/components/Tags/TagUrl';
import Text from '../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../component-library/hooks';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import { AvatarVariants } from '../../../../component-library/components/Avatars/Avatar';
import { AvatarAccountType } from '../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { formatAddress } from '../../../../util/address';
import Icon, { IconName } from '../../../../component-library/components/Icon';
import { AccountConnectScreens } from '../AccountConnect.types';

// Internal dependencies.
import { AccountConnectSingleProps } from './AccountConnectSingle.types';
import styleSheet from './AccountConnectSingle.styles';
import USER_INTENT from '../../../../constants/permissions';

import {
  ACCOUNT_APROVAL_MODAL_CONTAINER_ID,
  CANCEL_BUTTON_ID,
  CONNECT_BUTTON_ID,
} from '../../../../../app/constants/test-ids';

const AccountConnectSingle = ({
  defaultSelectedAccount,
  onSetScreen,
  onSetSelectedAddresses,
  onUserAction,
  isLoading,
  favicon,
  hostname,
  secureIcon,
}: AccountConnectSingleProps) => {
  const { styles } = useStyles(styleSheet, {});
  const accountAvatarType = useSelector((state: any) =>
    state.settings.useBlockieIcon
      ? AvatarAccountType.Blockies
      : AvatarAccountType.JazzIcon,
  );

  const getTagLabel = useCallback((type: KeyringTypes) => {
    let label = '';
    switch (type) {
      case KeyringTypes.qr:
        label = strings('transaction.hardware');
        break;
      case KeyringTypes.simple:
        label = strings('accounts.imported');
        break;
    }
    return label;
  }, []);

  const renderSheetAction = useCallback(
    () => (
      <View style={styles.sheetActionContainer}>
        <SheetActions
          actions={[
            {
              label: strings('accounts.connect_multiple_accounts'),
              onPress: () => {
                onSetSelectedAddresses(
                  defaultSelectedAccount?.address
                    ? [defaultSelectedAccount.address]
                    : [],
                );
                onSetScreen(AccountConnectScreens.MultiConnectSelector);
              },
              disabled: isLoading,
            },
          ]}
        />
      </View>
    ),
    [
      onSetScreen,
      onSetSelectedAddresses,
      isLoading,
      styles,
      defaultSelectedAccount?.address,
    ],
  );

  const renderCtaButtons = useCallback(
    () => (
      <View style={[styles.ctaButtonsContainer, isLoading && styles.disabled]}>
        <Button
          variant={ButtonVariants.Secondary}
          label={strings('accounts.cancel')}
          onPress={() => {
            onUserAction(USER_INTENT.Cancel);
          }}
          size={ButtonSize.Lg}
          style={styles.button}
          testID={CANCEL_BUTTON_ID}
        />
        <View style={styles.buttonSeparator} />
        <Button
          variant={ButtonVariants.Primary}
          label={strings('accounts.connect')}
          onPress={() => {
            onUserAction(USER_INTENT.Confirm);
          }}
          size={ButtonSize.Lg}
          style={styles.button}
          testID={CONNECT_BUTTON_ID}
        />
      </View>
    ),
    [onUserAction, isLoading, styles],
  );

  const renderSelectedAccount = useCallback(() => {
    if (!defaultSelectedAccount) return null;
    const { name, address, type, balanceError } = defaultSelectedAccount;
    const shortAddress = formatAddress(address, 'short');
    const tagLabel = getTagLabel(type);

    return (
      <Cell
        variant={CellVariants.Display}
        title={name}
        secondaryText={shortAddress}
        tertiaryText={balanceError}
        onPress={() => onSetScreen(AccountConnectScreens.SingleConnectSelector)}
        avatarProps={{
          variant: AvatarVariants.Account,
          type: accountAvatarType,
          accountAddress: address,
        }}
        tagLabel={tagLabel}
        disabled={isLoading}
        style={isLoading && styles.disabled}
      >
        <View style={styles.downCaretContainer}>
          <Icon name={IconName.ArrowDownOutline} />
        </View>
      </Cell>
    );
  }, [
    accountAvatarType,
    onSetScreen,
    defaultSelectedAccount,
    isLoading,
    styles,
    getTagLabel,
  ]);

  return (
    <>
      <SheetHeader title={strings('accounts.connect_account_title')} />
      <View style={styles.body} testID={ACCOUNT_APROVAL_MODAL_CONTAINER_ID}>
        <TagUrl imageSource={favicon} label={hostname} iconName={secureIcon} />
        <Text style={styles.description}>
          {strings('accounts.connect_description')}
        </Text>
        {renderSelectedAccount()}
      </View>
      {renderSheetAction()}
      <View style={styles.body}>{renderCtaButtons()}</View>
    </>
  );
};

export default AccountConnectSingle;
