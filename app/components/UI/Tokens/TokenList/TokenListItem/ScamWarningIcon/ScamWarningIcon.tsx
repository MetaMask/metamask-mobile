import React from 'react';
import { TokenI } from '../../../types';
import useIsOriginalNativeTokenSymbol from '../../../../../hooks/useIsOriginalNativeTokenSymbol/useIsOriginalNativeTokenSymbol';
import { useSelector } from 'react-redux';
import { selectProviderConfig } from '../../../../../../selectors/networkController';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../../../../component-library/components/Icons/Icon';

interface ScamWarningIconProps {
  asset: TokenI & { chainId: string };
  setShowScamWarningModal: (arg: boolean) => void;
}

export const ScamWarningIcon = ({
  asset,
  setShowScamWarningModal,
}: ScamWarningIconProps) => {
  const { type } = useSelector(selectProviderConfig);
  const isOriginalNativeTokenSymbol = useIsOriginalNativeTokenSymbol(
    asset.chainId,
    asset.ticker,
    type,
  );
  // Only show warning if explicitly false (not null/loading)
  if (isOriginalNativeTokenSymbol === false && asset.isETH) {
    return (
      <ButtonIcon
        iconName={IconName.Danger}
        onPressIn={() => {
          setShowScamWarningModal(true);
        }}
        iconColor={IconColor.Error}
        size={ButtonIconSizes.Lg}
      />
    );
  }
  return null;
};
