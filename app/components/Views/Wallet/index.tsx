import { useSelector } from 'react-redux';
import useWallet from './hooks/useWallet';
import withUITheme from './hooks/withUITheme';
import { RootState } from '../../../reducers';

/**
 * The main UI componente for the Wallet view will be dependent of the chosen theme
 * and all the logic is hosted in a use[screnName] hook.
 * This way we can have as many "Views" we want, since the logic is separeted from the UI
 */

const WalletWithTheme = () => {
  const uiTheme = useSelector((state: RootState) => state.uiTheme);
  const props = useWallet();
  return withUITheme(uiTheme.wallet, props);
};

export default WalletWithTheme;
