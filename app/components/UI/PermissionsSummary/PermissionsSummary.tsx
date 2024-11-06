import React, { useCallback } from 'react';
import StyledButton from '../StyledButton';
import {
  ImageSourcePropType,
  SafeAreaView,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../locales/i18n';
import { useTheme } from '../../../util/theme';
import { CommonSelectorsIDs } from '../../../../e2e/selectors/Common.selectors';
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
import useSelectedAccount from '../Tabs/TabThumbnail/useSelectedAccount';
import styleSheet from './PermissionsSummary.styles';
import { useStyles } from '../../../component-library/hooks';
import { PermissionsSummaryProps } from './PermissionsSummary.types';
import { USER_INTENT } from '../../../constants/permissions';
import Routes from '../../../constants/navigation/Routes';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../component-library/components/Buttons/ButtonIcon';
import { getNetworkImageSource } from '../../../util/networks';
import Engine from '../../../core/Engine';
import { SDKSelectorsIDs } from '../../../../e2e/selectors/Settings/SDK.selectors';

const PermissionsSummary = ({
  currentPageInformation,
  customNetworkInformation,
  onEdit,
  onEditNetworks,
  onBack,
  onCancel,
  onConfirm,
  onUserAction,
  showActionButtons = true,
  isAlreadyConnected = true,
  isRenderedAsBottomSheet = true,
  isDisconnectAllShown = true,
  isNetworkSwitch = false,
  accountAddresses = [],
  accounts = [],
  networkAvatars = [],
}: PermissionsSummaryProps) => {
  const { colors } = useTheme();
  const { styles } = useStyles(styleSheet, { isRenderedAsBottomSheet });
  const { navigate } = useNavigation();
  const selectedAccount = useSelectedAccount();

  const hostname = new URL(currentPageInformation.url).hostname;

  // if network switch, we get the chain name from the customNetworkInformation
  let chainName = '';
  let chainImage: ImageSourcePropType;
  if (isNetworkSwitch && customNetworkInformation?.chainId) {
    chainName = customNetworkInformation?.chainName;
    // @ts-expect-error getNetworkImageSource is not implemented in typescript
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

  const handleEditAccountsButtonPress = () => {
    onEdit?.();
  };

  const handleEditNetworksButtonPress = () => {
    onEditNetworks?.();
  };

  const renderTopIcon = () => {
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
  };

  function renderHeader() {
    return (
      <View style={styles.header}>
        <View style={styles.startAccessory}>
          {onBack && (
            <ButtonIcon
              size={ButtonIconSizes.Sm}
              iconColor={IconColor.Default}
              onPress={onBack}
              iconName={IconName.ArrowLeft}
            />
          )}
        </View>

        <View style={styles.logoContainer}>{renderTopIcon()}</View>
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
                          new URL(currentPageInformation?.url).hostname,
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
    <View>
      {isAlreadyConnected ? (
        <Icon
          size={IconSize.Md}
          name={IconName.ArrowRight}
          testID={CommonSelectorsIDs.BACK_ARROW_BUTTON}
        />
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
  }, [navigate, isRenderedAsBottomSheet, onRevokeAllHandler, hostname]);

  const getAccountLabel = useCallback(() => {
    if (isAlreadyConnected) {
      if (accountAddresses.length === 0 && selectedAccount) {
        return `${strings('permissions.connected_to')} ${selectedAccount.name}`;
      }
      if (accountAddresses.length === 1) {
        const matchedConnectedAccount = accounts.find(
          (account) => account.address === accountAddresses[0],
        );
        return matchedConnectedAccount?.name;
      }

      return `${accountAddresses.length} ${strings(
        'accounts.accounts_connected',
      )}`;
    }

    if (accountAddresses.length === 1 && accounts?.length >= 1) {
      const matchedAccount = accounts.find(
        (account) => account.address === accountAddresses[0],
      );
      return `${strings('permissions.requesting_for')}${
        matchedAccount?.name ? matchedAccount.name : accountAddresses[0]
      }`;
    }

    if (accountAddresses.length === 0 && selectedAccount) {
      return `${strings('permissions.requesting_for')}${selectedAccount?.name}`;
    }

    return strings('permissions.requesting_for_accounts', {
      numberOfAccounts: accountAddresses.length,
    });
  }, [accountAddresses, isAlreadyConnected, selectedAccount, accounts]);

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
      <TouchableOpacity onPress={handleEditAccountsButtonPress}>
        <View style={styles.accountPermissionRequestInfoCard}>
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
                <TextComponent numberOfLines={1} ellipsizeMode="tail">
                  <TextComponent variant={TextVariant.BodySM}>
                    {getAccountLabel()}
                  </TextComponent>
                </TextComponent>
              </View>
              <View style={styles.avatarGroup}>
                {accountAddresses.length > 0 ? (
                  <AvatarGroup
                    avatarPropsList={accountAddresses.map((address) => ({
                      variant: AvatarVariant.Account,
                      accountAddress: address,
                      size: AvatarSize.Xs,
                    }))}
                  />
                ) : (
                  selectedAccount?.address && (
                    <Avatar
                      size={AvatarSize.Xs}
                      variant={AvatarVariant.Account}
                      accountAddress={selectedAccount.address}
                    />
                  )
                )}
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
      <TouchableOpacity onPress={handleEditNetworksButtonPress}>
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
              {isNetworkSwitch && (
                <>
                  <View style={styles.permissionRequestNetworkName}>
                    <TextComponent numberOfLines={1} ellipsizeMode="tail">
                      <TextComponent variant={TextVariant.BodySM}>
                        {strings('permissions.requesting_for')}
                      </TextComponent>
                      <TextComponent variant={TextVariant.BodySMMedium}>
                        {chainName}
                      </TextComponent>
                    </TextComponent>
                  </View>
                  <Avatar
                    variant={AvatarVariant.Network}
                    size={AvatarSize.Xs}
                    name={chainName}
                    imageSource={chainImage}
                  />
                </>
              )}
              {!isNetworkSwitch && (
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
                      // @ts-expect-error - AvatarGroup is not typed
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
          {!isNetworkSwitch && renderEndAccessory()}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.mainContainer}>
        <View>
          {renderHeader()}
          <View style={styles.title}>
            <TextComponent variant={TextVariant.HeadingSM}>
              {!isAlreadyConnected || isNetworkSwitch
                ? strings('permissions.title_dapp_url_wants_to', {
                    dappUrl: hostname,
                  })
                : strings('permissions.title_dapp_url_has_approval_to', {
                    dappUrl: hostname,
                  })}
            </TextComponent>
          </View>
          {/*TODO These should be conditional upon which permissions are being requested*/}
          {!isNetworkSwitch && renderAccountPermissionsRequestInfoCard()}
          {renderNetworkPermissionsRequestInfoCard()}
        </View>
        <View>
          {isAlreadyConnected && isDisconnectAllShown && (
            <View style={styles.disconnectAllContainer}>
              <Button
                variant={ButtonVariants.Secondary}
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
          {showActionButtons && (
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
                containerStyle={[
                  styles.buttonPositioning,
                  styles.confirmButton,
                ]}
                testID={CommonSelectorsIDs.CONNECT_BUTTON}
              >
                {strings('accounts.connect')}
              </StyledButton>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default PermissionsSummary;
