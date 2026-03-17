import Routes from '../../../constants/navigation/Routes';

describe('TokenListRoutes configuration', () => {
  describe('route configuration', () => {
    it('contains TOKEN_SELECTION route', () => {
      expect(Routes.RAMP.TOKEN_SELECTION).toBeDefined();
    });

    it('contains AMOUNT_INPUT route', () => {
      expect(Routes.RAMP.AMOUNT_INPUT).toBeDefined();
    });

    it('contains CHECKOUT route', () => {
      expect(Routes.RAMP.CHECKOUT).toBeDefined();
    });

    it('contains native flow routes', () => {
      expect(Routes.RAMP.ENTER_EMAIL).toBeDefined();
      expect(Routes.RAMP.OTP_CODE).toBeDefined();
      expect(Routes.RAMP.BASIC_INFO).toBeDefined();
      expect(Routes.RAMP.ENTER_ADDRESS).toBeDefined();
      expect(Routes.RAMP.VERIFY_IDENTITY).toBeDefined();
      expect(Routes.RAMP.BANK_DETAILS).toBeDefined();
      expect(Routes.RAMP.ORDER_PROCESSING).toBeDefined();
      expect(Routes.RAMP.KYC_PROCESSING).toBeDefined();
      expect(Routes.RAMP.ADDITIONAL_VERIFICATION).toBeDefined();
    });

    it('contains modal routes', () => {
      expect(Routes.RAMP.MODALS.UNSUPPORTED_TOKEN).toBeDefined();
      expect(Routes.RAMP.MODALS.BUILD_QUOTE_SETTINGS).toBeDefined();
      expect(Routes.RAMP.MODALS.PAYMENT_SELECTION).toBeDefined();
      expect(Routes.RAMP.MODALS.TOKEN_NOT_AVAILABLE).toBeDefined();
      expect(Routes.RAMP.MODALS.PROVIDER_SELECTION).toBeDefined();
      expect(Routes.RAMP.MODALS.ERROR_DETAILS).toBeDefined();
      expect(Routes.RAMP.MODALS.PROCESSING_INFO).toBeDefined();
      expect(Routes.RAMP.MODALS.SSN_INFO).toBeDefined();
    });

    it('contains RAMPS_ORDER_DETAILS route', () => {
      expect(Routes.RAMP.RAMPS_ORDER_DETAILS).toBeDefined();
    });

    it('contains MODALS.ID route', () => {
      expect(Routes.RAMP.MODALS.ID).toBeDefined();
    });
  });
});
