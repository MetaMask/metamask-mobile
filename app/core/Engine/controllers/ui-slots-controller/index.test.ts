import type { RemoteFeatureFlagControllerState } from '@metamask/remote-feature-flag-controller';
import { uiSlotsControllerInit } from '.';
import { UiSlotsController } from './UiSlotsController';
import { store } from '../../../../store';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import { validatedVersionGatedFeatureFlag } from '../../../../util/remoteFeatureFlag';
import type { UiSlotsControllerMessenger } from './types';

jest.mock('./UiSlotsController', () => ({
  UiSlotsController: jest.fn(),
  defaultUiSlotsControllerState: {
    enabled: false,
    screenConfigurations: {},
    activeConfigurations: {},
  },
}));
jest.mock('./UiSlotsApiReadClient', () => ({
  UiSlotsApiReadClient: jest.fn(),
}));
jest.mock('../../../../store', () => ({
  store: {
    subscribe: jest.fn(),
  },
}));
jest.mock('../../../../selectors/settings', () => ({
  selectBasicFunctionalityEnabled: jest.fn(),
}));
jest.mock('../../../../util/remoteFeatureFlag', () => ({
  validatedVersionGatedFeatureFlag: jest.fn(),
}));
jest.mock('../../../../util/Logger');

describe('uiSlotsControllerInit', () => {
  const uiSlotsControllerClassMock = jest.mocked(UiSlotsController);
  const selectBasicFunctionalityEnabledMock = jest.mocked(
    selectBasicFunctionalityEnabled,
  );
  const validatedVersionGatedFeatureFlagMock = jest.mocked(
    validatedVersionGatedFeatureFlag,
  );
  const storeSubscribeMock = jest.mocked(store.subscribe);

  const setEnabled = jest.fn();
  const getState = jest.fn();
  let remoteFeatureFlags: RemoteFeatureFlagControllerState['remoteFeatureFlags'];
  let controllerMessenger: jest.Mocked<UiSlotsControllerMessenger>;

  beforeEach(() => {
    jest.clearAllMocks();
    setEnabled.mockReset();
    getState.mockReturnValue({});
    remoteFeatureFlags = {
      uiSlots: { enabled: true, minimumVersion: '0.0.0' },
    };
    controllerMessenger = {
      call: jest.fn((action: string) => {
        if (action === 'RemoteFeatureFlagController:getState') {
          return { remoteFeatureFlags };
        }
        return undefined;
      }),
      subscribe: jest.fn(),
    } as unknown as jest.Mocked<UiSlotsControllerMessenger>;
    uiSlotsControllerClassMock.mockImplementation(
      () =>
        ({
          setEnabled,
        }) as unknown as UiSlotsController,
    );
    selectBasicFunctionalityEnabledMock.mockReturnValue(true);
    validatedVersionGatedFeatureFlagMock.mockReturnValue(true);
    storeSubscribeMock.mockReturnValue(jest.fn());
  });

  const init = () =>
    uiSlotsControllerInit({
      controllerMessenger,
      persistedState: {},
      getState,
    } as never);

  it('enables the controller when the remote flag and basic functionality are on', () => {
    init();

    expect(setEnabled).toHaveBeenCalledWith(true);
    expect(
      uiSlotsControllerClassMock.mock.calls[0][0].isExternalServicesEnabled?.(),
    ).toBe(true);
  });

  it('keeps the controller disabled when basic functionality is off', () => {
    selectBasicFunctionalityEnabledMock.mockReturnValue(false);

    init();

    expect(setEnabled).toHaveBeenCalledWith(false);
  });

  it('disables the controller when basic functionality is turned off', () => {
    init();
    setEnabled.mockClear();
    const onStoreChange = storeSubscribeMock.mock.calls[0][0];

    selectBasicFunctionalityEnabledMock.mockReturnValue(false);
    onStoreChange();

    expect(setEnabled).toHaveBeenCalledWith(false);
  });
});
