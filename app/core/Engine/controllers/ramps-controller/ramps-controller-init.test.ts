import { waitFor } from '@testing-library/react-native';
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

const mockInit = jest.fn().mockResolvedValue(undefined);

jest.mock('@metamask/ramps-controller', () => {
  const actual = jest.requireActual('@metamask/ramps-controller');

  const MockRampsControllerSpy = jest.fn().mockImplementation(() => {
    const instance = Object.create(MockRampsControllerSpy.prototype);
    instance.constructor = MockRampsControllerSpy;
    instance.init = mockInit;
    return instance;
  });

  MockRampsControllerSpy.prototype = Object.create(
    actual.RampsController.prototype,
  );
  MockRampsControllerSpy.prototype.constructor = MockRampsControllerSpy;
  Object.setPrototypeOf(MockRampsControllerSpy, actual.RampsController);

  return {
    ...actual,
    RampsController: MockRampsControllerSpy,
  };
});

describe('ramps controller init', () => {
  const rampsControllerClassMock = jest.mocked(RampsController);
  let initRequestMock: jest.Mocked<
    ControllerInitRequest<RampsControllerMessenger>
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockInit.mockResolvedValue(undefined);
    const baseControllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
      namespace: MOCK_ANY_NAMESPACE,
    });
    initRequestMock = buildControllerInitRequestMock(baseControllerMessenger);
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
      userRegion: null,
      tokens: null,
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

  it('calls init at startup', async () => {
    rampsControllerInit(initRequestMock);

    await waitFor(() => {
      expect(mockInit).toHaveBeenCalledTimes(1);
    });
  });

  it('handles init failure gracefully', async () => {
    mockInit.mockRejectedValue(new Error('Network error'));

    expect(() => rampsControllerInit(initRequestMock)).not.toThrow();

    await waitFor(() => {
      expect(mockInit).toHaveBeenCalledTimes(1);
    });
  });
});
