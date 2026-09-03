import { Alert } from 'react-native';
import { SolScope } from '@metamask/keyring-api';

import handleSolanaUrl, { buildSolanaPayAsset } from '../handleSolanaUrl';
import {
  ChainType,
  handleSendPageNavigation,
} from '../../../../components/Views/confirmations/utils/send';
import { InitSendLocation } from '../../../../components/Views/confirmations/constants/send';
import NavigationService from '../../../NavigationService';

jest.mock('../../../NavigationService', () => ({
  navigation: {
    navigate: jest.fn(),
  },
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('../../../../components/Views/confirmations/utils/send', () => ({
  ChainType: {
    EVM: 'evm',
    SOLANA: 'solana',
    BITCOIN: 'bitcoin',
    TRON: 'tron',
    STELLAR: 'stellar',
  },
  handleSendPageNavigation: jest.fn(),
}));

const RECIPIENT = '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

describe('handleSolanaUrl', () => {
  const mockHandleSendPageNavigation = jest.mocked(handleSendPageNavigation);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('navigates to send with recipient, USDC asset, and amount for a transfer request', () => {
    const url = `solana:${RECIPIENT}?amount=25.515000&spl-token=${USDC_MINT}`;

    handleSolanaUrl({ url, origin: 'qr-code' });

    expect(mockHandleSendPageNavigation).toHaveBeenCalledWith(
      NavigationService.navigation.navigate,
      {
        location: InitSendLocation.QRScanner,
        predefinedRecipient: {
          address: RECIPIENT,
          chainType: ChainType.SOLANA,
        },
        asset: buildSolanaPayAsset(USDC_MINT),
        predefinedAmount: '25.515000',
      },
    );
  });

  it('navigates to send with native SOL when spl-token is omitted', () => {
    const url = `solana:${RECIPIENT}?amount=1.5`;

    handleSolanaUrl({ url, origin: 'qr-code' });

    expect(mockHandleSendPageNavigation).toHaveBeenCalledWith(
      NavigationService.navigation.navigate,
      {
        location: InitSendLocation.QRScanner,
        predefinedRecipient: {
          address: RECIPIENT,
          chainType: ChainType.SOLANA,
        },
        asset: buildSolanaPayAsset(),
        predefinedAmount: '1.5',
      },
    );
    expect(buildSolanaPayAsset().address).toBe(
      `${SolScope.Mainnet}/slip44:501`,
    );
  });

  it('alerts when the URI is not a Solana Pay transfer or transaction request', () => {
    handleSolanaUrl({ url: 'solana:not-an-address', origin: 'qr-code' });

    expect(Alert.alert).toHaveBeenCalledWith('deeplink.invalid');
    expect(mockHandleSendPageNavigation).not.toHaveBeenCalled();
  });

  it('alerts when the URI is a Solana Pay transaction request', () => {
    handleSolanaUrl({
      url: 'solana:https://api.triple-a.io/pay?id=abc',
      origin: 'qr-code',
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'deeplink.not_supported',
      'deeplink.solana_pay_transaction_request_not_supported',
    );
    expect(mockHandleSendPageNavigation).not.toHaveBeenCalled();
  });
});
