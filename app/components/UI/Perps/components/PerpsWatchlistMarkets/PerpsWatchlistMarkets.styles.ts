import type { Theme } from '../../../../../util/theme/models';
import { createMarketListStyles } from '../../styles/sharedStyles';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  return createMarketListStyles(theme);
};

export default styleSheet;
