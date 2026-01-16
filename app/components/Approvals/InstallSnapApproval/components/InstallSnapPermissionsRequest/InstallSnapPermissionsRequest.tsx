///: BEGIN:ONLY_INCLUDE_IF(external-snaps)
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import styleSheet from '../../InstallSnapApproval.styles';
import { strings } from '../../../../../../locales/i18n';
import SheetHeader from '../../../../../component-library/components/Sheet/SheetHeader';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import Cell, {
  CellVariant,
} from '../../../../../component-library/components/Cells/Cell';
import { AvatarVariant } from '../../../../../component-library/components/Avatars/Avatar';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import { ButtonProps } from '../../../../../component-library/components/Buttons/Button/Button.types';
import { useStyles } from '../../../../hooks/useStyles';
import { InstallSnapFlowProps } from '../../InstallSnapApproval.types';
import { SnapPermissions } from '../../../../Views/Snaps/components/SnapPermissions';
import {
  SNAP_INSTALL_CANCEL,
  SNAP_INSTALL_PERMISSIONS_REQUEST,
  SNAP_INSTALL_PERMISSIONS_REQUEST_APPROVE,
} from './InstallSnapPermissionsRequest.constants';

const InstallSnapPermissionsRequest = ({
  approvalRequest,
  onConfirm,
  onCancel,
  snapName,
}: InstallSnapFlowProps) => {
  const { styles } = useStyles(styleSheet, {});
  const origin = useMemo(
    () => approvalRequest.origin,
    [approvalRequest.origin],
  );

  const cancelButtonProps: ButtonProps = {
    variant: ButtonVariants.Secondary,
    label: strings('accountApproval.cancel'),
    size: ButtonSize.Lg,
    onPress: onCancel,
    testID: SNAP_INSTALL_CANCEL,
  };

  const connectButtonProps: ButtonProps = {
    variant: ButtonVariants.Primary,
    label: strings('install_snap.approve_permissions'),
    size: ButtonSize.Lg,
    onPress: onConfirm,
    testID: SNAP_INSTALL_PERMISSIONS_REQUEST_APPROVE,
  };

  return (
    <View testID={SNAP_INSTALL_PERMISSIONS_REQUEST} style={styles.root}>
      <View style={styles.accountCardWrapper}>
        <Cell
          style={styles.snapCell}
          variant={CellVariant.Display}
          title={snapName}
          avatarProps={{
            variant: AvatarVariant.Icon,
            name: IconName.Snaps,
          }}
        />
        <SheetHeader
          title={strings('install_snap.permissions_request_title')}
        />
        <Text style={styles.description} variant={TextVariant.BodyMD}>
          {strings('install_snap.permissions_request_description', {
            origin,
            snap: snapName,
          })}
        </Text>
        <ScrollView style={styles.snapPermissionContainer}>
          <SnapPermissions
            permissions={approvalRequest.requestState.permissions}
            showLabel={false}
          />
        </ScrollView>
        <View style={styles.actionContainer}>
          <BottomSheetFooter
            buttonsAlignment={ButtonsAlignment.Horizontal}
            buttonPropsArray={[cancelButtonProps, connectButtonProps]}
          />
        </View>
      </View>
    </View>
  );
};

export default React.memo(InstallSnapPermissionsRequest);
///: END:ONLY_INCLUDE_IF
