import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ControllerInitRequest } from '../../types';
import {
  PredictController,
  PredictControllerMessenger,
  PredictControllerState,
} from '../../../../components/UI/Predict/controllers/PredictController';
import { predictControllerInit } from '.';

jest.mock(
  '../../../../components/UI/Predict/controllers/PredictController',
  () => {
    const actualPredictController = jest.requireActual(
      '../../../../components/UI/Predict/controllers/PredictController',
    );

    return {
      controllerName: actualPredictController.controllerName,
      getDefaultPredictControllerState:
        actualPredictController.getDefaultPredictControllerState,
      PredictController: jest.fn(),
    };
  },
);

describe('predict controller init', () => {
  const predictControllerClassMock = jest.mocked(PredictController);
  let initRequestMock: jest.Mocked<
    ControllerInitRequest<PredictControllerMessenger>
  >;

  beforeEach(() => {
    jest.resetAllMocks();
    const baseControllerMessenger = new ExtendedControllerMessenger();
    // Create controller init request mock
    initRequestMock = buildControllerInitRequestMock(baseControllerMessenger);
  });

  it('returns controller instance', () => {
    expect(predictControllerInit(initRequestMock).controller).toBeInstanceOf(
      PredictController,
    );
  });

  it('controller state should be default state when no initial state is passed in', () => {
    const defaultPredictControllerState = jest
      .requireActual(
        '../../../../components/UI/Predict/controllers/PredictController',
      )
      .getDefaultPredictControllerState();

    predictControllerInit(initRequestMock);

    const predictControllerState =
      predictControllerClassMock.mock.calls[0][0].state;

    expect(predictControllerState).toEqual(defaultPredictControllerState);
  });

  it('controller state should be initial state when initial state is passed in', () => {
    const initialPredictControllerState: PredictControllerState = {
      positions: [],
      eligibility: {},
      lastError: null,
      lastUpdateTimestamp: Date.now(),
      activeOrders: {},
      notifications: [],
    };

    initRequestMock.persistedState = {
      ...initRequestMock.persistedState,
      PredictController: initialPredictControllerState,
    };

    predictControllerInit(initRequestMock);

    const predictControllerState =
      predictControllerClassMock.mock.calls[0][0].state;

    expect(predictControllerState).toStrictEqual(initialPredictControllerState);
  });
});
