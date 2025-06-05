import { useDepositSDK } from '../sdk';

jest.mock('../sdk', () => ({
  useDepositSDK: jest.fn(),
}));

describe('useDepositSdkMethod', () => {
  const mockSdk = {
    sdk: {
      sendUserOtp: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useDepositSDK as jest.Mock).mockReturnValue(mockSdk);
  });

  // TODO: Implement tests for useDepositSdkMethod hook
  it('should be true', () => {
    expect(true).toBe(true);
  });
});
