import {
  SecurityAlertResponse,
  TransactionStatus,
} from '@metamask/transaction-controller';

import {
  Reason,
  ResultType,
  SecurityAlertSource,
} from '../../components/Views/confirmations/components/blockaid-banner/BlockaidBanner.types';
// eslint-disable-next-line import/no-namespace
import * as NetworkControllerMock from '../../selectors/networkController';
import { NETWORKS_CHAIN_ID } from '../../constants/network';
import Engine from '../../core/Engine';

import {
  getBlockaidMetricsParams,
  getBlockaidTransactionMetricsParams,
  isBlockaidFeatureEnabled,
  TransactionType,
} from '.';

jest.mock('../../core/Engine', () => ({
  resetState: jest.fn(),
  context: {
    PreferencesController: {
      state: {
        securityAlertsEnabled: true,
      },
    },
  },
}));

describe('Blockaid util', () => {
  describe('getBlockaidTransactionMetricsParams', () => {
    beforeEach(() => {
      jest
        .spyOn(NetworkControllerMock, 'selectEvmChainId')
        .mockReturnValue(NETWORKS_CHAIN_ID.MAINNET);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('returns empty object when transaction id does not match security response id', async () => {
      const transaction: TransactionType = {
        status: TransactionStatus.failed,
        error: new Error('Simulated transaction error'),
        id: '1',
        chainId: '0x1',
        networkClientId: 'testNetworkClientId',
        time: Date.now(),
        txParams: {
          from: '0x1',
        },
        securityAlertResponses: {
          2: {
            result_type: ResultType.Malicious,
            reason: Reason.notApplicable,
            providerRequestsCount: {
              eth_call: 5,
              eth_getCode: 3,
            },
            features: [],
          },
        },
      };
      const result = getBlockaidTransactionMetricsParams(
        transaction as unknown as TransactionType,
      );
      expect(result).toStrictEqual({});
    });

    it('returns metrics params object when transaction id matches security response id', async () => {
      const transaction: TransactionType = {
        status: TransactionStatus.failed,
        error: new Error('Simulated transaction error'),
        id: '1',
        chainId: '0x1',
        networkClientId: 'testNetworkClientId',
        time: Date.now(),
        txParams: {
          from: '0x1',
        },
        securityAlertResponses: {
          1: {
            result_type: ResultType.Malicious,
            reason: Reason.notApplicable,
            providerRequestsCount: {
              eth_call: 5,
              eth_getCode: 3,
            },
            features: [],
          },
        },
      };

      const result = getBlockaidTransactionMetricsParams(
        transaction as unknown as TransactionType,
      );
      expect(result).toEqual({
        ui_customizations: ['flagged_as_malicious'],
        security_alert_response: ResultType.Malicious,
        security_alert_reason: Reason.notApplicable,
        ppom_eth_call_count: 5,
        ppom_eth_getCode_count: 3,
      });
    });
  });

  describe('getBlockaidMetricsParams', () => {
    beforeEach(() => {
      jest
        .spyOn(NetworkControllerMock, 'selectEvmChainId')
        .mockReturnValue(NETWORKS_CHAIN_ID.MAINNET);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('returns empty object when securityAlertResponse is not defined', async () => {
      const result = getBlockaidMetricsParams(undefined);
      expect(result).toStrictEqual({});
    });

    it('returns empty object when chain id is not in supported chain ids list', async () => {
      jest
        .spyOn(NetworkControllerMock, 'selectEvmChainId')
        .mockReturnValue('0x10');
      const result = getBlockaidMetricsParams(undefined);
      expect(result).toStrictEqual({});
    });

    it('should return additionalParams object when securityAlertResponse is defined', async () => {
      const securityAlertResponse: SecurityAlertResponse & { source: string } =
        {
          result_type: ResultType.Malicious,
          reason: Reason.notApplicable,
          source: SecurityAlertSource.API,
          providerRequestsCount: {
            eth_call: 5,
            eth_getCode: 3,
          },
          features: [],
        };

      const result = getBlockaidMetricsParams(securityAlertResponse);
      expect(result).toEqual({
        ui_customizations: ['flagged_as_malicious'],
        security_alert_response: ResultType.Malicious,
        security_alert_reason: Reason.notApplicable,
        security_alert_source: SecurityAlertSource.API,
        ppom_eth_call_count: 5,
        ppom_eth_getCode_count: 3,
      });
    });

    it('should not return eth call counts if providerRequestsCount is empty', async () => {
      const securityAlertResponse: SecurityAlertResponse = {
        result_type: ResultType.Malicious,
        reason: Reason.notApplicable,
        features: [],
        providerRequestsCount: {},
      };

      const result = getBlockaidMetricsParams(securityAlertResponse);
      expect(result).toEqual({
        ui_customizations: ['flagged_as_malicious'],
        security_alert_response: ResultType.Malicious,
        security_alert_reason: Reason.notApplicable,
      });
    });

    it('should not return eth call counts if providerRequestsCount is undefined', async () => {
      const securityAlertResponse: SecurityAlertResponse = {
        result_type: ResultType.Malicious,
        reason: Reason.notApplicable,
        features: [],
        providerRequestsCount: undefined,
      };

      const result = getBlockaidMetricsParams(securityAlertResponse);
      expect(result).toEqual({
        ui_customizations: ['flagged_as_malicious'],
        security_alert_response: ResultType.Malicious,
        security_alert_reason: Reason.notApplicable,
      });
    });

    it('should return additionalParams object when result_type is RequestInProgress', async () => {
      const securityAlertResponse: SecurityAlertResponse & { source: string } =
        {
          result_type: ResultType.RequestInProgress,
          reason: Reason.notApplicable,
          source: SecurityAlertSource.API,
          providerRequestsCount: {
            eth_call: 5,
            eth_getCode: 3,
          },
          features: [],
        };

      const result = getBlockaidMetricsParams(securityAlertResponse);
      expect(result).toEqual({
        ui_customizations: ['security_alert_loading'],
        security_alert_response: 'loading',
        security_alert_reason: Reason.notApplicable,
        security_alert_source: SecurityAlertSource.API,
        ppom_eth_call_count: 5,
        ppom_eth_getCode_count: 3,
      });
    });
  });

  describe('isBlockaidFeatureEnabled', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('return true if blockaid is supported on current network and its enabled by the user', async () => {
      jest
        .spyOn(NetworkControllerMock, 'selectEvmChainId')
        .mockReturnValue(NETWORKS_CHAIN_ID.MAINNET);
      const result = await isBlockaidFeatureEnabled();
      expect(result).toEqual(true);
    });

    it('return false if blockaid is not supported on current network', async () => {
      Engine.context.PreferencesController.state.securityAlertsEnabled = false;

      jest
        .spyOn(NetworkControllerMock, 'selectEvmChainId')
        .mockReturnValue('0x9');

      const result = await isBlockaidFeatureEnabled();
      expect(result).toEqual(false);
    });

    it('return false if blockaid is not enabled by the user', async () => {
      jest
        .spyOn(NetworkControllerMock, 'selectEvmChainId')
        .mockReturnValue(NETWORKS_CHAIN_ID.MAINNET);
      Engine.context.PreferencesController.state.securityAlertsEnabled = false;
      const result = await isBlockaidFeatureEnabled();
      expect(result).toEqual(false);
    });
  });
});
