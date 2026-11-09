import { IconName } from '@metamask/design-system-react-native';
import { resolveIconType, resolveTransactionIconName } from './resolveIconType';

describe('resolveIconType', () => {
  it.each([
    'predictionSettled',
    'predictionClaimWinnings',
    'predictionCashedOut',
  ] as const)('maps %s to the receive family', (kind) => {
    expect(resolveIconType(kind)).toBe('receive');
    expect(resolveTransactionIconName(kind)).toBe(IconName.Received);
  });
});
