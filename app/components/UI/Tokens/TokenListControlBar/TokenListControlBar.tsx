import React from 'react';
import { ViewStyle } from 'react-native';
import { WalletViewSelectorsIDs } from '../../../Views/Wallet/WalletView.testIds';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../component-library/components/Buttons/ButtonIcon';
import BaseControlBar from '../../shared/BaseControlBar/BaseControlBar';
import { useStyles } from '../../../hooks/useStyles';
import createControlBarStyles from '../../shared/ControlBarStyles';

interface TokenListControlBarProps {
  goToAddToken: () => void;
  style?: ViewStyle;
}

export const TokenListControlBar = ({
  goToAddToken,
  style,
}: TokenListControlBarProps) => {
  const { styles } = useStyles(createControlBarStyles, undefined);

  const additionalButtons = (
    <ButtonIcon
      testID={WalletViewSelectorsIDs.IMPORT_TOKEN_BUTTON}
      size={ButtonIconSizes.Lg}
      onPress={goToAddToken}
      iconName={IconName.Add}
      style={styles.controlIconButton}
    />
  );

  return (
    <BaseControlBar
      networkFilterTestId={WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER}
      additionalButtons={additionalButtons}
      customWrapper="outer"
      style={style}
    />
  );
};

export default TokenListControlBar;
