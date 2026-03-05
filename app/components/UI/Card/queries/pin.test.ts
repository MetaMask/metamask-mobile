import { CardSDK } from '../sdk/CardSDK';
import { pinKeys, pinTokenMutationFn } from './pin';

describe('pinKeys', () => {
  it('returns the base key for all pin queries', () => {
    expect(pinKeys.all()).toEqual(['card', 'pin']);
  });

  it('returns the token mutation key', () => {
    expect(pinKeys.token()).toEqual(['card', 'pin', 'token']);
  });
});

describe('pinTokenMutationFn', () => {
  const mockSdk = {
    generateCardPinToken: jest.fn(),
  } as unknown as CardSDK;

  it('calls sdk.generateCardPinToken with request', async () => {
    const mockResponse = {
      token: 'test-token-uuid',
      imageUrl: 'https://cards.baanx.com/details-image?token=test-token-uuid',
    };
    (mockSdk.generateCardPinToken as jest.Mock).mockResolvedValue(mockResponse);

    const mutationFn = pinTokenMutationFn(mockSdk);
    const result = await mutationFn({
      customCss: { backgroundColor: '#FFFFFF', textColor: '#000000' },
    });

    expect(mockSdk.generateCardPinToken).toHaveBeenCalledWith({
      customCss: { backgroundColor: '#FFFFFF', textColor: '#000000' },
    });
    expect(result).toEqual(mockResponse);
  });

  it('calls sdk.generateCardPinToken without request', async () => {
    const mockResponse = {
      token: 'test-token-uuid',
      imageUrl: 'https://cards.baanx.com/details-image?token=test-token-uuid',
    };
    (mockSdk.generateCardPinToken as jest.Mock).mockResolvedValue(mockResponse);

    const mutationFn = pinTokenMutationFn(mockSdk);
    const result = await mutationFn();

    expect(mockSdk.generateCardPinToken).toHaveBeenCalledWith(undefined);
    expect(result).toEqual(mockResponse);
  });

  it('throws when sdk is null', async () => {
    const mutationFn = pinTokenMutationFn(null);

    await expect(mutationFn()).rejects.toThrow('CardSDK not available');
  });
});
