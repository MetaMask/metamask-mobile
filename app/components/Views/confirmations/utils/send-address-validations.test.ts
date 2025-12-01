// eslint-disable-next-line import/no-namespace
import * as ConfusablesUtils from '../../../../util/confusables';
import {
  getConfusableCharacterInfo,
  validateHexAddress,
  validateSolanaAddress,
  validateTronAddress,
} from './send-address-validations';
import { memoizedGetTokenStandardAndDetails, TokenDetailsERC20 } from './token';

jest.mock('./token', () => ({
  memoizedGetTokenStandardAndDetails: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      findNetworkClientIdByChainId: () => 'mainnet',
    },
  },
}));

const mockMemoizedGetTokenStandardAndDetails = jest.mocked(
  memoizedGetTokenStandardAndDetails,
);

describe('validateHexAddress', () => {
  it('returns error if address is burn address', async () => {
    expect(
      await validateHexAddress(
        '0x0000000000000000000000000000000000000000',
        '0x1',
      ),
    ).toStrictEqual({
      error: 'Invalid address',
    });
    expect(
      await validateHexAddress(
        '0x000000000000000000000000000000000000dead',
        '0x1',
      ),
    ).toStrictEqual({
      error: 'Invalid address',
    });
  });
  it('does not return error for valid evm address', async () => {
    expect(
      await validateHexAddress(
        '0xdB055877e6c13b6A6B25aBcAA29B393777dD0a73',
        '0x1',
      ),
    ).toStrictEqual({});
  });
  it('return error if address is contract address of asset', async () => {
    expect(
      await validateHexAddress(
        '0xdB055877e6c13b6A6B25aBcAA29B393777dD0a73',
        '0x1',
        '0xdB055877e6c13b6A6B25aBcAA29B393777dD0a73',
      ),
    ).toStrictEqual({
      error:
        "You are sending tokens to the token's contract address. This may result in the loss of these tokens.",
    });
  });
  it('returns warning if address is contract address', async () => {
    mockMemoizedGetTokenStandardAndDetails.mockResolvedValue({
      standard: 'ERC20',
    } as unknown as TokenDetailsERC20);
    expect(
      await validateHexAddress(
        '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
        '0x1',
      ),
    ).toStrictEqual({
      error:
        'This address is a token contract address. If you send tokens to this address, you will lose them.',
    });
  });
});

describe('validateSolanaAddress', () => {
  it('returns error if address is burn address', () => {
    expect(
      validateSolanaAddress('1nc1nerator11111111111111111111111111111111'),
    ).toStrictEqual({
      error: 'Invalid address',
    });
    expect(
      validateSolanaAddress('So11111111111111111111111111111111111111112'),
    ).toStrictEqual({
      error: 'Invalid address',
    });
  });
  it('returns error if send is of type solana and address is not solana address', () => {
    expect(
      validateSolanaAddress('0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477'),
    ).toStrictEqual({
      error: 'Invalid address',
    });
  });
  it('does not returns error if address is solana address', () => {
    expect(
      validateSolanaAddress('14grJpemFaf88c8tiVb77W7TYg2W3ir6pfkKz3YjhhZ5'),
    ).toStrictEqual({});
  });
});

describe('validateTronAddress', () => {
  it('returns error if address is not tron address', () => {
    expect(
      validateTronAddress('0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477'),
    ).toStrictEqual({
      error: 'Invalid address',
    });
  });

  it('does not returns error if address is solana address', () => {
    expect(
      validateTronAddress('TA9vN2KmER9cuVBaHxQjzzRtXnBCdF7D4u'),
    ).toStrictEqual({});
  });
});

describe('getConfusableCharacterInfo', () => {
  it('returns empty object if there is no error', async () => {
    expect(getConfusableCharacterInfo('test.eth')).toStrictEqual({});
  });

  it('returns warning for confusables', async () => {
    jest.spyOn(ConfusablesUtils, 'collectConfusables').mockReturnValue(['ⅼ']);
    expect(getConfusableCharacterInfo('test.eth')).toStrictEqual({
      warning:
        "We have detected a confusable character in the ENS name. Check the ENS name to avoid a potential scam. - 'ⅼ' is similar to 'l'",
    });
  });

  it('returns error and warning for confusables if it has hasZeroWidthPoints', async () => {
    jest.spyOn(ConfusablesUtils, 'collectConfusables').mockReturnValue(['ⅼ']);
    jest.spyOn(ConfusablesUtils, 'hasZeroWidthPoints').mockReturnValue(true);
    expect(getConfusableCharacterInfo('test.eth')).toStrictEqual({
      error: 'Invalid address',
      warning:
        'We detected an invisible character in the ENS name. Check the ENS name to avoid a potential scam.',
    });
  });
});
