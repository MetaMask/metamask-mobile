import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ControllerInitRequest } from '../../types';
import {
  RampsController,
  RampsControllerMessenger,
  RampsControllerState,
} from '@metamask/ramps-controller';
import { rampsControllerInit } from './ramps-controller-init';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

const mockStore = (() => {
  const store: { updateGeolocation?: jest.Mock } = {};
  return store;
})();

jest.mock('@metamask/ramps-controller', () => {
  const actualRampsController = jest.requireActual(
    '@metamask/ramps-controller',
  );

  if (!mockStore.updateGeolocation) {
    mockStore.updateGeolocation = jest.fn().mockResolvedValue('US');
  }

  const MockRampsController = jest.fn().mockImplementation(() => ({
      updateGeolocation: mockStore.updateGeolocation,
    }));

  Object.setPrototypeOf(
    MockRampsController.prototype,
    actualRampsController.RampsController.prototype,
  );
  Object.setPrototypeOf(
    MockRampsController,
    actualRampsController.RampsController,
  );

  return {
    getDefaultRampsControllerState:
      actualRampsController.getDefaultRampsControllerState,
    RampsController: MockRampsController,
  };
});

const mockUpdateGeolocation = (() => {
  if (!mockStore.updateGeolocation) {
    mockStore.updateGeolocation = jest.fn().mockResolvedValue('US');
  }
  return mockStore.updateGeolocation;
})();

describe('ramps controller init', () => {
  const rampsControllerClassMock = jest.mocked(RampsController);
  let initRequestMock: jest.Mocked<
    ControllerInitRequest<RampsControllerMessenger>
  >;

  beforeEach(() => {
    jest.resetAllMocks();
    mockUpdateGeolocation.mockResolvedValue('US');
    const baseControllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
      namespace: MOCK_ANY_NAMESPACE,
    });
    initRequestMock = buildControllerInitRequestMock(baseControllerMessenger);
  });

  it('returns controller instance', () => {
    expect(rampsControllerInit(initRequestMock).controller).toBeInstanceOf(
      RampsController,
    );
  });

  it('uses default state when no initial state is passed in', () => {
    const defaultRampsControllerState = jest
      .requireActual('@metamask/ramps-controller')
      .getDefaultRampsControllerState();

    rampsControllerInit(initRequestMock);

    const rampsControllerState =
      rampsControllerClassMock.mock.calls[0][0].state;

    expect(rampsControllerState).toEqual(defaultRampsControllerState);
  });

  it('uses initial state when initial state is passed in', () => {
    const initialRampsControllerState: RampsControllerState = {
      geolocation: 'US-CA',
      requests: {},
    };

    initRequestMock.persistedState = {
      ...initRequestMock.persistedState,
      RampsController: initialRampsControllerState,
    };

    rampsControllerInit(initRequestMock);

    const rampsControllerState =
      rampsControllerClassMock.mock.calls[0][0].state;

    expect(rampsControllerState).toStrictEqual(initialRampsControllerState);
  });

  it('calls updateGeolocation at startup', () => {
    rampsControllerInit(initRequestMock);

    expect(mockUpdateGeolocation).toHaveBeenCalledTimes(1);
  });

  it('handles updateGeolocation failure gracefully', async () => {
    mockUpdateGeolocation.mockRejectedValue(new Error('Network error'));

    expect(() => rampsControllerInit(initRequestMock)).not.toThrow();
  });
});
