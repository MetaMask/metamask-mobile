import { AccountGroupObject } from '@metamask/account-tree-controller';
import React, { useCallback } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
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
import { selectInternalAccountByAccountGroupAndScope } from '../../../../selectors/multichainAccounts/accounts';
import {
  useAccountGroupBalance,
  useAccountGroupIconSeedAddress,
} from '../useAccountGroupDisplay';
import { createAccountGroupDetailsNavigationDetails } from '../../../../components/Views/MultichainAccounts/sheets/MultichainAccountActions/MultichainAccountActions';
import { navigateWithDetails } from '../../../../util/navigation/navUtils';
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
  const { navigate } = useNavigation<AppNavigationProp>();

  const handleMenuPress = useCallback(() => {
    navigateWithDetails(
      { navigate },
      createAccountGroupDetailsNavigationDetails({ accountGroup }),
    );
  }, [navigate, accountGroup]);

  const { balanceLabel, isBalanceHidden } = useAccountGroupBalance(
    accountGroup.id,
  );

  return (
    <>
      <TouchableOpacity onPress={onSelectAccount}>
        <View style={styles.balanceContainer}>
          <SensitiveText
            variant={TextVariant.BodyMd}
            color={TextColor.TextDefault}
            fontWeight={FontWeight.Medium}
            length={SensitiveTextLength.Long}
            isHidden={isBalanceHidden}
            testID={AccountCellIds.BALANCE}
          >
            {balanceLabel ?? null}
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

// The network-specific address sub-row is only shown when a chainId is
// provided. Isolating it in its own component means the deep-equal
// `selectInternalAccountByAccountGroupAndScope` subscription only exists on that
// path — not on every cell of the (chainId-less) account list.
const AccountNetworkAddressRow = ({
  accountGroupId,
  chainId,
}: {
  accountGroupId: string;
  chainId: string;
}) => {
  const { styles } = useStyles(styleSheet, {});
  const getInternalAccountByAccountGroupAndScope = useSelector(
    selectInternalAccountByAccountGroupAndScope,
  );

  const caipChainId = formatChainIdToCaip(chainId);
  const internalAccount = getInternalAccountByAccountGroupAndScope(
    caipChainId,
    accountGroupId,
  );
  const networkAccountAddress = internalAccount?.address
    ? renderShortAddress(internalAccount.address, 4)
    : undefined;

  if (!networkAccountAddress) {
    return null;
  }

  return (
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

  const evmAddress = useAccountGroupIconSeedAddress(accountGroup.id);

  // Network avatar derives purely from chainId — no store subscription needed.
  const networkImageSource = chainId
    ? getNetworkImageSource({ chainId })
    : undefined;

  return (
    <Box
      style={styles.container}
      flexDirection={FlexDirection.Row}
      justifyContent={JustifyContent.flexStart}
      alignItems={AlignItems.center}
      testID={AccountCellIds.CONTAINER}
    >
      <TouchableOpacity
        onPress={onSelectAccount}
        style={styles.mainTouchable}
        testID={AccountCellIds.SELECT}
      >
        {startAccessory}
        <AvatarAccount
          address={evmAddress}
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
          {chainId ? (
            <AccountNetworkAddressRow
              accountGroupId={accountGroup.id}
              chainId={chainId}
            />
          ) : null}
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
