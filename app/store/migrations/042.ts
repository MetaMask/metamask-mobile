import { ensureValidState } from './util';

/**
 * Migration to reset state of TokenBalancesController
 *
 * @param state Persisted Redux state
 * @returns
 */
export default function migrate(state: unknown) {
  if (!ensureValidState(state, 42)) {
    return state;
  }
  // const networkControllerState = state.engine.backgroundState.NetworkController;
  // eslint-disable-next-line no-console
  console.log('+++++++++++++++++++++++++++++++++++++++++');

  return state;
}
