import { ActionRegistry } from '../ActionRegistry';
import { registerRampActions } from './RampActions';
import { registerFinancialActions } from './FinancialActions';
import { registerAccountActions } from './AccountActions';
import { registerDAppActions } from './DAppActions';
import { registerProtocolActions } from './ProtocolActions';
import { registerSDKActions } from './SDKActions';
import DevLogger from '../../../SDKConnect/utils/DevLogger';

/**
 * Register all default deeplink actions with the provided registry
 */
export const registerAllActions = (registry: ActionRegistry) => {
  DevLogger.log('Registering all deeplink actions');

  // Register all action groups
  registerRampActions(registry);
  registerFinancialActions(registry);
  registerAccountActions(registry);
  registerDAppActions(registry);
  registerProtocolActions(registry);
  registerSDKActions(registry);

  DevLogger.log(
    `Registered ${registry.getAllActions().length} deeplink actions`,
  );
};

// Export individual registration functions for selective use
export {
  registerRampActions,
  registerFinancialActions,
  registerAccountActions,
  registerDAppActions,
  registerProtocolActions,
  registerSDKActions,
};
