import { AccountGroupObject } from '@metamask/account-tree-controller';
import React, { useCallback, useMemo } from 'react';
import { type ImageSourcePropType, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useStyles } from '../../../hooks';
import { useNavigation } from '../../../../util/navigation/navUtils';
import styleSheet from './AccountCell.styles';
import Text, { TextColor, TextVariant } from '../../../components/Texts/Text';
import { Box } from '../../../../components/UI/Box/Box';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../../components/UI/Box/box.types';
import Icon, { IconName, IconSize } from '../../../components/Icons/Icon';
import { AccountCellIds } from './AccountCell.testIds';
import { selectBalanceByAccountGroup } from '../../../../selectors/assets/balances';
import { formatWithThreshold } from '../../../../util/assets';
import I18n from '../../../../../locales/i18n';
import AvatarAccount, {
  AvatarAccountType,
} from '../../../components/Avatars/Avatar/variants/AvatarAccount';
import Avatar, { AvatarVariant } from '../../../components/Avatars/Avatar';
import { AvatarSize } from '../../../components/Avatars/Avatar/Avatar.types';
import {
  selectIconSeedAddressByAccountGroupId,
  selectInternalAccountByAccountGroupAndScope,
} from '../../../../selectors/multichainAccounts/accounts';
import { createAccountGroupDetailsNavigationDetails } from '../../../../components/Views/MultichainAccounts/sheets/MultichainAccountActions/MultichainAccountActions';
import { getNetworkImageSource } from '../../../../util/networks';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { renderShortAddress } from '../../../../util/address';

interface AccountCellProps {
  accountGroup: AccountGroupObject;
  avatarAccountType: AvatarAccountType;
  hideMenu?: boolean;
  startAccessory?: React.ReactNode;
  endContainer?: React.ReactNode;
  chainId?: string;
  onSelectAccount?: () => void;
}

type BalanceEndContainerProps = Pick<
  AccountCellProps,
  'accountGroup' | 'hideMenu' | 'onSelectAccount'
> & {
  networkImageSource?: ImageSourcePropType;
};

const BalanceEndContainer = ({
  accountGroup,
  hideMenu,
  onSelectAccount,
  networkImageSource,
}: BalanceEndContainerProps) => {
  const { styles } = useStyles(styleSheet, {});
  const { navigate } = useNavigation();

  const handleMenuPress = useCallback(() => {
    navigate(...createAccountGroupDetailsNavigationDetails({ accountGroup }));
  }, [navigate, accountGroup]);

  const selectBalanceForGroup = useMemo(
    () => selectBalanceByAccountGroup(accountGroup.id),
    [accountGroup.id],
  );
  const groupBalance = useSelector(selectBalanceForGroup);
  const totalBalance = groupBalance?.totalBalanceInUserCurrency;
  const userCurrency = groupBalance?.userCurrency;

  const displayBalance = useMemo(() => {
    if (totalBalance == null || !userCurrency) {
      return undefined;
    }
    return formatWithThreshold(totalBalance, 0.01, I18n.locale, {
      style: 'currency',
      currency: userCurrency.toUpperCase(),
    });
  }, [totalBalance, userCurrency]);

  return (
    <>
      <TouchableOpacity onPress={onSelectAccount}>
        <View style={styles.balanceContainer}>
          <Text
            variant={TextVariant.BodyMDMedium}
            color={TextColor.Default}
            testID={AccountCellIds.BALANCE}
          >
            {totalBalance ? displayBalance : null}
          </Text>
          {networkImageSource && (
            <Avatar
              variant={AvatarVariant.Network}
              size={AvatarSize.Xs}
              style={styles.networkBadge}
              imageSource={networkImageSource}
            />
          )}
        </View>
      </TouchableOpacity>
      {!hideMenu && (
        <TouchableOpacity
          testID={AccountCellIds.MENU}
          style={styles.menuButton}
          onPress={handleMenuPress}
        >
          <Icon
            name={IconName.MoreVertical}
            size={IconSize.Md}
            color={TextColor.Alternative}
          />
        </TouchableOpacity>
      )}
    </>
  );
};

const AccountCell = ({
  accountGroup,
  avatarAccountType,
  hideMenu = false,
  startAccessory,
  endContainer,
  chainId,
  onSelectAccount,
}: AccountCellProps) => {
  const { styles } = useStyles(styleSheet, {});

  const selectEvmAddress = useMemo(
    () => selectIconSeedAddressByAccountGroupId(accountGroup.id),
    [accountGroup.id],
  );
  const evmAddress = useSelector(selectEvmAddress);

  // Determine which account address and network avatar to display based on the chainId
  let networkAccountAddress;
  let networkImageSource;
  const getInternalAccountByAccountGroupAndScope = useSelector(
    selectInternalAccountByAccountGroupAndScope,
  );
  if (chainId) {
    const caipChainId = formatChainIdToCaip(chainId);
    const internalAccountFromAccountGroupForChainId =
      getInternalAccountByAccountGroupAndScope(caipChainId, accountGroup.id);
    networkAccountAddress = internalAccountFromAccountGroupForChainId?.address
      ? renderShortAddress(internalAccountFromAccountGroupForChainId.address, 4)
      : undefined;
    networkImageSource = getNetworkImageSource({ chainId });
  }

  return (
    <Box
      style={styles.container}
      flexDirection={FlexDirection.Row}
      justifyContent={JustifyContent.flexStart}
      alignItems={AlignItems.center}
      testID={AccountCellIds.CONTAINER}
    >
      <TouchableOpacity onPress={onSelectAccount} style={styles.mainTouchable}>
        {startAccessory}
        <AvatarAccount
          accountAddress={evmAddress}
          type={avatarAccountType}
          size={AvatarSize.Md}
          testID={AccountCellIds.AVATAR}
        />
        <View style={styles.accountName}>
          <View style={styles.accountNameRow}>
            <Text
              variant={TextVariant.BodyMDMedium}
              color={TextColor.Default}
              numberOfLines={1}
              style={styles.accountNameText}
              testID={AccountCellIds.ADDRESS}
            >
              {accountGroup.metadata.name}
            </Text>
          </View>
          {networkAccountAddress && (
            <View style={styles.accountSubRow}>
              <Text
                variant={TextVariant.BodySM}
                color={TextColor.Alternative}
                numberOfLines={1}
                style={styles.accountSubText}
              >
                {networkAccountAddress}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
      <View style={styles.endContainer}>
        {endContainer || (
          <BalanceEndContainer
            accountGroup={accountGroup}
            hideMenu={hideMenu}
            onSelectAccount={onSelectAccount}
            networkImageSource={networkImageSource}
          />
        )}
      </View>
    </Box>
  );
};

export default React.memo(AccountCell);
