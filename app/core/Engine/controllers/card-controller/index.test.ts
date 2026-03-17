import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ControllerInitRequest } from '../../types';
import { CardController, defaultCardControllerState } from './CardController';
import {
  type CardControllerMessenger,
  type CardControllerState,
} from './types';
import { cardControllerInit } from '.';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('./CardController', () => {
  const actual = jest.requireActual('./CardController');
  return {
    ...actual,
    CardController: jest.fn(actual.CardController),
  };
});

describe('cardControllerInit', () => {
  const cardControllerClassMock = jest.mocked(CardController);
  let initRequestMock: jest.Mocked<
    ControllerInitRequest<CardControllerMessenger>
  >;

  beforeEach(() => {
    jest.resetAllMocks();

    const baseControllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
      namespace: MOCK_ANY_NAMESPACE,
    });

    initRequestMock = buildControllerInitRequestMock(baseControllerMessenger);
  });

  it('returns a controller instance', () => {
    const result = cardControllerInit(initRequestMock);

    expect(result.controller).toBeInstanceOf(CardController);
  });

  it('uses default state when no persisted state is provided', () => {
    initRequestMock.persistedState = {};

    cardControllerInit(initRequestMock);

    const constructorArgs = cardControllerClassMock.mock.calls[0][0];
    expect(constructorArgs.state).toStrictEqual(defaultCardControllerState);
  });

  it('uses persisted state when provided', () => {
    const persistedState: CardControllerState = {
      selectedCountry: 'US',
      activeProviderId: 'baanx',
      isAuthenticated: true,
      cardholderAccounts: ['eip155:1:0xabc'],
      providerData: { baanx: { location: 'us' } },
    };

    initRequestMock.persistedState = {
      ...initRequestMock.persistedState,
      CardController: persistedState,
    };

    cardControllerInit(initRequestMock);

    const constructorArgs = cardControllerClassMock.mock.calls[0][0];
    expect(constructorArgs.state).toStrictEqual(persistedState);
  });
});
