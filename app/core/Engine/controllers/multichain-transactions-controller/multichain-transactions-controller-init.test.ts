import {
  MultichainTransactionsController,
  MultichainTransactionsControllerState,
} from '@metamask/multichain-transactions-controller';
import { MultichainTransactionsControllerMessenger } from '../../messengers/multichain-transactions-controller-messenger/multichain-transactions-controller-messenger';
import type { ControllerInitRequest } from '../../types';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { multichainTransactionsControllerInit } from './multichain-transactions-controller-init';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';
import { MOCK_SOLANA_ACCOUNT } from '../../../../util/test/accountsControllerTestUtils';

jest.mock('@metamask/multichain-transactions-controller');

describe('multichain transactions controller init', () => {
  const multichainTransactionsControllerClassMock = jest.mocked(
    MultichainTransactionsController,
  );
  let initRequestMock: jest.Mocked<
    ControllerInitRequest<MultichainTransactionsControllerMessenger>
  >;

  beforeEach(() => {
    jest.resetAllMocks();
    const baseControllerMessenger = new ExtendedControllerMessenger();

    // Create controller init request mock
    initRequestMock = buildControllerInitRequestMock(baseControllerMessenger);
  });

  it('returns controller instance', () => {
    expect(
      multichainTransactionsControllerInit(initRequestMock).controller,
    ).toBeInstanceOf(MultichainTransactionsController);
  });

  it('controller state is default state when no initial state is passed in', () => {
    multichainTransactionsControllerInit(initRequestMock);
    const multichainTransactionsControllerState =
      multichainTransactionsControllerClassMock.mock.calls[0][0].state;

    // Check that the default state is used
    expect(multichainTransactionsControllerState).toBeUndefined();
  });

  it('controller state is initial state when initial state is passed in', () => {
    // Create initial state with the correct structure
    const initialMultichainTransactionsControllerState: MultichainTransactionsControllerState =
      {
        nonEvmTransactions: {
          [MOCK_SOLANA_ACCOUNT.id]: {
            transactions: [],
            next: null,
            lastUpdated: 0,
          },
        },
      };

    // Update mock with initial state
    initRequestMock.persistedState = {
      ...initRequestMock.persistedState,
      MultichainTransactionsController:
        initialMultichainTransactionsControllerState,
    };

    multichainTransactionsControllerInit(initRequestMock);
    const multichainTransactionsControllerState =
      multichainTransactionsControllerClassMock.mock.calls[0][0].state;

    // Check that the initial state is used
    expect(multichainTransactionsControllerState).toEqual(
      initialMultichainTransactionsControllerState,
    );
  });
});
