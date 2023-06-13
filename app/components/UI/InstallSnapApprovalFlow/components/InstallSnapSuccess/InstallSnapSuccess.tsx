import React, { useMemo } from 'react';
import { View } from 'react-native';
import stylesheet from './InstallSnapSuccess.styles';
import { strings } from '../../../../../../locales/i18n';
import {
  SNAP_INSTALL_OK,
  SNAP_INSTALL_SUCCESS,
} from '../../../../../constants/test-ids';
import SheetHeader from '../../../../../component-library/components/Sheet/SheetHeader';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
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
import { InstallSnapFlowProps } from '../../InstallSnapApprovalFlow.types';

const InstallSnapSuccess = ({
  requestData,
  onConfirm,
}: InstallSnapFlowProps) => {
  const { styles } = useStyles(stylesheet, {});

  const confirm = (): void => {
    onConfirm();
    // Add track event
  };

  const snapName = useMemo(() => {
    const colonIndex = requestData.requestData.snapId.indexOf(':');
    if (colonIndex !== -1) {
      return requestData.requestData.snapId.substring(colonIndex + 1);
    }
    return requestData.requestData.snapId;
  }, [requestData.requestData.snapId]);

  const okButtonProps: ButtonProps = {
    variant: ButtonVariants.Primary,
    label: strings('install_snap.okay_action'),
    size: ButtonSize.Lg,
    onPress: confirm,
    testID: SNAP_INSTALL_OK,
  };

  return (
    <View testID={SNAP_INSTALL_SUCCESS} style={styles.root}>
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
        <View style={styles.iconContainer}>
          <View style={styles.iconWrapper}>
            <Icon
              name={IconName.Confirmation}
              color={IconColor.Success}
              size={IconSize.Lg}
            />
          </View>
        </View>
        <SheetHeader title={strings('install_snap.installed')} />
        <Text style={styles.description} variant={TextVariant.BodyMD}>
          {strings('install_snap.install_successful', {
            snap: snapName,
          })}
        </Text>
        <View style={styles.actionContainer}>
          <BottomSheetFooter
            buttonsAlignment={ButtonsAlignment.Horizontal}
            buttonPropsArray={[okButtonProps]}
          />
        </View>
      </View>
    </View>
  );
};

export default InstallSnapSuccess;
