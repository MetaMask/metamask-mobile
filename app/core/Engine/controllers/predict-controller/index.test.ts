import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { MessengerClientInitRequest } from '../../types';
import {
  PredictController,
  PredictControllerMessenger,
  PredictControllerState,
} from '../../../../components/UI/Predict/controllers/PredictController';
import { predictControllerInit } from '.';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { ActiveOrderState } from '../../../../components/UI/Predict';

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
    MessengerClientInitRequest<PredictControllerMessenger>
  >;

  beforeEach(() => {
    jest.resetAllMocks();
    const baseControllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
      namespace: MOCK_ANY_NAMESPACE,
    });
    // Create messenger client init request mock
    initRequestMock = buildMessengerClientInitRequestMock(
      baseControllerMessenger,
    );
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
      eligibility: { eligible: false },
      lastError: null,
      lastUpdateTimestamp: Date.now(),
      balances: {},
      claimablePositions: {},
      pendingDeposits: {},
      pendingClaims: {},
      withdrawTransaction: null,
      selectedPaymentToken: null,
      accountMeta: {},
      activeBuyOrders: {},
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
