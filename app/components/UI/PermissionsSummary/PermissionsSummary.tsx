import React, { useCallback } from 'react';
import StyledButton from '../StyledButton';
import { SafeAreaView, TouchableOpacity, View } from 'react-native';
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
import { SAMPLE_AVATARGROUP_PROPS } from '../../../component-library/components/Avatars/AvatarGroup/AvatarGroup.constants';
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
import { useSelector } from 'react-redux';
import { selectNetworkName } from '../../../selectors/networkInfos';
import { USER_INTENT } from '../../../constants/permissions';
import Routes from '../../../constants/navigation/Routes';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../component-library/components/Buttons/ButtonIcon';

const PermissionsSummary = ({
  currentPageInformation,
  onEdit,
  onEditNetworks,
  onBack,
  onUserAction,
  showActionButtons = true,
  isAlreadyConnected = true,
  isRenderedAsBottomSheet = true,
}: PermissionsSummaryProps) => {
  const { colors } = useTheme();
  const { styles } = useStyles(styleSheet, { isRenderedAsBottomSheet });
  const { navigate } = useNavigation();
  const selectedAccount = useSelectedAccount();
  const networkName = useSelector(selectNetworkName);

  const confirm = () => {
    onUserAction?.(USER_INTENT.Confirm);
  };

  const cancel = () => {
    onUserAction?.(USER_INTENT.Cancel);
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
        <View style={styles.endAccessory}></View>
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

  const toggleRevokeAllPermissionsModal = useCallback(() => {
    navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.REVOKE_ALL_ACCOUNT_PERMISSIONS,
      params: {
        hostInfo: {
          metadata: {
            origin:
              currentPageInformation?.url &&
              new URL(currentPageInformation?.url).hostname,
          },
        },
      },
    });
  }, [navigate, currentPageInformation?.url]);

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
              {strings('permissions.wants_to_see_your_accounts')}
            </TextComponent>
            <View style={styles.permissionRequestAccountInfo}>
              <View style={styles.permissionRequestAccountName}>
                <TextComponent numberOfLines={1} ellipsizeMode="tail">
                  <TextComponent variant={TextVariant.BodySM}>
                    {strings('permissions.requesting_for')}
                  </TextComponent>
                  <TextComponent variant={TextVariant.BodySMMedium}>
                    {`${
                      selectedAccount?.name ??
                      strings('browser.undefined_account')
                    }`}
                  </TextComponent>
                </TextComponent>
              </View>
              {selectedAccount?.address && (
                <View style={styles.avatarGroup}>
                  <Avatar
                    size={AvatarSize.Xs}
                    variant={AvatarVariant.Account}
                    accountAddress={selectedAccount?.address}
                  />
                </View>
              )}
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
              <View style={styles.permissionRequestNetworkName}>
                <TextComponent numberOfLines={1} ellipsizeMode="tail">
                  <TextComponent variant={TextVariant.BodySM}>
                    {strings('permissions.requesting_for')}
                  </TextComponent>
                  <TextComponent variant={TextVariant.BodySMMedium}>
                    {networkName}
                  </TextComponent>
                </TextComponent>
              </View>
              <View style={styles.avatarGroup}>
                <AvatarGroup
                  avatarPropsList={SAMPLE_AVATARGROUP_PROPS.avatarPropsList}
                />
              </View>
            </View>
          </View>
          {renderEndAccessory()}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView>
      <View style={styles.mainContainer}>
        <View>
          {renderHeader()}
          <View style={styles.title}>
            <TextComponent variant={TextVariant.HeadingSM}>
              {!isAlreadyConnected
                ? strings('permissions.title_dapp_url_wants_to', {
                    dappUrl: new URL(currentPageInformation.url).hostname,
                  })
                : strings('permissions.title_dapp_url_has_approval_to', {
                    dappUrl: new URL(currentPageInformation.url).hostname,
                  })}
            </TextComponent>
          </View>
          {renderAccountPermissionsRequestInfoCard()}
          {renderNetworkPermissionsRequestInfoCard()}
        </View>
        <View>
          {isAlreadyConnected && (
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
                {strings('confirmation_modal.confirm_cta')}
              </StyledButton>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default PermissionsSummary;
