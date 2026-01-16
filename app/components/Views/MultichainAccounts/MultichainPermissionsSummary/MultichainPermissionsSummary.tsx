import React, { useCallback, useMemo } from 'react';
import { ImageSourcePropType, SafeAreaView, View } from 'react-native';
import TouchableOpacity from '../../../Base/TouchableOpacity';
import ScrollableTabView from '@tommasini/react-native-scrollable-tab-view';
import { useNavigation } from '@react-navigation/native';
import StyledButton from '../../../UI/StyledButton';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import { CommonSelectorsIDs } from '../../../../util/Common.testIds';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../component-library/components/Avatars/Avatar';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import TextComponent, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import AvatarGroup from '../../../../component-library/components/Avatars/AvatarGroup';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import { getHost } from '../../../../util/browser';
import WebsiteIcon from '../../../UI/WebsiteIcon';
import styleSheet from './MultichainPermissionsSummary.styles';
import { useStyles } from '../../../../component-library/hooks';
import Routes from '../../../../constants/navigation/Routes';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../component-library/components/Buttons/ButtonIcon';
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
import BadgeWrapper from '../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../component-library/components/Badges/Badge';
import AvatarFavicon from '../../../../component-library/components/Avatars/Avatar/variants/AvatarFavicon';
import AvatarToken from '../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { endTrace, trace, TraceName } from '../../../../util/trace';
import { NetworkAvatarProps } from '../../AccountConnect/AccountConnect.types';
import MultichainAccountsConnectedList from '../MultichainAccountsConnectedList/MultichainAccountsConnectedList';
import { AccountGroupId } from '@metamask/account-api';
import { selectAccountGroups } from '../../../../selectors/multichainAccounts/accountTreeController';
import { AccountGroupObject } from '@metamask/account-tree-controller';
import { selectIconSeedAddressesByAccountGroupIds } from '../../../../selectors/multichainAccounts/accounts';
import { RootState } from '../../../../reducers';

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
  networkAvatars?: NetworkAvatarProps[];
  isNonDappNetworkSwitch?: boolean;
  onChooseFromPermittedNetworks?: () => void;
  setTabIndex?: (tabIndex: number) => void;
  tabIndex?: number;
  showPermissionsOnly?: boolean;
  showAccountsOnly?: boolean;
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
      variant: AvatarVariant.Account as const,
      accountAddress: iconSeedAddresses[accountGroup.id] ?? accountGroup.id,
      size: AvatarSize.Xs,
    }),
    [iconSeedAddresses],
  );

  function renderAccountPermissionsRequestInfoCard() {
    return (
      <TouchableOpacity onPress={handleEditAccountsButtonPress}>
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
                    {strings('permissions.requesting_for')}
                  </TextComponent>
                </TextComponent>
              </View>
              <View style={styles.avatarGroup}>
                <AvatarGroup
                  avatarPropsList={selectedAccountGroups.map((accountGroup) =>
                    renderAccountAvatar(accountGroup),
                  )}
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
                  (selectedAccountGroupIds.length === 0 ||
                    networkAvatars.length === 0)
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

export default MultichainPermissionsSummary;
