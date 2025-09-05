// Third party dependencies.
import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';

// External dependencies.
import { strings } from '../../../../../locales/i18n';
import SheetActions from '../../../../component-library/components-temp/SheetActions';
import { AvatarVariant } from '../../../../component-library/components/Avatars/Avatar';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import Cell, {
  CellVariant,
} from '../../../../component-library/components/Cells/Cell';
import Icon, {
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import SheetHeader from '../../../../component-library/components/Sheet/SheetHeader';
import TagUrl from '../../../../component-library/components/Tags/TagUrl';
import Text, {
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../component-library/hooks';
import { formatAddress, getLabelTextByAddress } from '../../../../util/address';
import { AccountConnectScreens } from '../AccountConnect.types';

// Internal dependencies.
import { USER_INTENT } from '../../../../constants/permissions';
import styleSheet from './AccountConnectSingle.styles';
import { AccountConnectSingleProps } from './AccountConnectSingle.types';

import { CommonSelectorsIDs } from '../../../../../e2e/selectors/Common.selectors';
import { ConnectAccountBottomSheetSelectorsIDs } from '../../../../../e2e/selectors/Browser/ConnectAccountBottomSheet.selectors';
import { selectAvatarAccountType } from '../../../../selectors/settings';

const AccountConnectSingle = ({
  defaultSelectedAccount,
  onSetScreen,
  onSetSelectedAddresses,
  onUserAction,
  isLoading,
  favicon,
  secureIcon,
  urlWithProtocol,
  connection,
}: AccountConnectSingleProps) => {
  const { styles } = useStyles(styleSheet, {});

  const accountAvatarType = useSelector(selectAvatarAccountType);

  const renderSheetAction = useCallback(
    () => (
      <View style={styles.sheetActionContainer}>
        <SheetActions
          actions={[
            {
              label: strings('accounts.connect_multiple_accounts'),
              onPress: () => {
                onSetSelectedAddresses(
                  defaultSelectedAccount?.caipAccountId
                    ? [defaultSelectedAccount.caipAccountId]
                    : [],
                );
                onSetScreen(AccountConnectScreens.MultiConnectSelector);
              },
              disabled: isLoading,
            },
          ]}
        />

        {connection?.originatorInfo?.apiVersion && (
          <View style={styles.sdkInfoContainer}>
            <View style={styles.sdkInfoDivier} />
            <Text color={TextColor.Muted}>
              SDK {connection?.originatorInfo?.platform} v
              {connection?.originatorInfo?.apiVersion}
            </Text>
          </View>
        )}
      </View>
    ),
    [
      onSetScreen,
      onSetSelectedAddresses,
      isLoading,
      styles,
      defaultSelectedAccount?.caipAccountId,
      connection,
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
          testID={CommonSelectorsIDs.CANCEL_BUTTON}
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
          testID={CommonSelectorsIDs.CONNECT_BUTTON}
        />
      </View>
    ),
    [onUserAction, isLoading, styles],
  );

  const renderSelectedAccount = useCallback(() => {
    if (!defaultSelectedAccount) return null;
    const { name, address, balanceError } = defaultSelectedAccount;
    const shortAddress = formatAddress(address, 'short');
    const tagLabel = getLabelTextByAddress(address);

    return (
      <Cell
        variant={CellVariant.Display}
        title={name}
        secondaryText={shortAddress}
        tertiaryText={balanceError}
        onPress={() => onSetScreen(AccountConnectScreens.SingleConnectSelector)}
        avatarProps={{
          variant: AvatarVariant.Account,
          type: accountAvatarType,
          accountAddress: address,
        }}
        tagLabel={tagLabel || ''}
        disabled={isLoading}
        style={isLoading && styles.disabled}
      >
        <View style={styles.downCaretContainer}>
          <Icon name={IconName.ArrowDown} />
        </View>
      </Cell>
    );
  }, [
    accountAvatarType,
    onSetScreen,
    defaultSelectedAccount,
    isLoading,
    styles,
  ]);

  return (
    <>
      <SheetHeader title={strings('accounts.connect_account_title')} />
      <View
        style={styles.body}
        testID={ConnectAccountBottomSheetSelectorsIDs.CONTAINER}
      >
        <TagUrl
          imageSource={favicon}
          label={urlWithProtocol}
          iconName={secureIcon}
        />
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
