import React from 'react';
import { ViewProps } from 'react-native';
import { NETWORKS_CHAIN_ID_WITH_SVG } from '../../../../constants/network';

import { networkByChainID } from './Network.assets';

/**
 * Network icon component props.
 */
export interface NetworkIconProps extends ViewProps {
  name?: string;
  onError?: (arg: boolean) => void;
  /**
   * Enum to select between networks chainId.
   */
  chainId?: NETWORKS_CHAIN_ID_WITH_SVG;
}

const NetworkIcon = ({
  chainId,
  name,
  onError,
  onResponderTerminationRequest,
  ...props
}: NetworkIconProps) => {
  if (!chainId) {
    return null;
  }

  const Svg = networkByChainID[chainId];
  return <Svg name={name || ''} {...props} width="100%" height="100%" />;
};

export default NetworkIcon;
