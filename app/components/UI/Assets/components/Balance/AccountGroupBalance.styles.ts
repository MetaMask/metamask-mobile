import type { Colors } from '../../../../../util/theme/models';
import tokensCreateStyles from '../../../Tokens/styles';

const createStyles = (colors: Colors) => {
  const tokensStyles = tokensCreateStyles(colors);
  return {
    portfolioBalance: tokensStyles.portfolioBalance,
    balanceContainer: tokensStyles.balanceContainer,
    loaderWrapper: tokensStyles.loaderWrapper,
  } as const;
};

export default createStyles;
