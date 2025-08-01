import { useSendContext } from './send-context';

describe('useSendContext', () => {
  it('should throw error is not wrapped in SendContext', () => {
    expect(() => {
      useSendContext();
    }).toThrow();
  });
});
