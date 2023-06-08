import React, { useMemo } from 'react';
import stylesheet from './InstallSnapPermissionRequest.styles';
import { strings } from '../../../../../../locales/i18n';
import {
  SNAP_INSTALL_CANCEL,
  SNAP_INSTALL_CONNECT,
} from '../../../../../constants/test-ids';
import SheetHeader from '../../../../../component-library/components/Sheet/SheetHeader';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import Cell, {
  CellVariants,
} from '../../../../../component-library/components/Cells/Cell';
import { AvatarVariants } from '../../../../../component-library/components/Avatars/Avatar';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import { ButtonProps } from '../../../../../component-library/components/Buttons/Button/Button.types';
import { useStyles } from '../../../../hooks/useStyles';
import { InstallSnapApprovalArgs } from '../../InstallSnapApprovalFlow.types';

const InstallSnapPermissionsRequest = ({
  requestData,
  onConfirm,
  onCancel,
}: InstallSnapApprovalArgs) => {
  const { styles } = useStyles(stylesheet, {});

  const confirm = (): void => {
    onConfirm();
    // Add track event
  };

  const cancel = (): void => {
    // Add track event
    onCancel();
  };

  const snapName = useMemo(() => {
    const colonIndex = requestData.requestData.snapId.indexOf(':');
    if (colonIndex !== -1) {
      return requestData.requestData.snapId.substring(colonIndex + 1);
    }
    return requestData.requestData.snapId;
  }, [requestData.requestData.snapId]);

  const dappOrigin = useMemo(
    () => requestData.requestData.metadata.dappOrigin,
    [requestData.requestData.metadata.dappOrigin],
  );

  const cancelButtonProps: ButtonProps = {
    variant: ButtonVariants.Secondary,
    label: strings('accountApproval.cancel'),
    size: ButtonSize.Lg,
    onPress: cancel,
    testID: SNAP_INSTALL_CANCEL,
  };

  const connectButtonProps: ButtonProps = {
    variant: ButtonVariants.Primary,
    label: strings('accountApproval.connect'),
    size: ButtonSize.Lg,
    onPress: confirm,
    testID: SNAP_INSTALL_CONNECT,
  };

  return (
    <View style={styles.root}>
      <View style={styles.accountCardWrapper}>
        <Cell
          style={styles.snapCell}
          variant={CellVariants.Display}
          title={snapName}
          avatarProps={{
            variant: AvatarVariants.Icon,
            name: IconName.Snaps,
          }}
        />
        <SheetHeader
          title={strings('install_snap.permissions_request_title')}
        />
        <Text variant={TextVariant.BodyMD}>
          {strings('install_snap.permissions_request_description', {
            origin: dappOrigin,
            snap: snapName,
          })}
        </Text>

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

export default InstallSnapPermissionsRequest;
