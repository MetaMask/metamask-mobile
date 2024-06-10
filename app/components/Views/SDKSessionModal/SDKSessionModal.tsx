// Third party dependencies
import React, { useEffect, useMemo, useRef, useState } from 'react';

// External dependencies
import { ThemeColors } from '@metamask/design-tokens/dist/js/themes/types';
import { ThemeTypography } from '@metamask/design-tokens/dist/js/typography';
import { useNavigation } from '@react-navigation/native';
import { StyleSheet, View } from 'react-native';
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { AvatarVariant } from '../../../../app/component-library/components/Avatars/Avatar';
import Button, {
  ButtonVariants,
} from '../../../../app/component-library/components/Buttons/Button';
import Cell, {
  CellVariant,
} from '../../../../app/component-library/components/Cells/Cell';
import TagUrl from '../../../../app/component-library/components/Tags/TagUrl';
import { useAccounts } from '../../../../app/components/hooks/useAccounts';
import Routes from '../../../../app/constants/navigation/Routes';
import {
  getPermittedAccounts,
  getPermittedAccountsByHostname,
} from '../../../../app/core/Permissions';
import DevLogger from '../../../../app/core/SDKConnect/utils/DevLogger';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../component-library/components/BottomSheets/BottomSheetHeader';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { useTheme } from '../../../util/theme';
import { strings } from '../../../../locales/i18n';

const createStyles = (
  _colors: ThemeColors,
  _typography: ThemeTypography,
  _safeAreaInsets: EdgeInsets,
) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      gap: 16,
      paddingBottom: 16,
    },
    disconnectBtn: {
      width: '100%',
      marginTop: 16,
    },
    accountCellContainer: {
      borderWidth: 0,
    },
    sdkInfoContainer: {
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingHorizontal: 16,
      marginBottom: -16,
    },
    actionsContainer: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    btnAction: {
      flex: 1,
      alignSelf: 'center',
      justifyContent: 'center',
    },
  });
interface SDKSEssionMoodalProps {
  route: {
    params: {
      channelId?: string;
      icon?: string;
      urlOrTitle: string;
      version?: string;
      platform?: string;
    };
  };
}

const SDKSessionModal = ({ route }: SDKSEssionMoodalProps) => {
  const { params } = route;
  const { channelId, icon, urlOrTitle, version, platform } = params;

  const sheetRef = useRef<BottomSheetRef>(null);
  const safeAreaInsets = useSafeAreaInsets();
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography, safeAreaInsets);
  const { navigate } = useNavigation();
  const permittedAccountsList = useSelector(
    (state: any) => state.engine.backgroundState.PermissionController,
  );

  const [permittedAccountsAddresses, setPermittedAccountsAddresses] = useState<
    string[]
  >([]);
  const { accounts } = useAccounts({
    isLoading: false,
  });

  const permittedAccounts = useMemo(
    () =>
      accounts?.filter((account) =>
        permittedAccountsAddresses
          .map((address) => address.toLowerCase())
          .includes(account.address.toLowerCase()),
      ),
    [accounts, permittedAccountsAddresses],
  );

  DevLogger.log(`permittedAccountsAddresses`, permittedAccountsAddresses);
  DevLogger.log(
    `permittedAccounts state`,
    JSON.stringify(permittedAccountsList, null, 2),
  );

  useEffect(() => {
    if (channelId) {
      const origin = channelId;
      getPermittedAccounts(origin).then((_accounts) => {
        setPermittedAccountsAddresses(_accounts);
      });
    }
  }, [channelId]);

  return (
    <BottomSheet ref={sheetRef}>
      <View style={styles.container}>
        <BottomSheetHeader>
          <Text variant={TextVariant.HeadingMD}>
            {strings('sdk.manage_connections')}
          </Text>
        </BottomSheetHeader>
        <TagUrl imageSource={{ uri: icon }} label={urlOrTitle} />
        {version && platform && (
          <View style={styles.sdkInfoContainer}>
            <Text color={TextColor.Muted}>
              SDK {platform} v{version}
            </Text>
          </View>
        )}
      </View>
      {permittedAccounts?.map((account, index) => (
        <Cell
          key={`${account}-${index}`}
          variant={CellVariant.Display}
          avatarProps={{
            accountAddress: account.address,
            variant: AvatarVariant.Account,
            style: { alignSelf: 'center', marginRight: 16 },
          }}
          style={styles.accountCellContainer}
          title={account.name}
          secondaryText={account.address}
          onPress={async () => {
            DevLogger.log(
              `Disconnect account: ${account}`,
              JSON.stringify(accounts, null, 2),
            );
            const permittedAccountsByHostname = getPermittedAccountsByHostname(
              permittedAccountsList,
              channelId ?? '',
            );
            DevLogger.log(
              `permittedAccountsByHostname`,
              permittedAccountsByHostname,
            );
          }}
        >
          <View style={styles.btnAction}>
            <Button
              variant={ButtonVariants.Link}
              onPress={() => {
                DevLogger.log(`Disconnect account: ${account}`, accounts);
                if (channelId && account) {
                  navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
                    screen: Routes.SHEET.SDK_DISCONNECT,
                    params: {
                      channelId,
                      accountsLength: permittedAccountsAddresses.length,
                      account: account.address,
                      accountName: account.name,
                      dapp: urlOrTitle,
                    },
                  });
                }
              }}
              label={strings('sdk.disconnect')}
            />
          </View>
        </Cell>
      ))}
      <View style={styles.actionsContainer}>
        <Button
          label={strings('sdk.disconnect_all_accounts')}
          variant={ButtonVariants.Primary}
          style={styles.disconnectBtn}
          onPress={() => {
            DevLogger.log(`Disconnect all accounts channelId=${channelId}`);
            navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
              screen: Routes.SHEET.SDK_DISCONNECT,
              params: {
                channelId,
                account: undefined,
                accountsLength: permittedAccountsAddresses.length,
                dapp: urlOrTitle,
              },
            });
          }}
        />
      </View>
    </BottomSheet>
  );
};

export default SDKSessionModal;
