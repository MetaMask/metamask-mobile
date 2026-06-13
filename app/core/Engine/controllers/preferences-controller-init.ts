import { MessengerClientInitFunction } from '../types';
import {
  PreferencesController,
  type PreferencesControllerMessenger,
} from '@metamask/preferences-controller';
import AppConstants from '../../AppConstants';
import {
  ADVANCED_GAS_FEE_METADATA,
  type MutablePreferencesControllerWithSavedGasFees,
  type PreferencesControllerStateUpdater,
  type PreferencesControllerWithSavedGasFees,
  type PreferencesStateWithSavedGasFees,
} from './preferences-controller-types';

/**
 * Initialize the preferences controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const preferencesControllerInit: MessengerClientInitFunction<
  PreferencesControllerWithSavedGasFees,
  PreferencesControllerMessenger
> = ({ controllerMessenger, persistedState }) => {
  const persistedPreferencesState = persistedState.PreferencesController as
    | Partial<PreferencesStateWithSavedGasFees>
    | undefined;

  const controller = new PreferencesController({
    messenger: controllerMessenger,
    state: {
      ipfsGateway: AppConstants.IPFS_DEFAULT_GATEWAY_URL,
      useTokenDetection: persistedPreferencesState?.useTokenDetection ?? true,
      useNftDetection: true,
      displayNftMedia: true,
      securityAlertsEnabled: true,
      smartTransactionsOptInStatus: true,
      tokenSortConfig: {
        key: 'tokenFiatAmount',
        order: 'dsc',
        sortCallback: 'stringNumeric',
      },
      ...persistedPreferencesState,
      advancedGasFee: persistedPreferencesState?.advancedGasFee ?? {},
    } as Partial<PreferencesStateWithSavedGasFees>,
  });

  const controllerWithSavedGasFees =
    controller as unknown as MutablePreferencesControllerWithSavedGasFees;

  controllerWithSavedGasFees.metadata = {
    ...controllerWithSavedGasFees.metadata,
    advancedGasFee: ADVANCED_GAS_FEE_METADATA,
  };

  controllerWithSavedGasFees.setAdvancedGasFee = ({
    account,
    chainId,
    gasFeePreferences,
  }) => {
    const updateControllerState = controllerWithSavedGasFees.update.bind(
      controllerWithSavedGasFees,
    ) as PreferencesControllerStateUpdater;

    updateControllerState((state) => {
      const normalizedAccount = account.toLowerCase();
      const chainPreferences = state.advancedGasFee[chainId] ?? {};

      if (!gasFeePreferences) {
        const {
          [normalizedAccount]: _removedPreference,
          ...remainingChainPreferences
        } = chainPreferences;

        state.advancedGasFee = {
          ...state.advancedGasFee,
          [chainId]: remainingChainPreferences,
        };
        return;
      }

      state.advancedGasFee = {
        ...state.advancedGasFee,
        [chainId]: {
          ...chainPreferences,
          [normalizedAccount]: gasFeePreferences,
        },
      };
    });
  };

  return {
    controller: controllerWithSavedGasFees,
  };
};
