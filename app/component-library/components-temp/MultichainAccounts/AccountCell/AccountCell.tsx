import { AccountGroupObject } from '@metamask/account-tree-controller';
import React, { useCallback, useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  AvatarAccount,
  AvatarAccountSize,
  AvatarNetwork,
  AvatarNetworkSize,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  SensitiveText,
  SensitiveTextLength,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../hooks';
import styleSheet from './AccountCell.styles';
import { Box } from '../../../../components/UI/Box/Box';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../../components/UI/Box/box.types';
import { AccountCellIds } from './AccountCell.testIds';
import { selectBalanceByAccountGroup } from '../../../../selectors/assets/balances';
import { formatWithThreshold } from '../../../../util/assets';
import I18n from '../../../../../locales/i18n';
import {
  selectIconSeedAddressByAccountGroupId,
  selectInternalAccountByAccountGroupAndScope,
} from '../../../../selectors/multichainAccounts/accounts';
import { selectPrivacyMode } from '../../../../selectors/preferencesController';
import { createAccountGroupDetailsNavigationDetails } from '../../../../components/Views/MultichainAccounts/sheets/MultichainAccountActions/MultichainAccountActions';
import { getNetworkImageSource } from '../../../../util/networks';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { renderShortAddress } from '../../../../util/address';
import {
  type AccountAvatarVariant,
  getAvatarAccountVariant,
} from '../avatarAccountVariant';

interface AccountCellProps {
  accountGroup: AccountGroupObject;
  avatarAccountType: AccountAvatarVariant;
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
  networkImageSource?: React.ComponentProps<typeof AvatarNetwork>['src'];
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
  const privacyMode = useSelector(selectPrivacyMode);

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
          <SensitiveText
            variant={TextVariant.BodyMd}
            color={TextColor.TextDefault}
            fontWeight={FontWeight.Medium}
            length={SensitiveTextLength.Long}
            isHidden={
              privacyMode && Boolean(displayBalance) && Boolean(totalBalance)
            }
            testID={AccountCellIds.BALANCE}
          >
            {totalBalance ? displayBalance : null}
          </SensitiveText>
          {networkImageSource && (
            <AvatarNetwork
              size={AvatarNetworkSize.Xs}
              style={styles.networkBadge}
              src={networkImageSource}
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
            color={IconColor.IconAlternative}
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
  const avatarAccountVariant = getAvatarAccountVariant(avatarAccountType);

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
          address={evmAddress ?? ''}
          variant={avatarAccountVariant}
          size={AvatarAccountSize.Md}
          testID={AccountCellIds.AVATAR}
        />
        <View style={styles.accountName}>
          <View style={styles.accountNameRow}>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextDefault}
              fontWeight={FontWeight.Medium}
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
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
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
