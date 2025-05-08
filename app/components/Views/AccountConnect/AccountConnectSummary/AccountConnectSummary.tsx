// Third party dependencies.
import React, { useCallback, useMemo } from 'react';
import { View, SafeAreaView, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector, shallowEqual } from 'react-redux';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import DefaultTabBar from 'react-native-scrollable-tab-view/DefaultTabBar';
import { CaipAccountId } from '@metamask/utils';

// External dependencies.
import Engine from '../../../../core/Engine';
import { RootState } from '../../../../reducers';
import { strings } from '../../../../../locales/i18n';
import { getHost } from '../../../../util/browser';
import { formatAddress } from '../../../../util/address';
import { useTheme } from '../../../../util/theme';
import { isDefaultAccountName } from '../../../../util/ENSUtils';
import StyledButton from '../../../UI/StyledButton';
import WebsiteIcon from '../../../UI/WebsiteIcon';
import { useStyles } from '../../../../component-library/hooks';
import TextComponent, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import {
  AvatarAccountType,
  AvatarVariant,
} from '../../../../component-library/components/Avatars/Avatar';
import Cell, {
  CellVariant,
} from '../../../../component-library/components/Cells/Cell';
import { CommonSelectorsIDs } from '../../../../../e2e/selectors/Common.selectors';
import { EnsByAccountAddress } from '../../../hooks/useAccounts';

// Internal dependencies.
import styleSheet from './AccountConnectSummary.styles';
import { AccountConnectSummaryProps } from './AccountConnectSummary.types';

const ITEM_HEIGHT = 75;

// TODO: Mock components
const AccountsConnectedItemList = ({
  selectedAddresses,
  ensByAccountAddress,
}: {
  selectedAddresses: CaipAccountId[];
  ensByAccountAddress: EnsByAccountAddress;
}) => {
  const MAX_HEIGHT =
    selectedAddresses.length < 4 ? selectedAddresses.length * ITEM_HEIGHT : 3.5;
  console.log('MAX_HEIGHT:', MAX_HEIGHT);
  const { styles } = useStyles(styleSheet, { itemHeight: MAX_HEIGHT });
  const accountAvatarType = useSelector(
    (state: RootState) =>
      state.settings.useBlockieIcon
        ? AvatarAccountType.Blockies
        : AvatarAccountType.JazzIcon,
    shallowEqual,
  );

  const renderAccountItem = useCallback(
    ({ item }: { item: CaipAccountId }) => {
      // This list item needs to render the following:
      // - Account balance
      // - Potential network connections

      // - Account address (short address) ✅
      // TODO: Find out if we have a standardized util function to get the address from the caipAccountId
      const address = item.split(':')[2];
      const shortAddress = formatAddress(address, 'short');
      const account = Engine.context.AccountsController.getAccount(address);
      // - Account avatar ✅
      const avatarProps = {
        variant: AvatarVariant.Account as const,
        type: accountAvatarType,
        accountAddress: address,
      };
      // - Account name (ens name or name)
      console.log('ensByAccountAddress', ensByAccountAddress);
      // const ensName = ensByAccountAddress[address];
      // const accountName =
      //   isDefaultAccountName(account?.metadata.name) && ensName
      //     ? ensName
      //     : account?.metadata.name;

      return (
        <Cell
          key={address}
          style={styles.accountListItem}
          // onLongPress={handleLongPress}
          variant={CellVariant.Display}
          avatarProps={avatarProps}
          title={shortAddress}
          secondaryText={shortAddress}
          showSecondaryTextIcon={false}
          // tertiaryText={balanceError}
          // onPress={handlePress}
          // tagLabel={tagLabel}
          // disabled={isDisabled}
          // style={cellStyle}
          // buttonProps={buttonProps}
        >
          {/* {renderRightAccessory?.(address, accountName) ||
        (assets && renderAccountBalances(assets, address))} */}
          {/* <TextComponent>{shortAddress}</TextComponent> */}
        </Cell>
      );
    },
    [accountAvatarType, styles.accountListItem, ensByAccountAddress],
  );

  return (
    <View style={styles.accountsConnectedContainer}>
      <FlatList
        keyExtractor={(item) => item}
        data={selectedAddresses}
        renderItem={renderAccountItem}
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
      />
    </View>
  );
};

// TODO: Mock components
const Permissions = () => (
  <View>
    <TextComponent>Permissions</TextComponent>
  </View>
);

const AccountConnectSummary = ({
  currentPageInformation,
  selectedAddresses,
  onEditAccountsPermissions,
  ensByAccountAddress,
  isNonDappNetworkSwitch,
  showActionButtons = true,
  isNetworkSwitch = true,
  accountAddresses = [],
}: AccountConnectSummaryProps) => {
  const { styles } = useStyles(styleSheet, { itemHeight: ITEM_HEIGHT });
  const theme = useTheme();
  const { colors } = theme;
  const navigation = useNavigation();

  const hostname = useMemo(
    () => new URL(currentPageInformation.url).hostname,
    [currentPageInformation.url],
  );

  const renderTopIcon = useCallback(() => {
    const { currentEnsName, icon } = currentPageInformation;
    const url = currentPageInformation.url;
    const iconTitle = getHost(currentEnsName || url);

    return (
      <WebsiteIcon
        style={styles.domainLogoContainer}
        viewStyle={styles.assetLogoContainer}
        title={iconTitle}
        url={currentEnsName || url}
        icon={typeof icon === 'string' ? icon : icon?.uri}
      />
    );
  }, [
    currentPageInformation,
    styles.assetLogoContainer,
    styles.domainLogoContainer,
  ]);

  const renderHeader = useCallback(
    () => (
      <View style={styles.header}>
        <View
          style={[
            styles.logoContainer,
            isNonDappNetworkSwitch && styles.logoContainerNonDapp,
          ]}
        >
          {renderTopIcon()}
        </View>
        <View style={styles.headerTitleContainer}>
          <TextComponent variant={TextVariant.HeadingSM}>
            {hostname}
          </TextComponent>
          <TextComponent
            style={styles.headerDescription}
            variant={TextVariant.BodyMD}
          >
            {strings('account_dapp_connections.account_summary_header')}
          </TextComponent>
        </View>
      </View>
    ),
    [
      hostname,
      isNonDappNetworkSwitch,
      renderTopIcon,
      styles.header,
      styles.headerTitleContainer,
      styles.logoContainer,
      styles.logoContainerNonDapp,
      styles.headerDescription,
    ],
  );

  const renderTabBar = useCallback(
    (props: Record<string, unknown>) => (
      <View style={styles.base}>
        <DefaultTabBar
          underlineStyle={styles.tabUnderlineStyle}
          activeTextColor={colors.primary.default}
          inactiveUnderlineStyle={styles.tabUnderlineStyleInactive}
          inactiveTextColor={colors.text.muted}
          backgroundColor={colors.background.default}
          tabStyle={styles.tabStyle}
          textStyle={styles.textStyle}
          tabPadding={16}
          style={styles.tabBar}
          {...props}
        />
      </View>
    ),
    [styles, colors],
  );

  const onChangeTab = useCallback((tabInfo: { i: number; ref: unknown }) => {
    // eslint-disable-next-line no-console
    console.log('tabInfo', tabInfo);
  }, []);

  const cancel = () => {
    // eslint-disable-next-line no-console
    console.log('cancel');
  };

  const confirm = () => {
    // eslint-disable-next-line no-console
    console.log('confirm');
  };

  const accountsConnectedTabProps = useMemo(
    () => ({
      key: 'account-connected-tab',
      tabLabel: 'Accounts',
      navigation,
    }),
    [navigation],
  );

  const permissionsTabProps = useMemo(
    () => ({
      key: 'permissions-tab',
      tabLabel: 'Permissions',
      navigation,
    }),
    [navigation],
  );

  const renderTabsContent = () => (
    <ScrollableTabView renderTabBar={renderTabBar} onChangeTab={onChangeTab}>
      <AccountsConnectedItemList
        selectedAddresses={selectedAddresses}
        {...accountsConnectedTabProps}
      />
      <Permissions {...permissionsTabProps} />
    </ScrollableTabView>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.mainContainer}>
        {renderHeader()}
        {renderTabsContent()}
        <TouchableOpacity
          style={styles.editAccountsContainer}
          onPress={onEditAccountsPermissions}
        >
          <TextComponent
            color={TextColor.Primary}
            variant={TextVariant.BodyMDMedium}
          >
            {strings('accounts.edit_accounts_title')}
          </TextComponent>
        </TouchableOpacity>
        {showActionButtons && !isNonDappNetworkSwitch && (
          <View style={styles.actionButtonsContainer}>
            <StyledButton
              type={'cancel'}
              onPress={cancel}
              containerStyle={[styles.buttonPositioning, styles.cancelButton]}
              testID={CommonSelectorsIDs.CANCEL_BUTTON}
            >
              {strings('permissions.cancel')}
            </StyledButton>
            <StyledButton
              type={'confirm'}
              onPress={confirm}
              disabled={accountAddresses.length === 0}
              containerStyle={[styles.buttonPositioning, styles.confirmButton]}
              testID={CommonSelectorsIDs.CONNECT_BUTTON}
            >
              {isNetworkSwitch
                ? strings('confirmation_modal.confirm_cta')
                : strings('accounts.connect')}
            </StyledButton>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default AccountConnectSummary;
