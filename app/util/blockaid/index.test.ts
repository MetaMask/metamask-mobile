import {
  Reason,
  ResultType,
  SecurityAlertResponse,
  SecurityAlertSource,
} from '../../components/Views/confirmations/components/BlockaidBanner/BlockaidBanner.types';
// eslint-disable-next-line import/no-namespace
import * as NetworkControllerMock from '../../selectors/networkController';
import { NETWORKS_CHAIN_ID } from '../../constants/network';

import {
  getBlockaidMetricsParams,
  isBlockaidSupportedOnCurrentChain,
  getBlockaidTransactionMetricsParams,
  TransactionType,
} from '.';
import { TransactionStatus } from '@metamask/transaction-controller';

describe('Blockaid util', () => {
  describe('getBlockaidTransactionMetricsParams', () => {
    beforeEach(() => {
      jest
        .spyOn(NetworkControllerMock, 'selectChainId')
        .mockReturnValue(NETWORKS_CHAIN_ID.MAINNET);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('returns empty object when transaction id does not match security response id', () => {
      const transaction: TransactionType = {
        id: '1',
        status: TransactionStatus.approved,
        time: 0,
        chainId: '0x1',
        txParams: {
          to: '0x',
          from: '0x',
        },
        currentTransactionSecurityAlertResponse: {
          id: '2',
          response: {
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
      const result = getBlockaidTransactionMetricsParams(transaction);
      expect(result).toStrictEqual({});
    });

    it('returns metrics params object when transaction id matches security response id', () => {
      const transaction: TransactionType = {
        id: '1',
        status: TransactionStatus.approved,
        time: 0,
        chainId: '0x1',
        txParams: {
          to: '0x',
          from: '0x',
        },
        currentTransactionSecurityAlertResponse: {
          id: '1',
          response: {
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

      const result = getBlockaidTransactionMetricsParams(transaction);
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
        .spyOn(NetworkControllerMock, 'selectChainId')
        .mockReturnValue(NETWORKS_CHAIN_ID.MAINNET);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('returns empty object when securityAlertResponse is not defined', () => {
      const result = getBlockaidMetricsParams(undefined);
      expect(result).toStrictEqual({});
    });

    it('returns empty object when chain id is not in supported chain ids list', () => {
      jest
        .spyOn(NetworkControllerMock, 'selectChainId')
        .mockReturnValue('0x10');
      const result = getBlockaidMetricsParams(undefined);
      expect(result).toStrictEqual({});
    });

    it('should return additionalParams object when securityAlertResponse is defined', () => {
      const securityAlertResponse: SecurityAlertResponse = {
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

    it('should not return eth call counts if providerRequestsCount is empty', () => {
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

    it('should not return eth call counts if providerRequestsCount is undefined', () => {
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
  });

  describe('isBlockaidSupportedOnCurrentChain', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('return true if blockaid is supported on current network', () => {
      jest
        .spyOn(NetworkControllerMock, 'selectChainId')
        .mockReturnValue(NETWORKS_CHAIN_ID.MAINNET);
      const result = isBlockaidSupportedOnCurrentChain();
      expect(result).toEqual(true);
    });

    it('return false if blockaid is not on current network', () => {
      jest
        .spyOn(NetworkControllerMock, 'selectChainId')
        .mockReturnValue(NETWORKS_CHAIN_ID.GOERLI);
      const result = isBlockaidSupportedOnCurrentChain();
      expect(result).toEqual(false);
    });
  });
});
