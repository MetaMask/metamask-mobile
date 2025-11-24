///: BEGIN:ONLY_INCLUDE_IF(external-snaps)
import React, { useMemo } from 'react';
import { View } from 'react-native';
import styleSheet from '../../InstallSnapApproval.styles';
import { strings } from '../../../../../../locales/i18n';
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
import { SNAP_INSTALL_OK } from '../../InstallSnapApproval.constants';
import SNAP_INSTALL_ERROR from './InstallSnapError.constants';

const InstallSnapError = ({
  onConfirm,
  error,
  snapName,
}: Pick<InstallSnapFlowProps, 'onConfirm' | 'error' | 'snapName'>) => {
  const { styles } = useStyles(styleSheet, {});

  const okButtonProps: ButtonProps = {
    variant: ButtonVariants.Primary,
    label: strings('install_snap.okay_action'),
    size: ButtonSize.Lg,
    onPress: onConfirm,
    testID: SNAP_INSTALL_OK,
  };

  const errorTitle = useMemo(
    () =>
      error?.message ? error?.message : strings('install_snap.error_title'),
    [error],
  );

  return (
    <View testID={SNAP_INSTALL_ERROR} style={styles.root}>
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
        <View style={styles.iconContainer}>
          <View style={styles.iconWrapper}>
            <Icon
              name={IconName.Warning}
              color={IconColor.Error}
              size={IconSize.Lg}
            />
          </View>
        </View>
        <SheetHeader title={errorTitle} />
        <Text style={styles.description} variant={TextVariant.BodyMD}>
          {strings('install_snap.error_description', {
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

export default React.memo(InstallSnapError);
///: END:ONLY_INCLUDE_IF
