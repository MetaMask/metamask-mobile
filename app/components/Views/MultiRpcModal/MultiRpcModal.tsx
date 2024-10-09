import React, { useRef, useCallback } from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import { strings } from '../../../../locales/i18n';
import { useStyles } from '../../../component-library/hooks';
import styleSheet from './MultiRpcModal.styles';
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import Text from '../../../component-library/components/Texts/Text';
import { View, Image } from 'react-native';
import { NftDetectionModalSelectorsIDs } from '../../../../e2e/selectors/Modals/NftDetectionModal.selectors';

import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import { useNavigation } from '@react-navigation/native';
import Engine from '../../../core/Engine';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import {
  selectChainId,
  selectNetworkConfigurations,
} from '../../../selectors/networkController';
import { useSelector } from 'react-redux';
import Cell, {
  CellVariant,
} from '../../../component-library/components/Cells/Cell';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../component-library/components/Avatars/Avatar';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { getNetworkImageSource } from '../../../util/networks';
import Routes from '../../../constants/navigation/Routes';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import/no-commonjs
const networkImage = require('../../../images/networks1.png');

const MultiRpcModal = () => {
  const { styles } = useStyles(styleSheet, {});
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const chainId = useSelector(selectChainId);
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const { trackEvent } = useMetrics();
  const { navigate } = useNavigation();

  const dismissMultiRpcModalMigration = useCallback(() => {
    const { PreferencesController } = Engine.context;
    PreferencesController.setShowMultiRpcModal(false);
    trackEvent(MetaMetricsEvents.MULTI_RPC_MIGRATION_MODAL_ACCEPTED, {
      chainId,
    });

    if (sheetRef?.current) {
      sheetRef.current.onCloseBottomSheet();
    } else {
      navigation.goBack();
    }
  }, [trackEvent, chainId, navigation]);

  return (
    <BottomSheet ref={sheetRef}>
      <SheetHeader title={'Network RPCs Updated'} />
      <View
        testID={NftDetectionModalSelectorsIDs.CONTAINER}
        style={styles.textContainer}
      >
        <ScrollView style={styles.content}>
          <View style={styles.description}>
            <Text style={styles.textDescription}>
              {strings('multi_rpc_migration_modal.description')}
            </Text>
          </View>
          <View style={styles.container}>
            <Image source={networkImage} style={styles.image} />
          </View>

          <View>
            {Object.values(networkConfigurations).map(
              (networkConfiguration, index) => (
                <Cell
                  key={index}
                  variant={CellVariant.SelectWithMenu}
                  title={
                    networkConfiguration.nickname ||
                    networkConfiguration.chainId
                  }
                  secondaryText={networkConfiguration.rpcUrl}
                  avatarProps={{
                    variant: AvatarVariant.Network,
                    name:
                      networkConfiguration.nickname ||
                      networkConfiguration.chainId,
                    //@ts-expect-error - The utils/network file is still JS and this function expects a networkType, and should be optional
                    imageSource: getNetworkImageSource({
                      chainId: networkConfiguration.chainId,
                    }),
                    size: AvatarSize.Sm,
                  }}
                  isSelected={false}
                  buttonIcon={IconName.MoreVertical}
                  showButtonIcon={false}
                  buttonProps={{
                    textButton: strings('transaction.edit'),
                    onButtonClick: () => {
                      sheetRef.current?.onCloseBottomSheet(() => {
                        navigate(Routes.ADD_NETWORK, {
                          shouldNetworkSwitchPopToWallet: false,
                          shouldShowPopularNetworks: false,
                          network: networkConfiguration.rpcUrl,
                        });
                      });
                    },
                  }}
                />
              ),
            )}
          </View>
        </ScrollView>
        <View style={styles.buttonsContainer}>
          <Button
            testID={NftDetectionModalSelectorsIDs.ALLOW_BUTTON}
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label={strings('multi_rpc_migration_modal.accept')}
            onPress={() => dismissMultiRpcModalMigration()}
          />
        </View>
      </View>
    </BottomSheet>
  );
};

export default MultiRpcModal;
