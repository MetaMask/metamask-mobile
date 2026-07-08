import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getPreferencesControllerMessenger } from '../messengers/preferences-controller-messenger';
import { MessengerClientInitRequest } from '../types';
import { preferencesControllerInit } from './preferences-controller-init';
import {
  PreferencesController,
  PreferencesControllerMessenger,
} from '@metamask/preferences-controller';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { UserFeeLevel } from '@metamask/transaction-controller';
import type { PreferencesStateWithSavedGasFees } from './preferences-controller-types';

jest.mock('@metamask/preferences-controller');

function getInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<PreferencesControllerMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getPreferencesControllerMessenger(baseMessenger),
    initMessenger: undefined,
  };

  return requestMock;
}

describe('PreferencesControllerInit', () => {
  it('initializes the controller', () => {
    const { controller } = preferencesControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(PreferencesController);
  });

  it('passes the proper arguments to the controller', () => {
    preferencesControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(PreferencesController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: {
        displayNftMedia: true,
        ipfsGateway: 'https://dweb.link/ipfs/',
        securityAlertsEnabled: true,
        smartTransactionsOptInStatus: true,
        advancedGasFee: {},
        tokenSortConfig: {
          key: 'tokenFiatAmount',
          order: 'dsc',
          sortCallback: 'stringNumeric',
        },
        useNftDetection: true,
        useTokenDetection: true,
      },
    });
  });

  describe('setAdvancedGasFee', () => {
    const account = '0xABC0000000000000000000000000000000000A';
    const chainId = '0x1';

    function applyUpdate(
      controller: ReturnType<typeof preferencesControllerInit>['controller'],
      state: PreferencesStateWithSavedGasFees,
    ) {
      const updateMock = jest.mocked(controller.update);
      const callback = updateMock.mock.calls[
        updateMock.mock.calls.length - 1
      ][0] as (draftState: PreferencesStateWithSavedGasFees) => void;
      callback(state);
      return state;
    }

    it('saves gas fee preferences for the normalized account on the chain', () => {
      const { controller } = preferencesControllerInit(getInitRequestMock());
      const state: PreferencesStateWithSavedGasFees = {
        advancedGasFee: {},
      } as PreferencesStateWithSavedGasFees;

      controller.setAdvancedGasFee({
        account,
        chainId,
        gasFeePreferences: {
          userFeeLevel: UserFeeLevel.CUSTOM,
          maxBaseFee: '0x1',
          priorityFee: '0x2',
        },
      });

      applyUpdate(controller, state);

      expect(state.advancedGasFee).toStrictEqual({
        [chainId]: {
          [account.toLowerCase()]: {
            userFeeLevel: UserFeeLevel.CUSTOM,
            maxBaseFee: '0x1',
            priorityFee: '0x2',
          },
        },
      });
    });

    it('merges new preferences with existing preferences for other accounts on the chain', () => {
      const { controller } = preferencesControllerInit(getInitRequestMock());
      const otherAccount = '0xdef0000000000000000000000000000000000d';
      const state: PreferencesStateWithSavedGasFees = {
        advancedGasFee: {
          [chainId]: {
            [otherAccount]: {
              userFeeLevel: UserFeeLevel.CUSTOM,
              maxBaseFee: '0x5',
              priorityFee: '0x6',
            },
          },
        },
      } as PreferencesStateWithSavedGasFees;

      controller.setAdvancedGasFee({
        account,
        chainId,
        gasFeePreferences: {
          userFeeLevel: UserFeeLevel.CUSTOM,
          maxBaseFee: '0x1',
          priorityFee: '0x2',
        },
      });

      applyUpdate(controller, state);

      expect(state.advancedGasFee).toStrictEqual({
        [chainId]: {
          [otherAccount]: {
            userFeeLevel: UserFeeLevel.CUSTOM,
            maxBaseFee: '0x5',
            priorityFee: '0x6',
          },
          [account.toLowerCase()]: {
            userFeeLevel: UserFeeLevel.CUSTOM,
            maxBaseFee: '0x1',
            priorityFee: '0x2',
          },
        },
      });
    });

    it('removes the preference for the account when gasFeePreferences is undefined', () => {
      const { controller } = preferencesControllerInit(getInitRequestMock());
      const otherAccount = '0xdef0000000000000000000000000000000000d';
      const state: PreferencesStateWithSavedGasFees = {
        advancedGasFee: {
          [chainId]: {
            [account.toLowerCase()]: {
              userFeeLevel: UserFeeLevel.CUSTOM,
              maxBaseFee: '0x1',
              priorityFee: '0x2',
            },
            [otherAccount]: {
              userFeeLevel: UserFeeLevel.CUSTOM,
              maxBaseFee: '0x5',
              priorityFee: '0x6',
            },
          },
        },
      } as PreferencesStateWithSavedGasFees;

      controller.setAdvancedGasFee({
        account,
        chainId,
        gasFeePreferences: undefined,
      });

      applyUpdate(controller, state);

      expect(state.advancedGasFee).toStrictEqual({
        [chainId]: {
          [otherAccount]: {
            userFeeLevel: UserFeeLevel.CUSTOM,
            maxBaseFee: '0x5',
            priorityFee: '0x6',
          },
        },
      });
    });
  });
});
