import { HostApplicationAdapter } from './host-application-adapter';

describe('HostApplicationAdapter', () => {
  let adapter: HostApplicationAdapter;

  beforeEach(() => {
    adapter = new HostApplicationAdapter();
  });

  it('dummy tests for scaffolding, will be replaced with real tests', () => {
    expect(adapter).toBeDefined();
    expect(
      adapter.showConnectionApproval('test-id', {
        name: 'test-dapp-name',
        url: 'test-dapp-url',
        icon: 'test-dapp-icon',
      }),
    ).resolves.not.toThrow();
    expect(() => adapter.showLoading()).not.toThrow();
    expect(() => adapter.hideLoading()).not.toThrow();
    expect(adapter.showOTPModal()).resolves.not.toThrow();
    expect(() => adapter.syncConnectionList([])).not.toThrow();
  });
});
