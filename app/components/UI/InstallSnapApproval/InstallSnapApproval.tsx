import React, { useMemo } from 'react';
import { ImageSourcePropType, View } from 'react-native';
import { useSelector } from 'react-redux';
import { InstallSnapApprovalArgs } from './types';
import createStyles from './styles';
import { useAppThemeFromContext, mockTheme } from '../../../util/theme';
import StyledButton from '../StyledButton';
import { strings } from '../../../../locales/i18n';
import {
  ACCOUNT_APROVAL_MODAL_CONTAINER_ID,
  CANCEL_BUTTON_ID,
} from '../../../constants/test-ids';
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import TagUrl from '../../../component-library/components/Tags/TagUrl';
import { getUrlObj, prefixUrlWithProtocol } from '../../../util/browser';
import { IconName } from '../../../component-library/components/Icons/Icon';

interface KeyItem {
  key: string;
}

const InstallSnapApproval = ({
  requestData,
  onConfirm,
  onCancel,
  currentPageInformation,
}: InstallSnapApprovalArgs) => {
  const { colors } = useAppThemeFromContext() || mockTheme;
  const styles = createStyles(colors);

  const selectedAddress = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.selectedAddress,
  );

  console.log(
    'Snaps/ currentPageInformation',
    JSON.stringify(currentPageInformation, null, 2),
  );
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
        {renderPermissions()}
        <View style={styles.actionContainer}>
          <StyledButton
            type={'cancel'}
            onPress={cancel}
            containerStyle={[styles.button, styles.cancel]}
            testID={CANCEL_BUTTON_ID}
          >
            {strings('accountApproval.cancel')}
          </StyledButton>
          <StyledButton
            type={'confirm'}
            onPress={confirm}
            containerStyle={[styles.button, styles.confirm]}
            testID={'connect-approve-button'}
          >
            Approve
          </StyledButton>
        </View>
      </View>
    </View>
  );
};

export default InstallSnapApproval;
