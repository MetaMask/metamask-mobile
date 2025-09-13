import React from 'react';
import { useSelector } from 'react-redux';
import { selectIsEvmNetworkSelected } from '../../../../selectors/multichainNetworkController';
import { WalletViewSelectorsIDs } from '../../../../../e2e/selectors/wallet/WalletView.selectors';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../component-library/components/Buttons/ButtonIcon';
import BaseControlBar from '../../shared/BaseControlBar/BaseControlBar';
import { useStyles } from '../../../hooks/useStyles';
import createControlBarStyles from '../../shared/ControlBarStyles';

interface TokenListControlBarProps {
  goToAddToken: () => void;
}

export const TokenListControlBar = ({
  goToAddToken,
}: TokenListControlBarProps) => {
  const { styles } = useStyles(createControlBarStyles, undefined);
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);

  const additionalButtons = (
    <ButtonIcon
      testID={WalletViewSelectorsIDs.IMPORT_TOKEN_BUTTON}
      size={ButtonIconSizes.Lg}
      onPress={goToAddToken}
      iconName={IconName.Add}
      isDisabled={!isEvmSelected}
      style={styles.controlIconButton}
      disabled={!isEvmSelected}
    />
  );

  return (
    <BaseControlBar
      networkFilterTestId={WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER}
      additionalButtons={additionalButtons}
      useEvmSelectionLogic={isEvmSelected}
      customWrapper="outer"
    />
  );
};

export default TokenListControlBar;
