import { getBlockaidMetricsParams } from '.';
import {
  Reason,
  ResultType,
  SecurityAlertResponse,
} from '../../components/UI/BlockaidBanner/BlockaidBanner.types';

describe('getBlockaidMetricsParams', () => {
  it('should return empty object when securityAlertResponse is not defined', () => {
    const result = getBlockaidMetricsParams(undefined);
    expect(result).toStrictEqual({});
  });

  it('should return additionalParams object when securityAlertResponse defined', () => {
    const securityAlertResponse: SecurityAlertResponse = {
      resultType: ResultType.Malicious,
      reason: Reason.notApplicable,
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
      ppom_eth_call_count: 5,
      ppom_eth_getCode_count: 3,
    });
  });
});
