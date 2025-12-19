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

jest.mock('@metamask/ramps-controller', () => {
  const actualRampsController = jest.requireActual(
    '@metamask/ramps-controller',
  );

  return {
    getDefaultRampsControllerState:
      actualRampsController.getDefaultRampsControllerState,
    RampsController: jest.fn(),
  };
});

describe('ramps controller init', () => {
  const rampsControllerClassMock = jest.mocked(RampsController);
  let initRequestMock: jest.Mocked<
    ControllerInitRequest<RampsControllerMessenger>
  >;

  beforeEach(() => {
    jest.resetAllMocks();
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
});
