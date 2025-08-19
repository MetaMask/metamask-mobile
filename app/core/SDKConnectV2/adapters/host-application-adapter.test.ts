import { HostApplicationAdapter } from './host-application-adapter';

describe('HostApplicationAdapter', () => {
  let adapter: HostApplicationAdapter;

  beforeEach(() => {
    adapter = new HostApplicationAdapter();
  });

  describe('dummy tests for scaffolding, will be replaced with real tests', () => {
    it('should be defined', () => {
      expect(adapter).toBeDefined();
    });

    it('should show connection approval', () => {
      expect(adapter.showConnectionApproval).toBeDefined();
    });

    it('should show loading', () => {
      expect(adapter.showLoading).toBeDefined();
    });

    it('should hide loading', () => {
      expect(adapter.hideLoading).toBeDefined();
    });

    it('should show OTP modal', () => {
      expect(adapter.showOTPModal).toBeDefined();
    });

    it('should sync connection list', () => {
      expect(adapter.syncConnectionList).toBeDefined();
    });
  });
});
