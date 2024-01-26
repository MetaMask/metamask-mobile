import { NETWORKS_CHAIN_ID_WITH_SVG } from '../../../../constants/network';
import { SvgProps } from 'react-native-svg';

/**
 * Network stored by chainId
 */
export type NetworkByIconName = {
  [key in NETWORKS_CHAIN_ID_WITH_SVG]: React.FC<SvgProps & { name: string }>;
};
