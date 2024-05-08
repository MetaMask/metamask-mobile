import { withHook } from '../../../util/withHook';
import useWallet from './hooks/useWallet';
<<<<<<< HEAD
import withUITheme from './hooks/withUITheme';
=======
import choseUITheme from './hooks/choseUITheme';
>>>>>>> cd49389e2 (chore: various polishings)

/**
 * The main UI componente for the Wallet view will be dependent of the chosen theme
 * and all the logic is hosted in a use[screnName] hook.
 * This way we can have as many "Views" we want, since the logic is separeted from the UI
 */

<<<<<<< HEAD
const Wallet = withUITheme('custom02');
=======
const Wallet = choseUITheme('custom01');
>>>>>>> cd49389e2 (chore: various polishings)

export default withHook(useWallet)(Wallet);
