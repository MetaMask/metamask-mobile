import React, { useCallback, useMemo, useState } from 'react';
import {
  ImageSourcePropType,
  SafeAreaView,
  TouchableOpacity,
  View,
} from 'react-native';
import ScrollableTabView from '@tommasini/react-native-scrollable-tab-view';
import { useNavigation } from '@react-navigation/native';
import { NON_EVM_TESTNET_IDS } from '@metamask/multichain-network-controller';
import StyledButton from '../StyledButton';
import { strings } from '../../../../locales/i18n';
import { useTheme } from '../../../util/theme';
import { CommonSelectorsIDs } from '../../../util/Common.testIds';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../component-library/components/Avatars/Avatar';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import TextComponent, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import AvatarGroup from '../../../component-library/components/Avatars/AvatarGroup';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import { getHost } from '../../../util/browser';
import WebsiteIcon from '../WebsiteIcon';
import styleSheet from './PermissionsSummary.styles';
import { useStyles } from '../../../component-library/hooks';
import { PermissionsSummaryProps } from './PermissionsSummary.types';
import { USER_INTENT } from '../../../constants/permissions';
import Routes from '../../../constants/navigation/Routes';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../component-library/components/Buttons/ButtonIcon';
import TabBar from '../../../component-library/components-temp/TabBar';
import { getNetworkImageSource } from '../../../util/networks';
import Engine from '../../../core/Engine';
import { SDKSelectorsIDs } from '../../Views/SDK/SDK.testIds';
import { useSelector } from 'react-redux';
import {
  selectEvmChainId,
  selectProviderConfig,
} from '../../../selectors/networkController';
import { useNetworkInfo } from '../../../selectors/selectedNetworkController';
import { ConnectedAccountsSelectorsIDs } from '../../Views/AccountConnect/ConnectedAccountModal.testIds';
import { PermissionSummaryBottomSheetSelectorsIDs } from '../../Views/AccountConnect/PermissionSummaryBottomSheet.testIds';
import { NetworkNonPemittedBottomSheetSelectorsIDs } from '../../Views/NetworkConnect/NetworkNonPemittedBottomSheet.testIds';
import AccountsConnectedList from '../../Views/AccountConnect/AccountsConnectedList';
import { selectPrivacyMode } from '../../../selectors/preferencesController';
import {
  BOTTOM_SHEET_BASE_HEIGHT,
  ACCOUNTS_CONNECTED_LIST_ITEM_HEIGHT,
  MAX_VISIBLE_ITEMS,
  SCALE_FACTOR,
} from './PermissionSummary.constants';
import { isCaipAccountIdInPermittedAccountIds } from '@metamask/chain-agnostic-permission';
import { CaipChainId, parseCaipAccountId } from '@metamask/utils';
import BadgeWrapper from '../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../component-library/components/Badges/Badge';
import AvatarFavicon from '../../../component-library/components/Avatars/Avatar/variants/AvatarFavicon';
import AvatarToken from '../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import AccountConnectCreateInitialAccount from '../../Views/AccountConnect/AccountConnectCreateInitialAccount';
import { SolScope } from '@metamask/keyring-api';
import { WalletClientType } from '../../../core/SnapKeyring/MultichainWalletSnapClient';
import { endTrace, trace, TraceName } from '../../../util/trace';

const PermissionsSummary = ({
  currentPageInformation,
  customNetworkInformation,
  onEdit,
  onEditNetworks,
  onBack,
  onCancel,
  onConfirm,
  onUserAction,
  onCreateAccount,
  showActionButtons = true,
  isAlreadyConnected = true,
  isRenderedAsBottomSheet = true,
  isDisconnectAllShown = true,
  isNetworkSwitch = false,
  isNonDappNetworkSwitch = false,
  accountAddresses = [],
  accounts = [],
  networkAvatars = [],
  ensByAccountAddress = {},
  onAddNetwork = () => undefined,
  onChooseFromPermittedNetworks = () => undefined,
  setTabIndex = () => undefined,
  tabIndex = 0,
  showAccountsOnly = false,
  showPermissionsOnly = false,
  promptToCreateSolanaAccount = false,
}: PermissionsSummaryProps) => {
  const nonTabView = showAccountsOnly || showPermissionsOnly;
  const fullNonTabView = showAccountsOnly && showPermissionsOnly;

  const { colors } = useTheme();
  const { styles } = useStyles(styleSheet, {
    isRenderedAsBottomSheet,
    nonTabView,
    fullNonTabView,
  });
  const navigation = useNavigation();
  const { navigate } = navigation;
  const providerConfig = useSelector(selectProviderConfig);
  const chainId = useSelector(selectEvmChainId);
  const privacyMode = useSelector(selectPrivacyMode);
  const [bottomSheetHeight, setBottomSheetHeight] = useState(0);

  const hostname = useMemo(() => {
    try {
      return new URL(currentPageInformation.url).origin;
    } catch {
      return currentPageInformation.url;
    }
  }, [currentPageInformation.url]);
  const { networkName, networkImageSource } = useNetworkInfo(hostname);

  // if network switch, we get the chain name from the customNetworkInformation
  let chainName = '';
  let chainImage: ImageSourcePropType;
  if (isNetworkSwitch && customNetworkInformation?.chainId) {
    chainName = customNetworkInformation?.chainName;
    chainImage = getNetworkImageSource({
      chainId: customNetworkInformation?.chainId,
    });
  }

  const confirm = () => {
    onUserAction?.(USER_INTENT.Confirm);
    onConfirm?.();
  };

  const cancel = () => {
    onUserAction?.(USER_INTENT.Cancel);
    onCancel?.();
  };

  const handleEditAccountsButtonPress = useCallback(() => {
    onEdit?.();
  }, [onEdit]);

  const handleEditNetworksButtonPress = () => {
    onEditNetworks?.();
  };

  const switchNetwork = useCallback(() => {
    navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.NETWORK_SELECTOR,
    });
  }, [navigate]);

  const renderTopIcon = () => {
    const { currentEnsName, icon } = currentPageInformation;
    const url = currentPageInformation.url;
    const iconTitle = getHost(currentEnsName || url);

    return isAlreadyConnected && !showPermissionsOnly ? (
      <View style={[styles.domainLogoContainer, styles.assetLogoContainer]}>
        <TouchableOpacity
          onPress={switchNetwork}
          testID={ConnectedAccountsSelectorsIDs.NETWORK_PICKER}
        >
          <BadgeWrapper
            badgeElement={
              <Badge
                variant={BadgeVariant.Network}
                name={networkName}
                imageSource={networkImageSource}
              />
            }
          >
            {icon ? (
              <AvatarFavicon
                imageSource={{
                  uri: typeof icon === 'string' ? icon : icon?.uri,
                }}
                size={AvatarSize.Md}
              />
            ) : (
              <AvatarToken
                name={iconTitle}
                isHaloEnabled
                size={AvatarSize.Md}
              />
            )}
          </BadgeWrapper>
        </TouchableOpacity>
      </View>
    ) : (
      <WebsiteIcon
        style={styles.domainLogoContainer}
        viewStyle={styles.assetLogoContainer}
        title={iconTitle}
        url={currentEnsName || url}
        icon={typeof icon === 'string' ? icon : icon?.uri}
      />
    );
  };

  function renderHeader() {
    return (
      <View style={styles.header}>
        <View style={styles.startAccessory}>
          {onBack && !isNonDappNetworkSwitch && (
            <ButtonIcon
              testID={PermissionSummaryBottomSheetSelectorsIDs.BACK_BUTTON}
              iconColor={IconColor.Default}
              onPress={onBack}
              iconName={IconName.ArrowLeft}
            />
          )}
        </View>

        <View
          style={[
            styles.logoContainer,
            isNonDappNetworkSwitch && styles.logoContainerNonDapp,
          ]}
        >
          {renderTopIcon()}
        </View>
        <View style={styles.endAccessory}>
          {!isRenderedAsBottomSheet && (
            <ButtonIcon
              size={ButtonIconSizes.Sm}
              iconName={IconName.Info}
              iconColor={IconColor.Default}
              onPress={() => {
                navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
                  screen: Routes.SHEET.CONNECTION_DETAILS,
                  params: {
                    hostInfo: {
                      metadata: {
                        origin:
                          currentPageInformation?.url &&
                          new URL(currentPageInformation?.url).origin,
                      },
                    },
                    connectionDateTime: new Date().getTime(),
                  },
                });
              }}
              testID={SDKSelectorsIDs.CONNECTION_DETAILS_BUTTON}
            />
          )}
        </View>
      </View>
    );
  }

  const renderEndAccessory = () => (
    <View testID={SDKSelectorsIDs.CONNECTION_DETAILS_BUTTON}>
      {isAlreadyConnected ? (
        <Icon size={IconSize.Md} name={IconName.ArrowRight} />
      ) : (
        <View style={styles.editTextContainer}>
          <TextComponent
            color={TextColor.Primary}
            variant={TextVariant.BodyMDMedium}
          >
            {strings('permissions.edit')}
          </TextComponent>
        </View>
      )}
    </View>
  );

  const onRevokeAllHandler = useCallback(async () => {
    await Engine.context.PermissionController.revokeAllPermissions(hostname);
    navigate('PermissionsManager');
  }, [hostname, navigate]);

  const toggleRevokeAllPermissionsModal = useCallback(() => {
    trace({ name: TraceName.DisconnectAllAccountPermissions });
    navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.REVOKE_ALL_ACCOUNT_PERMISSIONS,
      params: {
        hostInfo: {
          metadata: {
            origin: hostname,
          },
        },
        onRevokeAll: !isRenderedAsBottomSheet && onRevokeAllHandler,
      },
    });
    endTrace({ name: TraceName.DisconnectAllAccountPermissions });
  }, [isRenderedAsBottomSheet, onRevokeAllHandler, hostname, navigate]);

  const getAccountLabel = useCallback(() => {
    if (isAlreadyConnected) {
      if (accountAddresses.length === 1) {
        const matchedConnectedAccount = accounts.find((account) =>
          isCaipAccountIdInPermittedAccountIds(account.caipAccountId, [
            accountAddresses[0],
          ]),
        );
        return `${strings('permissions.connected_to')} ${
          matchedConnectedAccount?.name
        }`;
      }

      return `${accountAddresses.length} ${strings(
        'accounts.accounts_connected',
      )}`;
    }

    if (accountAddresses.length === 1 && accounts.length >= 1) {
      const matchedAccount = accounts.find((account) =>
        isCaipAccountIdInPermittedAccountIds(account.caipAccountId, [
          accountAddresses[0],
        ]),
      );

      return `${strings('permissions.requesting_for')}${
        matchedAccount?.name ? matchedAccount.name : accountAddresses[0]
      }`;
    }

    return strings('permissions.requesting_for_accounts', {
      numberOfAccounts: accountAddresses.length,
    });
  }, [accountAddresses, isAlreadyConnected, accounts]);

  const getNetworkLabel = useCallback(() => {
    if (isAlreadyConnected) {
      return networkAvatars.length === 1
        ? networkAvatars[0]?.name
        : `${strings('permissions.n_networks_connect', {
            numberOfNetworks: networkAvatars.length,
          })}`;
    }

    if (networkAvatars.length === 1) {
      return (
        networkAvatars[0]?.name &&
        `${strings('permissions.requesting_for')}${networkAvatars[0]?.name}`
      );
    }

    return strings('permissions.requesting_for_networks', {
      numberOfNetworks: networkAvatars.length,
    });
  }, [networkAvatars, isAlreadyConnected]);

  function renderAccountPermissionsRequestInfoCard() {
    return (
      <TouchableOpacity
        onPress={handleEditAccountsButtonPress}
        testID={
          ConnectedAccountsSelectorsIDs.NAVIGATE_TO_EDIT_ACCOUNTS_PERMISSIONS_BUTTON
        }
      >
        <View
          style={styles.accountPermissionRequestInfoCard}
          testID={PermissionSummaryBottomSheetSelectorsIDs.CONTAINER}
        >
          <Avatar
            variant={AvatarVariant.Icon}
            style={styles.walletIcon}
            name={IconName.Wallet}
            size={AvatarSize.Md}
            backgroundColor={colors.shadow.default}
            iconColor={colors.icon.alternative}
          />
          <View style={styles.accountPermissionRequestDetails}>
            <TextComponent variant={TextVariant.BodyMD}>
              {strings('permissions.see_your_accounts')}
            </TextComponent>
            <View style={styles.permissionRequestAccountInfo}>
              <View style={styles.permissionRequestAccountName}>
                <TextComponent
                  testID={
                    PermissionSummaryBottomSheetSelectorsIDs.ACCOUNT_PERMISSION_CONTAINER
                  }
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  <TextComponent variant={TextVariant.BodySM}>
                    {getAccountLabel()}
                  </TextComponent>
                </TextComponent>
              </View>
              <View style={styles.avatarGroup}>
                <AvatarGroup
                  avatarPropsList={accountAddresses.map((caipAccountId) => {
                    const { address } = parseCaipAccountId(caipAccountId);
                    return {
                      variant: AvatarVariant.Account,
                      accountAddress: address,
                      size: AvatarSize.Xs,
                    };
                  })}
                />
              </View>
            </View>
          </View>
          {renderEndAccessory()}
        </View>
      </TouchableOpacity>
    );
  }

  function renderNetworkPermissionsRequestInfoCard() {
    return (
      <TouchableOpacity
        onPress={handleEditNetworksButtonPress}
        testID={
          ConnectedAccountsSelectorsIDs.NAVIGATE_TO_EDIT_NETWORKS_PERMISSIONS_BUTTON
        }
      >
        <View style={styles.networkPermissionRequestInfoCard}>
          <Avatar
            style={styles.dataIcon}
            variant={AvatarVariant.Icon}
            name={IconName.Data}
            size={AvatarSize.Md}
            backgroundColor={colors.shadow.default}
            iconColor={colors.icon.alternative}
          />
          <View style={styles.networkPermissionRequestDetails}>
            <TextComponent variant={TextVariant.BodyMD}>
              {strings('permissions.use_enabled_networks')}
            </TextComponent>
            <View style={styles.permissionRequestNetworkInfo}>
              {(isNetworkSwitch || isNonDappNetworkSwitch) && (
                <>
                  <View style={styles.permissionRequestNetworkName}>
                    <TextComponent numberOfLines={1} ellipsizeMode="tail">
                      <TextComponent variant={TextVariant.BodySM}>
                        {strings('permissions.requesting_for')}
                      </TextComponent>
                      <TextComponent variant={TextVariant.BodySMMedium}>
                        {isNonDappNetworkSwitch
                          ? networkName || providerConfig.nickname
                          : chainName}
                      </TextComponent>
                    </TextComponent>
                  </View>
                  <Avatar
                    variant={AvatarVariant.Network}
                    size={AvatarSize.Xs}
                    name={
                      isNonDappNetworkSwitch
                        ? networkName || providerConfig.nickname
                        : chainName
                    }
                    imageSource={
                      isNonDappNetworkSwitch
                        ? getNetworkImageSource({
                            chainId,
                          })
                        : chainImage
                    }
                  />
                </>
              )}
              {!isNetworkSwitch && !isNonDappNetworkSwitch && (
                <>
                  <View style={styles.permissionRequestNetworkName}>
                    <TextComponent numberOfLines={1} ellipsizeMode="tail">
                      <TextComponent variant={TextVariant.BodySM}>
                        {getNetworkLabel()}
                      </TextComponent>
                    </TextComponent>
                  </View>
                  <View style={styles.avatarGroup}>
                    <AvatarGroup
                      avatarPropsList={networkAvatars.map((avatar) => ({
                        ...avatar,
                        variant: AvatarVariant.Network,
                      }))}
                    />
                  </View>
                </>
              )}
            </View>
          </View>
          {!isNetworkSwitch && !isNonDappNetworkSwitch && renderEndAccessory()}
        </View>
      </TouchableOpacity>
    );
  }

  const calculatedBottomSheetHeight = useMemo(() => {
    let currentBaseHeight = BOTTOM_SHEET_BASE_HEIGHT;
    if (isNonDappNetworkSwitch) {
      currentBaseHeight += 150;
    }

    if (accountAddresses.length <= 2) {
      return currentBaseHeight;
    }

    const visibleItems =
      accountAddresses.length >= MAX_VISIBLE_ITEMS
        ? MAX_VISIBLE_ITEMS
        : accountAddresses.length;
    const listHeight =
      currentBaseHeight + ACCOUNTS_CONNECTED_LIST_ITEM_HEIGHT * visibleItems;
    return listHeight * SCALE_FACTOR;
  }, [accountAddresses.length, isNonDappNetworkSwitch]);

  const onChangeTab = useCallback(
    (tabInfo: { i: number; ref: unknown }) => {
      setTabIndex?.(tabInfo.i);
      setBottomSheetHeight(calculatedBottomSheetHeight);
    },
    [setTabIndex, calculatedBottomSheetHeight],
  );

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

  const renderTabBar = useCallback(
    (props: Record<string, unknown>) => (
      <TabBar backgroundColor={colors.background.alternative} {...props} />
    ),
    [colors],
  );

  const filteredAccountAddresses = useMemo(
    () =>
      accountAddresses.filter((address) => {
        const { chainId: caipChainId } = parseCaipAccountId(address);
        return !NON_EVM_TESTNET_IDS.includes(caipChainId as CaipChainId);
      }),
    [accountAddresses],
  );
  const renderAccountsConnectedList = useCallback(
    (
      accountsConnectedTabKey: string,
      restAccountsConnectedTabProps: Record<string, unknown>,
    ) =>
      promptToCreateSolanaAccount ? (
        <AccountConnectCreateInitialAccount
          key={accountsConnectedTabKey}
          onCreateAccount={() => {
            onCreateAccount?.(WalletClientType.Solana, SolScope.Mainnet);
          }}
          {...restAccountsConnectedTabProps}
        />
      ) : (
        <AccountsConnectedList
          key={accountsConnectedTabKey}
          selectedAddresses={filteredAccountAddresses}
          ensByAccountAddress={ensByAccountAddress}
          accounts={accounts}
          privacyMode={privacyMode}
          networkAvatars={networkAvatars}
          handleEditAccountsButtonPress={handleEditAccountsButtonPress}
          {...restAccountsConnectedTabProps}
        />
      ),
    [
      ensByAccountAddress,
      privacyMode,
      networkAvatars,
      handleEditAccountsButtonPress,
      promptToCreateSolanaAccount,
      onCreateAccount,
      accounts,
      filteredAccountAddresses,
    ],
  );

  const renderTabsContent = () => {
    const { key: accountsConnectedTabKey, ...restAccountsConnectedTabProps } =
      accountsConnectedTabProps;
    const { key: permissionsTabKey, ...restPermissionsTabProps } =
      permissionsTabProps;
    return (
      <ScrollableTabView
        initialPage={tabIndex}
        renderTabBar={renderTabBar}
        onChangeTab={onChangeTab}
      >
        {renderAccountsConnectedList(
          accountsConnectedTabKey,
          restAccountsConnectedTabProps,
        )}
        <View
          key={permissionsTabKey}
          style={styles.permissionsManagementContainer}
          {...restPermissionsTabProps}
        >
          {!isNetworkSwitch && renderAccountPermissionsRequestInfoCard()}
          {renderNetworkPermissionsRequestInfoCard()}
        </View>
      </ScrollableTabView>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.mainContainer, { minHeight: bottomSheetHeight }]}>
        <View style={styles.contentContainer}>
          {renderHeader()}
          <View
            style={styles.title}
            testID={
              PermissionSummaryBottomSheetSelectorsIDs.NETWORK_PERMISSIONS_CONTAINER
            }
          >
            <TextComponent
              style={styles.connectionTitle}
              variant={TextVariant.HeadingMD}
            >
              {isNonDappNetworkSwitch
                ? strings('permissions.title_add_network_permission')
                : !isAlreadyConnected || isNetworkSwitch
                  ? hostname
                  : strings('permissions.title_dapp_url_has_approval_to', {
                      dappUrl: hostname,
                    })}
            </TextComponent>
            <TextComponent variant={TextVariant.BodyMD}>
              {strings('account_dapp_connections.account_summary_header')}
            </TextComponent>
          </View>
          {isNonDappNetworkSwitch && (
            <TextComponent
              variant={TextVariant.BodyMD}
              style={styles.description}
            >
              {strings('permissions.non_permitted_network_description')}
            </TextComponent>
          )}
          {!nonTabView ? (
            <View style={styles.tabsContainer}>{renderTabsContent()}</View>
          ) : (
            <View style={styles.container}>
              {showAccountsOnly && renderAccountPermissionsRequestInfoCard()}
              {showPermissionsOnly && renderNetworkPermissionsRequestInfoCard()}
            </View>
          )}
        </View>
        <View style={styles.bottomButtonsContainer}>
          {isAlreadyConnected && isDisconnectAllShown && (
            <View style={styles.disconnectAllContainer}>
              <Button
                variant={ButtonVariants.Secondary}
                testID={
                  ConnectedAccountsSelectorsIDs.DISCONNECT_ALL_ACCOUNTS_NETWORKS
                }
                label={strings('accounts.disconnect_all')}
                onPress={toggleRevokeAllPermissionsModal}
                startIconName={IconName.Logout}
                isDanger
                size={ButtonSize.Lg}
                style={{
                  ...styles.disconnectButton,
                }}
              />
            </View>
          )}
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
                disabled={
                  !isNetworkSwitch &&
                  (accountAddresses.length === 0 || networkAvatars.length === 0)
                }
                containerStyle={[
                  styles.buttonPositioning,
                  styles.confirmButton,
                ]}
                testID={CommonSelectorsIDs.CONNECT_BUTTON}
              >
                {isNetworkSwitch
                  ? strings('confirmation_modal.confirm_cta')
                  : strings('accounts.connect')}
              </StyledButton>
            </View>
          )}
          {isNonDappNetworkSwitch && (
            <View style={styles.nonDappNetworkSwitchButtons}>
              <View style={styles.actionButtonsContainer}>
                <Button
                  variant={ButtonVariants.Primary}
                  label={strings('permissions.add_this_network')}
                  testID={
                    NetworkNonPemittedBottomSheetSelectorsIDs.ADD_THIS_NETWORK_BUTTON
                  }
                  onPress={onAddNetwork}
                  size={ButtonSize.Lg}
                  style={{
                    ...styles.disconnectButton,
                  }}
                />
              </View>
              <View style={styles.actionButtonsContainer}>
                <Button
                  variant={ButtonVariants.Secondary}
                  label={strings('permissions.choose_from_permitted_networks')}
                  testID={
                    NetworkNonPemittedBottomSheetSelectorsIDs.CHOOSE_FROM_PERMITTED_NETWORKS_BUTTON
                  }
                  onPress={onChooseFromPermittedNetworks}
                  size={ButtonSize.Lg}
                  style={{
                    ...styles.disconnectButton,
                  }}
                />
              </View>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default PermissionsSummary;
