// Third party dependencies
import React, { useMemo, useRef } from 'react';

// External dependencies
import { ThemeColors } from '@metamask/design-tokens/dist/js/themes/types';
import { ThemeTypography } from '@metamask/design-tokens/dist/js/typography';
import { useNavigation } from '@react-navigation/native';
import { StyleSheet, View } from 'react-native';
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheetHeader from '../../../../app/component-library/components/BottomSheets/BottomSheetHeader';
import Button, {
  ButtonVariants,
} from '../../../../app/component-library/components/Buttons/Button';
import Text, {
  TextVariant,
} from '../../../../app/component-library/components/Texts/Text';
import { removePermittedAccounts } from '../../../../app/core/Permissions';
import SDKConnect from '../../../../app/core/SDKConnect/SDKConnect';
import DevLogger from '../../../../app/core/SDKConnect/utils/DevLogger';
import { useTheme } from '../../../../app/util/theme';
import { strings } from '../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';

const createStyles = (
  _colors: ThemeColors,
  _typography: ThemeTypography,
  _safeAreaInsets: EdgeInsets,
) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      gap: 16,
    },
    btn: {
      width: '100%',
    },
  });

interface SDKDisconnectModalProps {
  route: {
    params: {
      channelId?: string;
      account?: string;
      accountName?: string;
      dapp?: string;
      accountsLength?: number;
    };
  };
}

const SDKDisconnectModal = ({ route }: SDKDisconnectModalProps) => {
  const { params } = route;
  const { channelId, account, accountsLength, accountName, dapp } =
    params ?? {};

  const sheetRef = useRef<BottomSheetRef>(null);
  const safeAreaInsets = useSafeAreaInsets();
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography, safeAreaInsets);
  const { navigate } = useNavigation();

  const { title, description } = useMemo(() => {
    let _title, _description;

    if (account) {
      _title = 'sdk_disconnect_modal.disconnect_account';
      _description = 'sdk_disconnect_modal.disconnect_account_desc';
    } else if (channelId) {
      _title = 'sdk_disconnect_modal.disconnect_all_account';
      _description = 'sdk_disconnect_modal.disconnect_account';
    } else {
      _title = 'sdk_disconnect_modal.disconnect_all';
      _description = 'sdk_disconnect_modal.disconnect_all_desc';
    }

    return { title: _title, description: _description };
  }, [channelId, account]);

  const onConfirm = async () => {
    if (account && channelId) {
      removePermittedAccounts(channelId, [account]);
      // SDKConnect.getInstance().refreshChannel({ channelId });
    } else if (!account && channelId) {
      SDKConnect.getInstance().removeChannel({ channelId });
    }

    DevLogger.log(
      `OnConfirm: accountsLength=${accountsLength} channelId: ${channelId}, account: ${account}`,
    );
    if (account && accountsLength === 1 && channelId) {
      SDKConnect.getInstance().removeChannel({
        channelId,
        sendTerminate: true,
      });
    } else if (!account && !channelId) {
      SDKConnect.getInstance().removeAll();
    }

    navigate('SDKSessionsManager', { trigger: Math.random() });
  };

  const onCancel = () => {
    navigate('SDKSessionsManager');
  };

  return (
    <BottomSheet ref={sheetRef}>
      <View style={styles.container}>
        <BottomSheetHeader>
          <Text variant={TextVariant.HeadingMD}>{strings(title)}</Text>
        </BottomSheetHeader>
        <Text variant={TextVariant.BodyMD}>
          {strings(description, { account: accountName, dapp })}
        </Text>
        <Button
          label={strings('sdk_disconnect_modal.disconnect_confirm')}
          style={styles.btn}
          variant={ButtonVariants.Primary}
          onPress={onConfirm}
        />
        <Button
          label={strings('sdk_disconnect_modal.cancel')}
          style={styles.btn}
          variant={ButtonVariants.Secondary}
          onPress={onCancel}
        />
      </View>
    </BottomSheet>
  );
};

export default SDKDisconnectModal;
