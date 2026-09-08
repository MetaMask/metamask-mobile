import Engine from '../../core/Engine';
import { syncConsolidatedBasicFunctionalityPreferences } from './syncConsolidatedBasicFunctionalityPreferences';

jest.mock('../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      PreferencesController: {
        setUseTransactionSimulations: jest.fn(),
        setIsMultiAccountBalancesEnabled: jest.fn(),
        setSecurityAlertsEnabled: jest.fn(),
        setUseTokenDetection: jest.fn(),
        setUseNftDetection: jest.fn(),
        setDisplayNftMedia: jest.fn(),
        setIsIpfsGatewayEnabled: jest.fn(),
        setUseSafeChainsListValidation: jest.fn(),
      },
    },
  },
}));

describe('syncConsolidatedBasicFunctionalityPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('enables all consolidated preference toggles when enabled is true', () => {
    syncConsolidatedBasicFunctionalityPreferences(true);

    expect(
      Engine.context.PreferencesController.setUseTransactionSimulations,
    ).toHaveBeenCalledWith(true);
    expect(
      Engine.context.PreferencesController.setIsMultiAccountBalancesEnabled,
    ).toHaveBeenCalledWith(true);
    expect(
      Engine.context.PreferencesController.setSecurityAlertsEnabled,
    ).toHaveBeenCalledWith(true);
    expect(
      Engine.context.PreferencesController.setUseTokenDetection,
    ).toHaveBeenCalledWith(true);
    expect(
      Engine.context.PreferencesController.setUseNftDetection,
    ).toHaveBeenCalledWith(true);
    expect(
      Engine.context.PreferencesController.setDisplayNftMedia,
    ).toHaveBeenCalledWith(true);
    expect(
      Engine.context.PreferencesController.setUseSafeChainsListValidation,
    ).toHaveBeenCalledWith(true);
  });

  it('does not sync IPFS gateway so it stays independent like extension', () => {
    syncConsolidatedBasicFunctionalityPreferences(true);
    syncConsolidatedBasicFunctionalityPreferences(false);

    expect(
      Engine.context.PreferencesController.setIsIpfsGatewayEnabled,
    ).not.toHaveBeenCalled();
  });

  it('disables all consolidated preference toggles when enabled is false', () => {
    syncConsolidatedBasicFunctionalityPreferences(false);

    expect(
      Engine.context.PreferencesController.setUseTransactionSimulations,
    ).toHaveBeenCalledWith(false);
    expect(
      Engine.context.PreferencesController.setIsMultiAccountBalancesEnabled,
    ).toHaveBeenCalledWith(false);
    expect(
      Engine.context.PreferencesController.setSecurityAlertsEnabled,
    ).toHaveBeenCalledWith(false);
  });
});
