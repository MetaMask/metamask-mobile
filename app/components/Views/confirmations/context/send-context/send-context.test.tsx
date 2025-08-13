import { useSendContext } from './send-context';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: jest.fn(),
    navigate: jest.fn(),
  }),
  useRoute: jest.fn().mockReturnValue({
    params: {
      asset: {
        chainId: '0x1',
        name: 'Ethereum',
        address: '0x123',
      },
    },
  }),
}));

describe('useSendContext', () => {
  it('should throw error is not wrapped in SendContext', () => {
    expect(() => {
      useSendContext();
    }).toThrow();
  });
});
