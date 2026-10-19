import React from 'react';
import { TokenI } from '../../../types';
import useIsOriginalNativeTokenSymbol from '../../../../../hooks/useIsOriginalNativeTokenSymbol/useIsOriginalNativeTokenSymbol';
import { useSelector } from 'react-redux';
import { selectProviderConfig } from '../../../../../../selectors/networkController';
import {
  ButtonIcon,
  ButtonIconSize,
  IconColor,
  IconName,
} from '@metamask/design-system-react-native';

interface ScamWarningIconProps {
  asset: TokenI & { chainId: string };
  setShowScamWarningModal: (chainId: string | null) => void;
}

export const ScamWarningIcon = ({
  asset,
  setShowScamWarningModal,
}: ScamWarningIconProps) => {
  const { type } = useSelector(selectProviderConfig);
  const isOriginalNativeTokenSymbol = useIsOriginalNativeTokenSymbol(
    asset.chainId,
    asset.ticker ?? asset.symbol,
    type,
  );
  if (
    isOriginalNativeTokenSymbol === false &&
    (asset.isNative || asset.isETH)
  ) {
    return (
      <ButtonIcon
        iconName={IconName.Danger}
        onPressIn={() => {
          setShowScamWarningModal(asset.chainId);
        }}
        iconProps={{ color: IconColor.ErrorDefault }}
        size={ButtonIconSize.Lg}
      />
    );
  }
  return null;
};
