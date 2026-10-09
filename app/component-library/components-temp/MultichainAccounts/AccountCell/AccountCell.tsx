import { AccountGroupObject } from '@metamask/account-tree-controller';
import React, { useCallback, useMemo } from 'react';
import { Pressable, View } from 'react-native';
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
import { selectBalanceByAccountGroup } from '../../../../selectors/assets/balances';
import { formatWithThreshold } from '../../../../util/assets';
import I18n from '../../../../../locales/i18n';
import {
  selectAllAccountGroupIconSeedAddresses,
  selectInternalAccountByAccountGroupAndScope,
} from '../../../../selectors/multichainAccounts/accounts';
import { RootState } from '../../../../reducers';
import { selectPrivacyMode } from '../../../../selectors/preferencesController';
import { createAccountGroupDetailsNavigationDetails } from '../../../../components/Views/MultichainAccounts/sheets/MultichainAccountActions/MultichainAccountActions';
import { navigateWithDetails } from '../../../../util/navigation/navUtils';
import { getNetworkImageSource } from '../../../../util/networks';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { renderShortAddress } from '../../../../util/address';
import useMoneyAccountBalance from '../../../../components/UI/Money/hooks/useMoneyAccountBalance';
import useMoneyAccountInfo from '../../../../components/UI/Money/hooks/useMoneyAccountInfo';
import { useFiatNormalizer } from '../../../../components/Views/Homepage/BalanceBreakdown/hooks/useFiatNormalizer';
import {
  type AccountAvatarVariant,
  getAvatarAccountVariant,
} from '../avatarAccountVariant';

interface AccountCellProps {
  accountGroup: AccountGroupObject;
  avatarAccountType: AccountAvatarVariant;
  hideMenu?: boolean;
  showBalance?: boolean;
  showMoneyBalance?: boolean;
  startAccessory?: React.ReactNode;
  endContainer?: React.ReactNode;
  nonTokenBalance?: number | null;
  chainId?: string;
  onSelectAccount?: () => void;
}

type BalanceEndContainerProps = Pick<
  AccountCellProps,
  | 'accountGroup'
  | 'hideMenu'
  | 'nonTokenBalance'
  | 'onSelectAccount'
  | 'showBalance'
  | 'showMoneyBalance'
> & {
  networkImageSource?: React.ComponentProps<typeof AvatarNetwork>['src'];
};

interface BalanceDisplayProps {
  totalBalance?: number;
  userCurrency?: string;
  privacyMode: boolean;
  onSelectAccount?: () => void;
  networkImageSource?: React.ComponentProps<typeof AvatarNetwork>['src'];
}

const BalanceDisplay = ({
  totalBalance,
  userCurrency,
  privacyMode,
  onSelectAccount,
  networkImageSource,
}: BalanceDisplayProps) => {
  const { styles } = useStyles(styleSheet, {});

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
    <Pressable onPress={onSelectAccount}>
      <View style={styles.balanceContainer}>
        {/* Keep zero balances blank. `selectBalanceByAccountGroup` synthesizes
            0 before assets load, so "$0.00" reads as a real empty wallet.
            Product keeps the amount empty until a loaded non-zero balance
            exists so users do not think funds disappeared. */}
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
    </Pressable>
  );
};

interface MoneyBalanceDisplayProps
  extends Omit<BalanceDisplayProps, 'totalBalance'> {
  tokenBalance?: number;
}

const MoneyBalanceDisplay = ({
  tokenBalance,
  userCurrency,
  privacyMode,
  onSelectAccount,
  networkImageSource,
}: MoneyBalanceDisplayProps) => {
  const { toUserCurrency } = useFiatNormalizer();
  const { isBalanceUnavailable, totalFiatRaw } = useMoneyAccountBalance();

  const moneyAccountBalanceInUserCurrency = useMemo(() => {
    if (isBalanceUnavailable || totalFiatRaw === undefined) {
      return undefined;
    }
    return toUserCurrency(Number(totalFiatRaw));
  }, [isBalanceUnavailable, toUserCurrency, totalFiatRaw]);

  const totalBalance = useMemo(() => {
    if (
      tokenBalance === undefined ||
      moneyAccountBalanceInUserCurrency === undefined
    ) {
      return undefined;
    }
    return tokenBalance + moneyAccountBalanceInUserCurrency;
  }, [moneyAccountBalanceInUserCurrency, tokenBalance]);

  return (
    <BalanceDisplay
      totalBalance={totalBalance}
      userCurrency={userCurrency}
      privacyMode={privacyMode}
      onSelectAccount={onSelectAccount}
      networkImageSource={networkImageSource}
    />
  );
};

const AccountBalanceDisplay = ({
  accountGroup,
  nonTokenBalance,
  onSelectAccount,
  showMoneyBalance = true,
  networkImageSource,
}: BalanceEndContainerProps) => {
  const selectBalanceForGroup = useMemo(
    () => selectBalanceByAccountGroup(accountGroup.id),
    [accountGroup.id],
  );
  const groupBalance = useSelector(selectBalanceForGroup);
  const { hasMoneyAccount } = useMoneyAccountInfo();
  const userCurrency = groupBalance?.userCurrency;
  const privacyMode = useSelector(selectPrivacyMode);

  return (
    <>
      {nonTokenBalance !== undefined ? (
        <BalanceDisplay
          totalBalance={
            groupBalance?.totalBalanceInUserCurrency === undefined ||
            nonTokenBalance === null
              ? undefined
              : groupBalance.totalBalanceInUserCurrency + nonTokenBalance
          }
          userCurrency={userCurrency}
          privacyMode={privacyMode}
          onSelectAccount={onSelectAccount}
          networkImageSource={networkImageSource}
        />
      ) : showMoneyBalance && hasMoneyAccount ? (
        <MoneyBalanceDisplay
          tokenBalance={groupBalance?.totalBalanceInUserCurrency}
          userCurrency={userCurrency}
          privacyMode={privacyMode}
          onSelectAccount={onSelectAccount}
          networkImageSource={networkImageSource}
        />
      ) : (
        <BalanceDisplay
          totalBalance={groupBalance?.totalBalanceInUserCurrency}
          userCurrency={userCurrency}
          privacyMode={privacyMode}
          onSelectAccount={onSelectAccount}
          networkImageSource={networkImageSource}
        />
      )}
    </>
  );
};

const BalanceEndContainer = ({
  accountGroup,
  hideMenu,
  nonTokenBalance,
  onSelectAccount,
  showBalance = true,
  showMoneyBalance = true,
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

  return (
    <>
      {showBalance ? (
        <AccountBalanceDisplay
          accountGroup={accountGroup}
          nonTokenBalance={nonTokenBalance}
          onSelectAccount={onSelectAccount}
          showMoneyBalance={showMoneyBalance}
          networkImageSource={networkImageSource}
        />
      ) : null}
      {!hideMenu && (
        <Pressable
          testID={AccountCellIds.MENU}
          style={styles.menuButton}
          onPress={handleMenuPress}
        >
          <Icon
            name={IconName.MoreVertical}
            size={IconSize.Md}
            color={IconColor.IconAlternative}
          />
        </Pressable>
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
  showBalance = true,
  showMoneyBalance = true,
  startAccessory,
  endContainer,
  nonTokenBalance,
  chainId,
  onSelectAccount,
}: AccountCellProps) => {
  const { styles } = useStyles(styleSheet, {});
  const avatarAccountVariant = getAvatarAccountVariant(avatarAccountType);

  // Read this cell's icon seed address from the shared map selector (O(1))
  // instead of instantiating a per-cell deep-equal selector. `useSelector`
  // re-renders only when this group's primitive address changes.
  const evmAddress = useSelector(
    (state: RootState) =>
      selectAllAccountGroupIconSeedAddresses(state)[accountGroup.id] ?? '',
  );

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
      <Pressable
        onPress={onSelectAccount}
        style={styles.mainTouchable}
        testID={AccountCellIds.SELECT}
      >
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
          {chainId ? (
            <AccountNetworkAddressRow
              accountGroupId={accountGroup.id}
              chainId={chainId}
            />
          ) : null}
        </View>
      </Pressable>
      <View style={styles.endContainer}>
        {endContainer || (
          <BalanceEndContainer
            accountGroup={accountGroup}
            hideMenu={hideMenu}
            nonTokenBalance={nonTokenBalance}
            onSelectAccount={onSelectAccount}
            showBalance={showBalance}
            showMoneyBalance={showMoneyBalance}
            networkImageSource={networkImageSource}
          />
        )}
      </View>
    </Box>
  );
};

export default React.memo(AccountCell);
