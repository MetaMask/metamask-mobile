import React, { useMemo } from 'react';
import { ImageSourcePropType, View } from 'react-native';
import { InstallSnapFlowProps } from '../../InstallSnapApproval.types';
import styleSheet from './InstallSnapConnectionRequest.styles';
import { strings } from '../../../../../../locales/i18n';
import SheetHeader from '../../../../../component-library/components/Sheet/SheetHeader';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import TagUrl from '../../../../../component-library/components/Tags/TagUrl';
import { getUrlObj, prefixUrlWithProtocol } from '../../../../../util/browser';
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
import {
  SNAP_INSTALL_CANCEL,
  SNAP_INSTALL_CONNECT,
  SNAP_INSTALL_CONNECTION_REQUEST,
} from './InstallSnapConnectionRequest.constants';

const InstallSnapConnectionRequest = ({
  approvalRequest,
  onConfirm,
  onCancel,
}: Pick<
  InstallSnapFlowProps,
  'approvalRequest' | 'onConfirm' | 'onCancel'
>) => {
  const { styles } = useStyles(styleSheet, {});

  const snapName: string | null =
    Object.keys(
      approvalRequest?.requestData?.permissions?.wallet_snap?.caveats?.find(
        (c: { type: string; value: Record<string, any> }) =>
          c.type === 'snapIds',
      )?.value ?? {},
    )[0] || null;

  const origin = useMemo(
    () => approvalRequest.origin,
    [approvalRequest.origin],
  );

  const favicon: ImageSourcePropType = useMemo(() => {
    const iconUrl = `https://api.faviconkit.com/${origin}/50`;
    return { uri: iconUrl };
  }, [origin]);

  const urlWithProtocol = prefixUrlWithProtocol(origin);

  const secureIcon = useMemo(
    () =>
      getUrlObj(origin).protocol === 'https:'
        ? IconName.Lock
        : IconName.LockSlash,
    [origin],
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
    label: strings('accountApproval.connect'),
    size: ButtonSize.Lg,
    onPress: onConfirm,
    testID: SNAP_INSTALL_CONNECT,
  };

  return (
    <View testID={SNAP_INSTALL_CONNECTION_REQUEST} style={styles.root}>
      <View style={styles.accountCardWrapper}>
        <TagUrl
          imageSource={favicon}
          label={urlWithProtocol}
          iconName={secureIcon}
        />
        <SheetHeader title={strings('install_snap.title')} />
        <Text style={styles.description} variant={TextVariant.BodyMD}>
          {strings('install_snap.description', {
            origin,
            snap: snapName,
          })}
        </Text>
        <Cell
          style={styles.snapCell}
          variant={CellVariant.Display}
          title={snapName ?? ''}
          avatarProps={{
            variant: AvatarVariant.Icon,
            name: IconName.Snaps,
          }}
        />
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

export default React.memo(InstallSnapConnectionRequest);
