import React, { useCallback } from 'react';
import { View, ViewStyle } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { selectIsEvmNetworkSelected } from '../../../../selectors/multichainNetworkController';
import { WalletViewSelectorsIDs } from '../../../Views/Wallet/WalletView.testIds';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../component-library/components/Buttons/ButtonIcon';
import BaseControlBar from '../../shared/BaseControlBar/BaseControlBar';
import { useStyles } from '../../../hooks/useStyles';
import createControlBarStyles from '../../shared/ControlBarStyles';
import Routes from '../../../../constants/navigation/Routes';

interface TokenListControlBarProps {
  goToAddToken: () => void;
  style?: ViewStyle;
}

export const TokenListControlBar = ({
  goToAddToken,
  style,
}: TokenListControlBarProps) => {
  const { styles } = useStyles(createControlBarStyles, undefined);
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const navigation = useNavigation();

  const handleBrowseTokens = useCallback(() => {
    navigation.navigate(Routes.WALLET.TOKEN_STORY_VIEW, { initialIndex: 0 });
  }, [navigation]);

  const additionalButtons = (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <ButtonIcon
        testID="browse-tokens-button"
        size={ButtonIconSizes.Lg}
        onPress={handleBrowseTokens}
        iconName={IconName.Explore}
        style={styles.controlIconButton}
      />
      <ButtonIcon
        testID={WalletViewSelectorsIDs.IMPORT_TOKEN_BUTTON}
        size={ButtonIconSizes.Lg}
        onPress={goToAddToken}
        iconName={IconName.Add}
        style={styles.controlIconButton}
      />
    </View>
  );

  return (
    <BaseControlBar
      networkFilterTestId={WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER}
      additionalButtons={additionalButtons}
      useEvmSelectionLogic={isEvmSelected}
      customWrapper="outer"
      style={style}
    />
  );
};

export default TokenListControlBar;
