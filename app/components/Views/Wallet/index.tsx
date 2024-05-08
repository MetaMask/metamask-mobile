import { withHook } from '../../../util/withHook';
import useWallet from './hooks/useWallet';
import withUITheme from './hooks/withUITheme';

/**
 * The main UI componente for the Wallet view will be dependent of the chosen theme
 * and all the logic is hosted in a use[screnName] hook.
 * This way we can have as many "Views" we want, since the logic is separeted from the UI
 */

const Wallet = withUITheme('custom02');

export default withHook(useWallet)(Wallet);
