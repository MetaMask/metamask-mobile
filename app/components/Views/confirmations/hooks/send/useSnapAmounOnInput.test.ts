import { InternalAccount } from '@metamask/keyring-internal-api';
import { CaipAssetType } from '@metamask/utils';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
// eslint-disable-next-line import-x/no-namespace
import * as TronSnap from '../../../../../core/Multichain/tron';
// eslint-disable-next-line import-x/no-namespace
import * as SendContext from '../../context/send-context/send-context';
// eslint-disable-next-line import-x/no-namespace
import * as MultichainSnaps from '../../utils/multichain-snaps';
import { useSnapAmountOnInput } from './useSnapAmountOnInput';

const MOCK_ACCOUNT: InternalAccount = {
  id: '80c14733-13cc-4966-bf1a-6212a6409c22',
  address: '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc',
  type: 'eip155:eoa',
  options: {},
  methods: [],
  metadata: {
    name: 'Test Account',
    keyring: { type: 'HD Key Tree' },
    snap: { id: 'npm:@metamask/test-snap', enabled: true },
  },
  scopes: [],
} as unknown as InternalAccount;

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: () => ({}),
}));

const TRON_RECIPIENT = 'TK3xRFq22eEiATz6kfamDeAAQrPdfdGPeq';

const TRON_ASSET = {
  assetId: 'tron:728126428/slip44:195' as CaipAssetType,
  chainId: 'tron:728126428',
  decimals: 6,
  symbol: 'TRX',
  isNative: true,
};

const MOCK_ASSET = {
  assetId: 'eip155:11155111/slip44:60' as CaipAssetType,
  address: '0x0000000000000000000000000000000000000000',
  chainId: 5,
  decimals: 18,
  name: 'Ether',
  symbol: 'ETH',
  isNative: true,
};

describe('useSnapAmountOnInput', () => {
  let validateAmountMultichainMock: jest.SpyInstance;

  beforeEach(() => {
    validateAmountMultichainMock = jest
      .spyOn(MultichainSnaps, 'validateAmountMultichain')
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('forwards the recipient to the Tron Snap for Tron sends', async () => {
    const validateTronTransferAmountMock = jest
      .spyOn(TronSnap, 'validateTronTransferAmount')
      .mockResolvedValue({ valid: true, errors: [] });
    jest.spyOn(SendContext, 'useSendContext').mockReturnValue({
      asset: TRON_ASSET,
      chainId: TRON_ASSET.chainId,
      fromAccount: MOCK_ACCOUNT,
      to: TRON_RECIPIENT,
      value: '1',
    } as unknown as SendContext.SendContextType);

    const { result } = renderHookWithProvider(() => useSnapAmountOnInput());
    await result.current.validateAmountWithSnap('2');

    expect(validateTronTransferAmountMock).toHaveBeenCalledWith(MOCK_ACCOUNT, {
      accountId: MOCK_ACCOUNT.id,
      assetId: TRON_ASSET.assetId,
      value: '2',
      toAddress: TRON_RECIPIENT,
    });
    expect(validateAmountMultichainMock).not.toHaveBeenCalled();
  });

  it('defers the Tron fee check while the recipient is unknown', async () => {
    const validateTronTransferAmountMock = jest.spyOn(
      TronSnap,
      'validateTronTransferAmount',
    );
    jest.spyOn(SendContext, 'useSendContext').mockReturnValue({
      asset: TRON_ASSET,
      chainId: TRON_ASSET.chainId,
      fromAccount: MOCK_ACCOUNT,
      value: '1',
    } as unknown as SendContext.SendContextType);

    const { result } = renderHookWithProvider(() => useSnapAmountOnInput());
    const validationResult = await result.current.validateAmountWithSnap('2');

    expect(validationResult).toEqual({ valid: true, errors: [] });
    expect(validateTronTransferAmountMock).not.toHaveBeenCalled();
    expect(validateAmountMultichainMock).not.toHaveBeenCalled();
  });

  it('returns validateAmountWithSnap function', () => {
    jest.spyOn(SendContext, 'useSendContext').mockReturnValue({
      asset: MOCK_ASSET,
      fromAccount: MOCK_ACCOUNT,
      value: '1.5',
    } as unknown as SendContext.SendContextType);

    const { result } = renderHookWithProvider(() => useSnapAmountOnInput());

    expect(result.current.validateAmountWithSnap).toBeDefined();
    expect(typeof result.current.validateAmountWithSnap).toBe('function');
  });

  it('calls validateAmountMultichain with correct parameters', async () => {
    jest.spyOn(SendContext, 'useSendContext').mockReturnValue({
      asset: MOCK_ASSET,
      fromAccount: MOCK_ACCOUNT,
      value: '1.5',
    } as unknown as SendContext.SendContextType);

    const { result } = renderHookWithProvider(() => useSnapAmountOnInput());
    await result.current.validateAmountWithSnap('2.5');

    expect(validateAmountMultichainMock).toHaveBeenCalledWith(MOCK_ACCOUNT, {
      value: '2.5',
      accountId: MOCK_ACCOUNT.id,
      assetId: MOCK_ASSET.assetId,
    });
  });

  it('returns validation result from validateAmountMultichain', async () => {
    const mockValidationResult = { error: 'Insufficient balance' };
    validateAmountMultichainMock.mockResolvedValue(mockValidationResult);

    jest.spyOn(SendContext, 'useSendContext').mockReturnValue({
      asset: MOCK_ASSET,
      fromAccount: MOCK_ACCOUNT,
      value: '1.5',
    } as unknown as SendContext.SendContextType);

    const { result } = renderHookWithProvider(() => useSnapAmountOnInput());
    const validationResult = await result.current.validateAmountWithSnap('10');

    expect(validationResult).toEqual(mockValidationResult);
  });

  it('returns undefined when validation passes', async () => {
    validateAmountMultichainMock.mockResolvedValue(undefined);

    jest.spyOn(SendContext, 'useSendContext').mockReturnValue({
      asset: MOCK_ASSET,
      fromAccount: MOCK_ACCOUNT,
      value: '1.5',
    } as unknown as SendContext.SendContextType);

    const { result } = renderHookWithProvider(() => useSnapAmountOnInput());
    const validationResult = await result.current.validateAmountWithSnap('0.5');

    expect(validationResult).toBeUndefined();
  });
});
