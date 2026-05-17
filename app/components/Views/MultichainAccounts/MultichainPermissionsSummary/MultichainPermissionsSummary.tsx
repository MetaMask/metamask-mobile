import React, { useCallback, useMemo } from 'react';
import { ImageSourcePropType, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScrollableTabView from '@tommasini/react-native-scrollable-tab-view';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import { CommonSelectorsIDs } from '../../../../util/Common.testIds';
import {
  AvatarAccountSize,
  AvatarAccountVariant,
  AvatarFavicon,
  AvatarFaviconSize,
  AvatarGroup,
  AvatarGroupSize,
  AvatarGroupVariant,
  AvatarIcon,
  AvatarIconSize,
  AvatarNetwork,
  type AvatarNetworkProps as DesignSystemAvatarNetworkProps,
  AvatarNetworkSize,
  AvatarToken,
  AvatarTokenSize,
  BadgeNetwork,
  BadgeWrapper,
  Button,
  ButtonBaseSize,
  ButtonIcon,
  ButtonIconSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text as TextComponent,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { getHost } from '../../../../util/browser';
import WebsiteIcon from '../../../UI/WebsiteIcon';
import styleSheet from './MultichainPermissionsSummary.styles';
import { useStyles } from '../../../../component-library/hooks';
import {
  MaliciousDappUrlIcon,
  getConnectButtonContent,
} from '../../../UI/PermissionsSummary/MaliciousDappIndicators';
import Routes from '../../../../constants/navigation/Routes';
import TabBar from '../../../../component-library/components-temp/TabBar';
import { getNetworkImageSource } from '../../../../util/networks';
import Engine from '../../../../core/Engine';
import { SDKSelectorsIDs } from '../../SDK/SDK.testIds';
import { useSelector } from 'react-redux';
import {
  selectEvmChainId,
  selectProviderConfig,
} from '../../../../selectors/networkController';
import { useNetworkInfo } from '../../../../selectors/selectedNetworkController';
import { ConnectedAccountsSelectorsIDs } from '../../AccountConnect/ConnectedAccountModal.testIds';
import { PermissionSummaryBottomSheetSelectorsIDs } from '../../AccountConnect/PermissionSummaryBottomSheet.testIds';
import { NetworkNonPemittedBottomSheetSelectorsIDs } from '../../NetworkConnect/NetworkNonPemittedBottomSheet.testIds';
import { selectPrivacyMode } from '../../../../selectors/preferencesController';
import { endTrace, trace, TraceName } from '../../../../util/trace';
import MultichainAccountsConnectedList from '../MultichainAccountsConnectedList/MultichainAccountsConnectedList';
import { AccountGroupId } from '@metamask/account-api';
import { selectAccountGroups } from '../../../../selectors/multichainAccounts/accountTreeController';
import { AccountGroupObject } from '@metamask/account-tree-controller';
import { selectIconSeedAddressesByAccountGroupIds } from '../../../../selectors/multichainAccounts/accounts';
import { RootState } from '../../../../reducers';
import type { CaipChainId } from '@metamask/utils';

type AvatarNetworkSource = DesignSystemAvatarNetworkProps['src'];

export interface MultichainPermissionsSummaryNetworkAvatar {
  name: string;
  imageSource: ImageSourcePropType;
  caipChainId: CaipChainId;
}

const getAvatarNetworkSource = (
  imageSource: ImageSourcePropType,
): AvatarNetworkSource => imageSource as AvatarNetworkSource;

export interface MultichainPermissionsSummaryProps {
  currentPageInformation: {
    currentEnsName: string;
    icon: string | { uri: string };
    url: string;
  };
  onEdit?: () => void;
  onEditNetworks?: () => void;
  onBack?: () => void;
  onCancel?: () => void;
  onConfirm?: () => void;
  onRevokeAll?: () => void;
  onAddNetwork?: () => void;
  showActionButtons?: boolean;
  isAlreadyConnected?: boolean;
  isDisconnectAllShown?: boolean;
  isNetworkSwitch?: boolean;
  customNetworkInformation?: {
    chainName: string;
    chainId: string;
  };
  selectedAccountGroupIds: AccountGroupId[];
  networkAvatars?: MultichainPermissionsSummaryNetworkAvatar[];
  isNonDappNetworkSwitch?: boolean;
  onChooseFromPermittedNetworks?: () => void;
  setTabIndex?: (tabIndex: number) => void;
  tabIndex?: number;
  showPermissionsOnly?: boolean;
  showAccountsOnly?: boolean;
  isMaliciousDapp?: boolean;
}

const MultichainPermissionsSummary = ({
  currentPageInformation,
  customNetworkInformation,
  onEdit,
  onEditNetworks,
  onBack,
  onCancel,
  onConfirm,
  onRevokeAll,
  showActionButtons = true,
  isAlreadyConnected = true,
  isDisconnectAllShown = true,
  isNetworkSwitch = false,
  isNonDappNetworkSwitch = false,
  selectedAccountGroupIds = [],
  networkAvatars = [],
  onAddNetwork = () => undefined,
  onChooseFromPermittedNetworks = () => undefined,
  setTabIndex = () => undefined,
  tabIndex = 0,
  showAccountsOnly = false,
  showPermissionsOnly = false,
  isMaliciousDapp = false,
}: MultichainPermissionsSummaryProps) => {
  const nonTabView = showAccountsOnly || showPermissionsOnly;
  const { colors } = useTheme();
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const { navigate } = navigation;
  const providerConfig = useSelector(selectProviderConfig);
  const chainId = useSelector(selectEvmChainId);
  const privacyMode = useSelector(selectPrivacyMode);
  const accountGroups = useSelector(selectAccountGroups);

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
    onConfirm?.();
  };

  const cancel = () => {
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
            badge={
              <BadgeNetwork
                name={networkName}
                src={getAvatarNetworkSource(networkImageSource)}
              />
            }
          >
            {icon ? (
              <AvatarFavicon
                src={{
                  uri: typeof icon === 'string' ? icon : icon?.uri,
                }}
                size={AvatarFaviconSize.Md}
              />
            ) : (
              <AvatarToken name={iconTitle} size={AvatarTokenSize.Md} />
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
              iconProps={{ color: IconColor.IconDefault }}
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
          <ButtonIcon
            size={ButtonIconSize.Sm}
            iconName={IconName.Info}
            iconProps={{ color: IconColor.IconDefault }}
            onPress={() => {
              navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
                screen: Routes.SHEET.CONNECTION_DETAILS,
                params: {
                  hostInfo: {
                    metadata: {
                      origin: hostname,
                    },
                  },
                  connectionDateTime: new Date().getTime(),
                },
              });
            }}
            testID={SDKSelectorsIDs.CONNECTION_DETAILS_BUTTON}
          />
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
            color={TextColor.PrimaryDefault}
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
          >
            {strings('permissions.edit')}
          </TextComponent>
        </View>
      )}
    </View>
  );

  const onRevokeAllHandler = useCallback(async () => {
    if (onRevokeAll) {
      // Use custom revoke handler if provided
      await onRevokeAll();
    } else {
      // Fall back to default behavior
      await Engine.context.PermissionController.hasPermissions(hostname);
      await Engine.context.PermissionController.revokeAllPermissions(hostname);
      navigation.navigate(Routes.BROWSER.HOME);
    }
  }, [onRevokeAll, hostname, navigation]);

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
        onRevokeAll: onRevokeAllHandler,
      },
    });
    endTrace({ name: TraceName.DisconnectAllAccountPermissions });
  }, [onRevokeAllHandler, hostname, navigate]);

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

  const selectedAccountGroups = useMemo(
    () =>
      accountGroups.filter((accountGroup) =>
        selectedAccountGroupIds.includes(accountGroup.id),
      ),
    [accountGroups, selectedAccountGroupIds],
  );

  const iconSeedAddresses = useSelector((state: RootState) =>
    selectIconSeedAddressesByAccountGroupIds(state, selectedAccountGroupIds),
  );

  const renderAccountAvatar = useCallback(
    (accountGroup: AccountGroupObject) => ({
      address: iconSeedAddresses[accountGroup.id] ?? accountGroup.id,
      variant: AvatarAccountVariant.Maskicon,
    }),
    [iconSeedAddresses],
  );

  function renderAccountPermissionsRequestInfoCard() {
    return (
      <TouchableOpacity
        onPress={handleEditAccountsButtonPress}
        style={styles.accountPermissionRequestInfoCard}
        testID={PermissionSummaryBottomSheetSelectorsIDs.CONTAINER}
      >
        <AvatarIcon
          iconName={IconName.Wallet}
          size={AvatarIconSize.Md}
          style={[
            styles.walletIcon,
            { backgroundColor: colors.shadow.default },
          ]}
          iconProps={{ color: IconColor.IconAlternative }}
        />
        <View style={styles.accountPermissionRequestDetails}>
          <TextComponent variant={TextVariant.BodyMd}>
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
                <TextComponent variant={TextVariant.BodySm}>
                  {strings('permissions.requesting_for')}
                </TextComponent>
              </TextComponent>
            </View>
            <View style={styles.avatarGroup}>
              <AvatarGroup
                avatarPropsArr={selectedAccountGroups.map((accountGroup) =>
                  renderAccountAvatar(accountGroup),
                )}
                size={AvatarGroupSize.Xs}
                variant={AvatarGroupVariant.Account}
              />
            </View>
          </View>
        </View>
        {renderEndAccessory()}
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
          <AvatarIcon
            style={[
              styles.dataIcon,
              { backgroundColor: colors.shadow.default },
            ]}
            iconName={IconName.Data}
            size={AvatarIconSize.Md}
            iconProps={{ color: IconColor.IconAlternative }}
          />
          <View style={styles.networkPermissionRequestDetails}>
            <TextComponent variant={TextVariant.BodyMd}>
              {strings('permissions.use_enabled_networks')}
            </TextComponent>
            <View style={styles.permissionRequestNetworkInfo}>
              {(isNetworkSwitch || isNonDappNetworkSwitch) && (
                <>
                  <View style={styles.permissionRequestNetworkName}>
                    <TextComponent numberOfLines={1} ellipsizeMode="tail">
                      <TextComponent variant={TextVariant.BodySm}>
                        {strings('permissions.requesting_for')}
                      </TextComponent>
                      <TextComponent
                        variant={TextVariant.BodySm}
                        fontWeight={FontWeight.Medium}
                      >
                        {isNonDappNetworkSwitch
                          ? networkName || providerConfig.nickname
                          : chainName}
                      </TextComponent>
                    </TextComponent>
                  </View>
                  <AvatarNetwork
                    size={AvatarNetworkSize.Xs}
                    name={
                      isNonDappNetworkSwitch
                        ? networkName || providerConfig.nickname
                        : chainName
                    }
                    src={getAvatarNetworkSource(
                      isNonDappNetworkSwitch
                        ? getNetworkImageSource({ chainId })
                        : chainImage,
                    )}
                  />
                </>
              )}
              {!isNetworkSwitch && !isNonDappNetworkSwitch && (
                <>
                  <View style={styles.permissionRequestNetworkName}>
                    <TextComponent numberOfLines={1} ellipsizeMode="tail">
                      <TextComponent variant={TextVariant.BodySm}>
                        {getNetworkLabel()}
                      </TextComponent>
                    </TextComponent>
                  </View>
                  <View style={styles.avatarGroup}>
                    <AvatarGroup
                      avatarPropsArr={networkAvatars.map((avatar) => ({
                        name: avatar.name,
                        src: getAvatarNetworkSource(avatar.imageSource),
                      }))}
                      size={AvatarGroupSize.Xs}
                      variant={AvatarGroupVariant.Network}
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

  const onChangeTab = useCallback(
    (tabInfo: { i: number; ref: unknown }) => {
      setTabIndex?.(tabInfo.i);
    },
    [setTabIndex],
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
      <TabBar backgroundColor={colors.background.default} {...props} />
    ),
    [colors],
  );

  const renderAccountsConnectedList = useCallback(
    (
      accountsConnectedTabKey: string,
      restAccountsConnectedTabProps: Record<string, unknown>,
    ) => (
      <MultichainAccountsConnectedList
        key={accountsConnectedTabKey}
        privacyMode={privacyMode}
        selectedAccountGroups={selectedAccountGroups}
        handleEditAccountsButtonPress={handleEditAccountsButtonPress}
        isConnectionFlow={!isAlreadyConnected}
        {...restAccountsConnectedTabProps}
      />
    ),
    [
      privacyMode,
      selectedAccountGroups,
      handleEditAccountsButtonPress,
      isAlreadyConnected,
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
      <View style={styles.mainContainer}>
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
              variant={TextVariant.HeadingMd}
              color={
                isMaliciousDapp && !isAlreadyConnected
                  ? TextColor.ErrorDefault
                  : undefined
              }
            >
              {isNonDappNetworkSwitch
                ? strings('permissions.title_add_network_permission')
                : !isAlreadyConnected || isNetworkSwitch
                  ? hostname
                  : strings('permissions.title_dapp_url_has_approval_to', {
                      dappUrl: hostname,
                    })}
            </TextComponent>
            {isMaliciousDapp && !isAlreadyConnected && <MaliciousDappUrlIcon />}
            <TextComponent variant={TextVariant.BodyMd}>
              {strings('account_dapp_connections.account_summary_header')}
            </TextComponent>
          </View>
          {isNonDappNetworkSwitch && (
            <TextComponent
              variant={TextVariant.BodyMd}
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
                variant={ButtonVariant.Secondary}
                testID={
                  ConnectedAccountsSelectorsIDs.DISCONNECT_ALL_ACCOUNTS_NETWORKS
                }
                onPress={toggleRevokeAllPermissionsModal}
                startIconName={IconName.Logout}
                isDanger
                size={ButtonBaseSize.Lg}
                style={{
                  ...styles.disconnectButton,
                }}
              >
                {strings('accounts.disconnect_all')}
              </Button>
            </View>
          )}
          {showActionButtons && !isNonDappNetworkSwitch && (
            <View style={styles.actionButtonsContainer}>
              <View style={[styles.buttonPositioning, styles.cancelButton]}>
                <Button
                  variant={ButtonVariant.Secondary}
                  onPress={cancel}
                  testID={CommonSelectorsIDs.CANCEL_BUTTON}
                  size={ButtonBaseSize.Lg}
                  isFullWidth
                >
                  {strings('permissions.cancel')}
                </Button>
              </View>
              <View style={[styles.buttonPositioning, styles.confirmButton]}>
                <Button
                  variant={ButtonVariant.Primary}
                  onPress={confirm}
                  isDisabled={
                    !isNetworkSwitch &&
                    (selectedAccountGroupIds.length === 0 ||
                      networkAvatars.length === 0)
                  }
                  testID={CommonSelectorsIDs.CONNECT_BUTTON}
                  isDanger={isMaliciousDapp}
                  size={ButtonBaseSize.Lg}
                  isFullWidth
                >
                  {getConnectButtonContent(isMaliciousDapp, isNetworkSwitch)}
                </Button>
              </View>
            </View>
          )}
          {isNonDappNetworkSwitch && (
            <View style={styles.nonDappNetworkSwitchButtons}>
              <View style={styles.actionButtonsContainer}>
                <Button
                  variant={ButtonVariant.Primary}
                  testID={
                    NetworkNonPemittedBottomSheetSelectorsIDs.ADD_THIS_NETWORK_BUTTON
                  }
                  onPress={onAddNetwork}
                  size={ButtonBaseSize.Lg}
                  style={{
                    ...styles.disconnectButton,
                  }}
                >
                  {strings('permissions.add_this_network')}
                </Button>
              </View>
              <View style={styles.actionButtonsContainer}>
                <Button
                  variant={ButtonVariant.Secondary}
                  testID={
                    NetworkNonPemittedBottomSheetSelectorsIDs.CHOOSE_FROM_PERMITTED_NETWORKS_BUTTON
                  }
                  onPress={onChooseFromPermittedNetworks}
                  size={ButtonBaseSize.Lg}
                  style={{
                    ...styles.disconnectButton,
                  }}
                >
                  {strings('permissions.choose_from_permitted_networks')}
                </Button>
              </View>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default MultichainPermissionsSummary;
