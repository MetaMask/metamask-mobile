import React from 'react';
import StyledButton from '../StyledButton';
import { View } from 'react-native';
import { strings } from '../../../../locales/i18n';
import Text from '../../Base/Text';
import { useTheme } from '../../../util/theme';
import { CommonSelectorsIDs } from '../../../../e2e/selectors/Common.selectors';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../component-library/components/Avatars/Avatar';
import { IconName } from '../../../component-library/components/Icons/Icon';
import TextComponent, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import AvatarGroup from '../../../component-library/components/Avatars/AvatarGroup';
import { SAMPLE_AVATARGROUP_PROPS } from '../../../component-library/components/Avatars/AvatarGroup/AvatarGroup.constants';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import { getHost } from '../../../util/browser';
import WebsiteIcon from '../WebsiteIcon';
import useSelectedAccount from '../Tabs/TabThumbnail/useSelectedAccount';
import styleSheet from './PermissionsSummary.styles';
import { useStyles } from '../../../component-library/hooks';

interface PermissionsSummaryProps {
  currentPageInformation: {
    currentEnsName: string;
    icon: string | { uri: string };
    url: string;
  };
  onConfirm?: () => void;
  onCancel?: () => void;
  customNetworkInformation: {
    chainName: string;
  };
}

const PermissionsSummary = ({
  customNetworkInformation,
  currentPageInformation,
  onCancel,
  onConfirm,
}: PermissionsSummaryProps) => {
  const { colors } = useTheme();
  const { styles } = useStyles(styleSheet, {});
  const selectedAccount = useSelectedAccount();

  const confirm = () => {
    onConfirm?.();
  };

  const cancel = () => {
    onCancel?.();
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

  const handleEditButtonPress = () => {
    /* eslint-disable-next-line no-console */
    console.log('press clicked, add navigation here soon');
  };

  function renderAccountPermissionsRequestInfoCard() {
    return (
      <View style={styles.accountPermissionRequestInfoCard}>
        <Avatar
          variant={AvatarVariant.Icon}
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
            <TextComponent>
              <TextComponent variant={TextVariant.BodySM}>
                {strings('permissions.requesting_for')}
              </TextComponent>
              <TextComponent variant={TextVariant.BodySMMedium}>
                {customNetworkInformation.chainName}
              </TextComponent>
            </TextComponent>
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
        <View>
          <Button
            onPress={handleEditButtonPress}
            variant={ButtonVariants.Link}
            width={ButtonWidthTypes.Full}
            label={strings('permissions.edit')}
            size={ButtonSize.Lg}
          />
        </View>
      </View>
    );
  }

  function renderNetworkPermissionsRequestInfoCard() {
    return (
      <View style={styles.networkPermissionRequestInfoCard}>
        <Avatar
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
            <TextComponent>
              <TextComponent variant={TextVariant.BodySM}>
                {strings('permissions.requesting_for')}
              </TextComponent>
              <TextComponent variant={TextVariant.BodySMMedium}>
                {customNetworkInformation.chainName}
              </TextComponent>
            </TextComponent>
            <View style={styles.avatarGroup}>
              <AvatarGroup
                avatarPropsList={SAMPLE_AVATARGROUP_PROPS.avatarPropsList}
              />
            </View>
          </View>
        </View>
        <View>
          <Button
            onPress={handleEditButtonPress}
            variant={ButtonVariants.Link}
            width={ButtonWidthTypes.Full}
            label={strings('permissions.edit')}
            size={ButtonSize.Lg}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <View style={styles.permissionsSummaryHeader}>{renderTopIcon()}</View>
      <Text bold centered primary noMargin style={styles.title}>
        {strings('permissions.title_this_site_wants_to')}
      </Text>
      {renderAccountPermissionsRequestInfoCard()}
      {renderNetworkPermissionsRequestInfoCard()}
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
          containerStyle={[styles.buttonPositioning, styles.confirmButton]}
          testID={CommonSelectorsIDs.CONNECT_BUTTON}
        >
          {strings('confirmation_modal.confirm_cta')}
        </StyledButton>
      </View>
    </View>
  );
};

export default PermissionsSummary;
