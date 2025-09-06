import React from 'react';
import { useSelector } from 'react-redux';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { KnownCaipNamespace } from '@metamask/utils';
import { selectIsEvmNetworkSelected } from '../../../../selectors/multichainNetworkController';
import { selectChainId } from '../../../../selectors/networkController';
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
  const selectedChainId = useSelector(selectChainId);
  const selectedChainIdCaip = formatChainIdToCaip(selectedChainId);
  const isSolanaSelected = selectedChainIdCaip.includes(
    KnownCaipNamespace.Solana,
  );

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
      useEvmSelectionLogic={!!isSolanaSelected}
      customWrapper="outer"
    />
  );
};

export default TokenListControlBar;
