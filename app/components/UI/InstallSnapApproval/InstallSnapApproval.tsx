import React, { useMemo } from 'react';
import { ImageSourcePropType, View } from 'react-native';
import { InstallSnapApprovalArgs } from './types';
import createStyles from './styles';
import { useAppThemeFromContext, mockTheme } from '../../../util/theme';
import { strings } from '../../../../locales/i18n';
import {
  ACCOUNT_APROVAL_MODAL_CONTAINER_ID,
  SNAP_INSTALL_CANCEL,
  SNAP_INSTALL_CONNECT,
} from '../../../constants/test-ids';
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import TagUrl from '../../../component-library/components/Tags/TagUrl';
import { getUrlObj, prefixUrlWithProtocol } from '../../../util/browser';
import { IconName } from '../../../component-library/components/Icons/Icon';
import Cell, {
  CellVariants,
} from '../../../component-library/components/Cells/Cell';
import { AvatarVariants } from '../../../component-library/components/Avatars/Avatar';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';

interface KeyItem {
  key: string;
}

const InstallSnapApproval = ({
  requestData,
  onConfirm,
  onCancel,
}: InstallSnapApprovalArgs) => {
  const { colors } = useAppThemeFromContext() || mockTheme;
  const styles = createStyles(colors);

  console.log('Snaps/', JSON.stringify(requestData, null, 2));

  const confirm = (): void => {
    // eslint-disable-next-line no-console
    console.log('confirm', onConfirm);
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

  const favicon: ImageSourcePropType = useMemo(() => {
    const iconUrl = `https://api.faviconkit.com/${dappOrigin}/50`;
    return { uri: iconUrl };
  }, [dappOrigin]);

  const urlWithProtocol = prefixUrlWithProtocol(dappOrigin);

  const secureIcon = useMemo(
    () =>
      (getUrlObj(dappOrigin) as URL).protocol === 'https:'
        ? IconName.Lock
        : IconName.LockSlash,
    [dappOrigin],
  );

  const renderPermissions = () => {
    // eslint-disable-next-line react/prop-types
    const { permissions } = requestData.requestData;
    const keys = Object.keys(permissions);
    const keyItems: KeyItem[] = keys.map((key) => ({ key }));

    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.title}>Permission:</Text>
        <View style={styles.keysContainer}>
          {keyItems.map((item) => (
            <Text style={styles.key} key={item.key}>
              {item.key}
            </Text>
          ))}
        </View>
      </View>
    );
  };
  return (
    <View style={styles.root} testID={ACCOUNT_APROVAL_MODAL_CONTAINER_ID}>
      <View style={styles.accountCardWrapper}>
        <TagUrl
          imageSource={favicon}
          label={urlWithProtocol}
          iconName={secureIcon}
        />
        <SheetHeader title={strings('install_snap.title')} />
        <Text variant={TextVariant.BodyMD}>
          {strings('install_snap.description', {
            origin: dappOrigin,
            snap: snapName,
          })}
        </Text>
        <Cell
          style={styles.snapCell}
          variant={CellVariants.Display}
          title={snapName}
          avatarProps={{
            variant: AvatarVariants.Icon,
            name: IconName.Snaps,
          }}
        />
        <View style={styles.actionContainer}>
          <Button
            variant={ButtonVariants.Secondary}
            label={strings('accountApproval.cancel')}
            onPress={cancel}
            size={ButtonSize.Lg}
            style={styles.button}
            testID={SNAP_INSTALL_CANCEL}
            width={ButtonWidthTypes.Auto}
          />
          <View style={styles.buttonSeparator} />
          <Button
            variant={ButtonVariants.Primary}
            label={strings('accountApproval.connect')}
            size={ButtonSize.Lg}
            onPress={confirm}
            testID={SNAP_INSTALL_CONNECT}
            width={ButtonWidthTypes.Auto}
          />
        </View>
      </View>
    </View>
  );
};

export default InstallSnapApproval;
