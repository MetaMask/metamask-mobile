import { StyleSheet, View } from 'react-native';
import React from 'react';
import { useSelector } from 'react-redux';
import { selectProviderType } from '../../../selectors/networkController';
import { selectUseNftDetection } from '../../../selectors/preferencesController';
import { MAINNET } from '../../../constants/network';
import CollectibleDetectionModal from '../CollectibleDetectionModal';
import BaseControlBar from '../shared/BaseControlBar';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { useStyles } from '../../hooks/useStyles';
import createControlBarStyles from '../shared/ControlBarStyles';

const style = StyleSheet.create({
  emptyView: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const NftGridHeader = ({
  isAddNFTEnabled,
  goToAddCollectible,
}: {
  isAddNFTEnabled: boolean;
  goToAddCollectible: () => void;
}) => {
  const { styles } = useStyles(createControlBarStyles, undefined);
  const networkType = useSelector(selectProviderType);
  const useNftDetection = useSelector(selectUseNftDetection);

  const isCollectionDetectionBannerVisible =
    networkType === MAINNET && !useNftDetection;

  const additionalButtons = (
    <ButtonIcon
      testID={WalletViewSelectorsIDs.IMPORT_TOKEN_BUTTON}
      size={ButtonIconSizes.Lg}
      onPress={goToAddCollectible}
      iconName={IconName.Add}
      disabled={!isAddNFTEnabled}
      isDisabled={!isAddNFTEnabled}
      style={styles.controlIconButton}
    />
  );

  return (
    isCollectionDetectionBannerVisible && (
      <View style={style.emptyView}>
        <BaseControlBar
          networkFilterTestId={WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER}
          useEvmSelectionLogic={false}
          customWrapper="none"
          additionalButtons={additionalButtons}
          hideSort
        />
        <CollectibleDetectionModal />
      </View>
    )
  );
};

export default NftGridHeader;
