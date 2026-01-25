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

const mockUpdateGeolocation = jest.fn().mockResolvedValue('US');

jest.mock('@metamask/ramps-controller', () => {
  const actual = jest.requireActual('@metamask/ramps-controller');

  return {
    ...actual,
    RampsController: jest.fn(() => ({
      updateGeolocation: mockUpdateGeolocation,
    })),
  };
});

describe('ramps controller init', () => {
  const rampsControllerClassMock = jest.mocked(RampsController);
  let initRequestMock: jest.Mocked<
    ControllerInitRequest<RampsControllerMessenger>
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateGeolocation.mockResolvedValue('US');
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
      geolocation: 'US-CA',
      eligibility: null,
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

  it('calls updateGeolocation at startup', async () => {
    rampsControllerInit(initRequestMock);

    await waitFor(() => {
      expect(mockUpdateGeolocation).toHaveBeenCalledTimes(1);
    });
  });

  it('does not throw when updateGeolocation fails', async () => {
    mockUpdateGeolocation.mockRejectedValue(new Error('Network error'));

    expect(() => rampsControllerInit(initRequestMock)).not.toThrow();

    await waitFor(() => {
      expect(mockUpdateGeolocation).toHaveBeenCalledTimes(1);
    });
  });
});
