// PROTOTYPE-DO-NOT-MERGE
import Engine from '../../../../../core/Engine';
import {
  prototypeGeoCountry,
  prototypeSessionCatalog,
  type PrototypeScriptState,
} from './prototypeScenarioEngine';

type KycController = NonNullable<typeof Engine.context.KycController>;

/**
 * Swaps `Engine.context.KycController` while the prototype is active, so the
 * reused consent view's catalog hook (`useKycSessionDisclaimers`) reads the
 * fake instead of the network. Everything else on the controller stays real:
 * the proxy binds other members to the real controller. Restored by
 * `removePrototypeBackend`.
 */
let savedController: KycController | undefined;
let getScript: (() => PrototypeScriptState | null) | undefined;

/**
 * Installs the prototype's fake backend at the Engine boundary. Called when
 * the prototype turns on; no-op outside `__DEV__` or without a controller.
 *
 * @param readScript - Reads the script the prototype is walking, or `null`
 * before a scenario is armed.
 */
export const installPrototypeBackend = (
  readScript: () => PrototypeScriptState | null,
) => {
  if (!__DEV__) {
    return;
  }
  const real = Engine.context.KycController;
  if (!real || savedController) {
    return;
  }
  savedController = real;
  getScript = readScript;
  const fake = new Proxy(real, {
    get(target, property) {
      if (property === 'fetchSessionDisclaimers') {
        return async () => {
          const script = getScript?.();
          if (!script) {
            throw new Error('Kalshi prototype is not active.');
          }
          return prototypeSessionCatalog(script);
        };
      }
      if (property === 'state') {
        return { ...target.state, geoCountry: prototypeGeoCountry };
      }
      const value = Reflect.get(target, property);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as KycController;
  Engine.context.KycController = fake;
};

/** Removes the fake backend again. Called when the prototype resets. */
export const removePrototypeBackend = () => {
  if (!__DEV__) {
    return;
  }
  if (!savedController) {
    return;
  }
  Engine.context.KycController = savedController;
  savedController = undefined;
  getScript = undefined;
};
