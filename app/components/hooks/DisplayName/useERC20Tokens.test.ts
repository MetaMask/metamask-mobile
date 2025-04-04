import { CHAIN_IDS } from '@metamask/transaction-controller';
import { NameType } from '../../UI/Name/Name.types';
import { useERC20Tokens } from './useERC20Tokens';
import { renderHookWithProvider } from '../../../util/test/renderWithProvider';

const TOKEN_NAME_MOCK = 'Test Token';
const TOKEN_SYMBOL_MOCK = 'TT';
const TOKEN_ICON_URL_MOCK = 'https://example.com/icon.png';
const TOKEN_ADDRESS_MOCK = '0x0439e60F02a8900a951603950d8D4527f400C3f1';
const UNKNOWN_ADDRESS_MOCK = '0xabc123';

const STATE_MOCK = {
  engine: {
    backgroundState: {
      TokenListController: {
        tokensChainsCache: {
          [CHAIN_IDS.MAINNET]: {
            data: {
              [TOKEN_ADDRESS_MOCK.toLowerCase()]: {
                name: TOKEN_NAME_MOCK,
                symbol: TOKEN_SYMBOL_MOCK,
                iconUrl: TOKEN_ICON_URL_MOCK,
              },
            },
          },
        },
      },
    },
  },
};

describe('useERC20Tokens', () => {
  it('returns undefined if no token found', () => {
    const {
      result: { current },
    } = renderHookWithProvider(
      () =>
        useERC20Tokens([
          {
            type: NameType.EthereumAddress,
            value: UNKNOWN_ADDRESS_MOCK,
            variation: CHAIN_IDS.MAINNET,
          },
        ]),
      { state: STATE_MOCK },
    );

    expect(current[0]?.name).toBe(undefined);
  });

  it('returns name if found', () => {
    const {
      result: { current },
    } = renderHookWithProvider(
      () =>
        useERC20Tokens([
          {
            type: NameType.EthereumAddress,
            value: TOKEN_ADDRESS_MOCK,
            variation: CHAIN_IDS.MAINNET,
          },
        ]),
      { state: STATE_MOCK },
    );

    expect(current[0]?.name).toBe(TOKEN_NAME_MOCK);
  });

  it('returns symbol if preferred', () => {
    const {
      result: { current },
    } = renderHookWithProvider(
      () =>
        useERC20Tokens([
          {
            preferContractSymbol: true,
            type: NameType.EthereumAddress,
            value: TOKEN_ADDRESS_MOCK,
            variation: CHAIN_IDS.MAINNET,
          },
        ]),
      { state: STATE_MOCK },
    );

    expect(current[0]?.name).toBe(TOKEN_SYMBOL_MOCK);
  });

  it('returns image', () => {
    const {
      result: { current },
    } = renderHookWithProvider(
      () =>
        useERC20Tokens([
          {
            preferContractSymbol: true,
            type: NameType.EthereumAddress,
            value: TOKEN_ADDRESS_MOCK,
            variation: CHAIN_IDS.MAINNET,
          },
        ]),
      { state: STATE_MOCK },
    );

    expect(current[0]?.image).toBe(TOKEN_ICON_URL_MOCK);
  });

  it('returns null if type is not address', () => {
    const {
      result: { current },
    } = renderHookWithProvider(
      () =>
        useERC20Tokens([
          {
            type: 'alternateType' as NameType,
            value: TOKEN_ADDRESS_MOCK,
            variation: CHAIN_IDS.MAINNET,
          },
        ]),
      { state: STATE_MOCK },
    );

    expect(current[0]?.name).toBeUndefined();
  });

  it('normalizes addresses to lowercase', () => {
    const {
      result: { current },
    } = renderHookWithProvider(
      () =>
        useERC20Tokens([
          {
            type: NameType.EthereumAddress,
            value: TOKEN_ADDRESS_MOCK.toUpperCase(),
            variation: CHAIN_IDS.MAINNET,
          },
        ]),
      { state: STATE_MOCK },
    );

    expect(current[0]?.name).toBe(TOKEN_NAME_MOCK);
  });
});
