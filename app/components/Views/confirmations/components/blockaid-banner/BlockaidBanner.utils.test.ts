import { strings } from '../../../../../../locales/i18n';
import { Reason } from './BlockaidBanner.types';
import {
  getBlockaidBannerDescription,
  getBlockaidBannerTitle,
  getBlockaidConfirmModalMessage,
} from './BlockaidBanner.utils';

const UNMAPPED_REASON = 'some_new_reason_from_the_provider' as Reason;
const AMOUNT = '$1,234.56';

describe('BlockaidBanner.utils', () => {
  describe('getBlockaidBannerTitle', () => {
    it.each`
      reason                             | expectedKey
      ${Reason.approvalFarming}          | ${'blockaid_banner.high_risk_approval_title'}
      ${Reason.permitFarming}            | ${'blockaid_banner.high_risk_approval_title'}
      ${Reason.setApprovalForAllFarming} | ${'blockaid_banner.high_risk_approval_title'}
      ${Reason.seaportFarming}           | ${'blockaid_banner.high_risk_approval_title'}
      ${Reason.blurFarming}              | ${'blockaid_banner.high_risk_approval_title'}
      ${Reason.transferFarming}          | ${'blockaid_banner.high_risk_transfer_title'}
      ${Reason.transferFromFarming}      | ${'blockaid_banner.high_risk_transfer_title'}
      ${Reason.rawNativeTokenTransfer}   | ${'blockaid_banner.high_risk_transfer_title'}
      ${Reason.rawSignatureFarming}      | ${'blockaid_banner.high_risk_signature_title'}
      ${Reason.tradeOrderFarming}        | ${'blockaid_banner.high_risk_signature_title'}
      ${Reason.maliciousDomain}          | ${'blockaid_banner.site_flagged_unsafe_title'}
      ${Reason.other}                    | ${'blockaid_banner.risk_signals_detected_title'}
      ${Reason.failed}                   | ${'blockaid_banner.failed_title'}
    `('returns the mapped title for $reason', ({ reason, expectedKey }) => {
      expect(getBlockaidBannerTitle(reason)).toBe(strings(expectedKey));
    });

    it('falls back to the risk signals title for an unmapped reason', () => {
      expect(getBlockaidBannerTitle(UNMAPPED_REASON)).toBe(
        strings('blockaid_banner.risk_signals_detected_title'),
      );
    });
  });

  describe('getBlockaidBannerDescription', () => {
    it.each`
      reason                             | expectedKey
      ${Reason.approvalFarming}          | ${'blockaid_banner.approval_farming_description'}
      ${Reason.permitFarming}            | ${'blockaid_banner.approval_farming_description'}
      ${Reason.setApprovalForAllFarming} | ${'blockaid_banner.approval_farming_description'}
      ${Reason.transferFarming}          | ${'blockaid_banner.transfer_farming_description'}
      ${Reason.transferFromFarming}      | ${'blockaid_banner.transfer_farming_description'}
      ${Reason.rawNativeTokenTransfer}   | ${'blockaid_banner.transfer_farming_description'}
      ${Reason.maliciousDomain}          | ${'blockaid_banner.malicious_domain_description'}
      ${Reason.rawSignatureFarming}      | ${'blockaid_banner.high_risk_signature_description'}
      ${Reason.tradeOrderFarming}        | ${'blockaid_banner.high_risk_signature_description'}
      ${Reason.other}                    | ${'blockaid_banner.other_description'}
      ${Reason.failed}                   | ${'blockaid_banner.failed_description'}
    `(
      'returns the amount-less description for $reason',
      ({ reason, expectedKey }) => {
        expect(getBlockaidBannerDescription(reason)).toBe(strings(expectedKey));
      },
    );

    it('falls back to the generic description for an unmapped reason', () => {
      expect(getBlockaidBannerDescription(UNMAPPED_REASON)).toBe(
        strings('blockaid_banner.other_description'),
      );
    });

    it.each`
      reason                   | marketplace
      ${Reason.seaportFarming} | ${'OpenSea'}
      ${Reason.blurFarming}    | ${'Blur'}
    `('names the $marketplace marketplace', ({ reason, marketplace }) => {
      expect(getBlockaidBannerDescription(reason)).toBe(
        strings('blockaid_banner.marketplace_farming_description', {
          marketplace,
        }),
      );
    });

    it('keeps the marketplace name when an amount is also available', () => {
      expect(getBlockaidBannerDescription(Reason.seaportFarming, AMOUNT)).toBe(
        strings('blockaid_banner.marketplace_farming_description', {
          marketplace: 'OpenSea',
        }),
      );
    });

    it.each`
      reason                           | expectedKey
      ${Reason.transferFarming}        | ${'blockaid_banner.transfer_farming_description_with_amount'}
      ${Reason.transferFromFarming}    | ${'blockaid_banner.transfer_farming_description_with_amount'}
      ${Reason.rawNativeTokenTransfer} | ${'blockaid_banner.transfer_farming_description_with_amount'}
      ${Reason.maliciousDomain}        | ${'blockaid_banner.malicious_domain_description_with_amount'}
    `(
      'injects the amount into the description for $reason',
      ({ reason, expectedKey }) => {
        const description = getBlockaidBannerDescription(reason, AMOUNT);

        expect(description).toBe(strings(expectedKey, { amount: AMOUNT }));
        expect(description).toContain(AMOUNT);
      },
    );

    it('ignores the amount for reasons without an amount variant', () => {
      expect(getBlockaidBannerDescription(Reason.approvalFarming, AMOUNT)).toBe(
        strings('blockaid_banner.approval_farming_description'),
      );
    });

    it('uses the amount-less description when the amount is null', () => {
      expect(getBlockaidBannerDescription(Reason.transferFarming, null)).toBe(
        strings('blockaid_banner.transfer_farming_description'),
      );
    });
  });

  describe('getBlockaidConfirmModalMessage', () => {
    it.each`
      reason                             | requestTypeKey
      ${Reason.approvalFarming}          | ${'blockaid_banner.request_type.approval'}
      ${Reason.permitFarming}            | ${'blockaid_banner.request_type.approval'}
      ${Reason.setApprovalForAllFarming} | ${'blockaid_banner.request_type.approval'}
      ${Reason.seaportFarming}           | ${'blockaid_banner.request_type.approval'}
      ${Reason.blurFarming}              | ${'blockaid_banner.request_type.approval'}
      ${Reason.transferFarming}          | ${'blockaid_banner.request_type.transfer'}
      ${Reason.transferFromFarming}      | ${'blockaid_banner.request_type.transfer'}
      ${Reason.rawNativeTokenTransfer}   | ${'blockaid_banner.request_type.transfer'}
      ${Reason.rawSignatureFarming}      | ${'blockaid_banner.request_type.signature'}
      ${Reason.tradeOrderFarming}        | ${'blockaid_banner.request_type.signature'}
      ${Reason.maliciousDomain}          | ${'blockaid_banner.request_type.request'}
      ${Reason.other}                    | ${'blockaid_banner.request_type.request'}
    `(
      'composes the message with the request type for $reason',
      ({ reason, requestTypeKey }) => {
        expect(getBlockaidConfirmModalMessage(reason)).toBe(
          strings('alert_system.confirm_modal.blockaid_message', {
            requestType: strings(requestTypeKey),
          }),
        );
      },
    );

    it('falls back to the generic request noun for an unmapped reason', () => {
      expect(getBlockaidConfirmModalMessage(UNMAPPED_REASON)).toBe(
        strings('alert_system.confirm_modal.blockaid_message', {
          requestType: strings('blockaid_banner.request_type.request'),
        }),
      );
    });

    it('injects the amount alongside the request type', () => {
      const message = getBlockaidConfirmModalMessage(
        Reason.transferFarming,
        AMOUNT,
      );

      expect(message).toBe(
        strings('alert_system.confirm_modal.blockaid_message_with_amount', {
          requestType: strings('blockaid_banner.request_type.transfer'),
          amount: AMOUNT,
        }),
      );
      expect(message).toContain(AMOUNT);
    });

    it('uses the amount-less message when the amount is null', () => {
      expect(getBlockaidConfirmModalMessage(Reason.transferFarming, null)).toBe(
        strings('alert_system.confirm_modal.blockaid_message', {
          requestType: strings('blockaid_banner.request_type.transfer'),
        }),
      );
    });
  });
});
