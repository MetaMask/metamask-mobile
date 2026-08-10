import { SignatureRequest } from '@metamask/signature-controller';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { Severity } from '../../types/alerts';
import { TrustSignalDisplayState } from '../../types/trustSignals';
import { useSignatureRequest } from '../signatures/useSignatureRequest';
import { useAddressTrustSignals } from '../useAddressTrustSignals';
import { useSignatureAddressAlerts } from './useSignatureAddressAlerts';

jest.mock('../signatures/useSignatureRequest', () => ({
  useSignatureRequest: jest.fn(),
}));

jest.mock('../useAddressTrustSignals', () => ({
  useAddressTrustSignals: jest.fn(),
}));

jest.mock('../../../../../selectors/preferencesController', () => ({
  selectIsSecurityAlertsEnabled: jest.fn(() => true),
}));

// Echo the key and substitutions for assertions.
jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: { field: string; address: string }) =>
    params ? `${key}|${params.field}|${params.address}` : key,
}));

jest.mock('../../../../../util/address', () => ({
  renderShortAddress: (address: string) => `short(${address})`,
}));

const { selectIsSecurityAlertsEnabled } = jest.requireMock(
  '../../../../../selectors/preferencesController',
);

const SIGNER = '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477';
const ADDR_A = '0x1111111111111111111111111111111111111111';
const ADDR_B = '0x2222222222222222222222222222222222222222';

const mockUseSignatureRequest = jest.mocked(useSignatureRequest);
const mockUseAddressTrustSignals = jest.mocked(useAddressTrustSignals);

function buildSignatureRequest(
  message: Record<string, unknown>,
  types: Record<string, { name: string; type: string }[]> = {
    ClaimOrder: [
      { name: 'recipient', type: 'address' },
      { name: 'maker', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
  },
  primaryType = 'ClaimOrder',
) {
  return {
    type: 'eth_signTypedData',
    chainId: '0x1',
    messageParams: {
      version: 'V4',
      from: SIGNER,
      data: JSON.stringify({
        types,
        primaryType,
        domain: {
          verifyingContract: '0xcccccccccccccccccccccccccccccccccccccccc',
        },
        message,
      }),
    },
  } as unknown as SignatureRequest;
}

function signalsOf(...states: TrustSignalDisplayState[]) {
  return states.map((state) => ({ state, label: null }));
}

describe('useSignatureAddressAlerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    selectIsSecurityAlertsEnabled.mockReturnValue(true);
    mockUseAddressTrustSignals.mockReturnValue([]);
  });

  it('returns no alerts when there is no signature request', () => {
    mockUseSignatureRequest.mockReturnValue(undefined);
    const { result } = renderHookWithProvider(() =>
      useSignatureAddressAlerts(),
    );
    expect(result.current).toStrictEqual([]);
  });

  it('returns no alerts when security alerts are disabled', () => {
    selectIsSecurityAlertsEnabled.mockReturnValue(false);
    mockUseSignatureRequest.mockReturnValue(
      buildSignatureRequest({ recipient: ADDR_A }),
    );
    mockUseAddressTrustSignals.mockReturnValue(
      signalsOf(TrustSignalDisplayState.Malicious),
    );
    const { result } = renderHookWithProvider(() =>
      useSignatureAddressAlerts(),
    );
    expect(result.current).toStrictEqual([]);
  });

  it('returns a malicious alert naming the flagged field and address', () => {
    mockUseSignatureRequest.mockReturnValue(
      buildSignatureRequest({ recipient: ADDR_A }),
    );
    mockUseAddressTrustSignals.mockReturnValue(
      signalsOf(TrustSignalDisplayState.Malicious),
    );

    const { result } = renderHookWithProvider(() =>
      useSignatureAddressAlerts(),
    );

    expect(result.current).toStrictEqual([
      {
        key: `${AlertKeys.SignatureAddressTrustSignalMalicious}_${ADDR_A}`,
        field: RowAlertKey.InteractingWith,
        severity: Severity.Danger,
        message: `alert_system.signature_address_scan.malicious.message|recipient|short(${ADDR_A})`,
        title: 'alert_system.signature_address_scan.malicious.title',
        isBlocking: false,
      },
    ]);
  });

  it('reports every flagged address, not just the first', () => {
    mockUseSignatureRequest.mockReturnValue(
      buildSignatureRequest({ recipient: ADDR_A, maker: ADDR_B }),
    );
    mockUseAddressTrustSignals.mockReturnValue(
      signalsOf(
        TrustSignalDisplayState.Malicious,
        TrustSignalDisplayState.Warning,
      ),
    );

    const { result } = renderHookWithProvider(() =>
      useSignatureAddressAlerts(),
    );

    expect(result.current).toStrictEqual([
      {
        key: `${AlertKeys.SignatureAddressTrustSignalMalicious}_${ADDR_A}`,
        field: RowAlertKey.InteractingWith,
        severity: Severity.Danger,
        message: `alert_system.signature_address_scan.malicious.message|recipient|short(${ADDR_A})`,
        title: 'alert_system.signature_address_scan.malicious.title',
        isBlocking: false,
      },
      {
        key: `${AlertKeys.SignatureAddressTrustSignalWarning}_${ADDR_B}`,
        field: RowAlertKey.InteractingWith,
        severity: Severity.Warning,
        message: `alert_system.signature_address_scan.warning.message|maker|short(${ADDR_B})`,
        title: 'alert_system.signature_address_scan.warning.title',
        isBlocking: false,
      },
    ]);
  });

  it('returns a warning alert when an address is flagged as warning', () => {
    mockUseSignatureRequest.mockReturnValue(
      buildSignatureRequest({ recipient: ADDR_A }),
    );
    mockUseAddressTrustSignals.mockReturnValue(
      signalsOf(TrustSignalDisplayState.Warning),
    );

    const { result } = renderHookWithProvider(() =>
      useSignatureAddressAlerts(),
    );

    expect(result.current).toStrictEqual([
      {
        key: `${AlertKeys.SignatureAddressTrustSignalWarning}_${ADDR_A}`,
        field: RowAlertKey.InteractingWith,
        severity: Severity.Warning,
        message: `alert_system.signature_address_scan.warning.message|recipient|short(${ADDR_A})`,
        title: 'alert_system.signature_address_scan.warning.title',
        isBlocking: false,
      },
    ]);
  });

  it('returns no alert when all addresses are benign', () => {
    mockUseSignatureRequest.mockReturnValue(
      buildSignatureRequest({ recipient: ADDR_A, maker: ADDR_B }),
    );
    mockUseAddressTrustSignals.mockReturnValue(
      signalsOf(
        TrustSignalDisplayState.Unknown,
        TrustSignalDisplayState.Verified,
      ),
    );

    const { result } = renderHookWithProvider(() =>
      useSignatureAddressAlerts(),
    );
    expect(result.current).toStrictEqual([]);
  });

  it('flags a malicious permit spender', () => {
    mockUseSignatureRequest.mockReturnValue(
      buildSignatureRequest(
        { spender: ADDR_A, value: '1' },
        {
          Permit: [
            { name: 'spender', type: 'address' },
            { name: 'value', type: 'uint256' },
          ],
        },
        'Permit',
      ),
    );
    mockUseAddressTrustSignals.mockReturnValue(
      signalsOf(TrustSignalDisplayState.Malicious),
    );

    const { result } = renderHookWithProvider(() =>
      useSignatureAddressAlerts(),
    );

    expect(result.current).toStrictEqual([
      {
        key: `${AlertKeys.SignatureAddressTrustSignalMalicious}_${ADDR_A}`,
        field: RowAlertKey.InteractingWith,
        severity: Severity.Danger,
        message: `alert_system.signature_address_scan.malicious.message|spender|short(${ADDR_A})`,
        title: 'alert_system.signature_address_scan.malicious.title',
        isBlocking: false,
      },
    ]);
  });

  it('surfaces a caution when the message could not be fully scanned', () => {
    const fields = Array.from({ length: 15 }, (_, i) => ({
      name: `a${i}`,
      type: 'address',
    }));
    const message: Record<string, unknown> = {};
    fields.forEach((_, i) => {
      message[`a${i}`] = `0x${(i + 1).toString(16).padStart(40, '0')}`;
    });

    mockUseSignatureRequest.mockReturnValue(
      buildSignatureRequest(message, { Many: fields }, 'Many'),
    );
    mockUseAddressTrustSignals.mockReturnValue(
      signalsOf(...Array(10).fill(TrustSignalDisplayState.Unknown)),
    );

    const { result } = renderHookWithProvider(() =>
      useSignatureAddressAlerts(),
    );

    expect(result.current).toStrictEqual([
      {
        key: AlertKeys.SignatureAddressScanIncomplete,
        field: RowAlertKey.InteractingWith,
        severity: Severity.Warning,
        message: 'alert_system.signature_address_scan.incomplete.message',
        title: 'alert_system.signature_address_scan.incomplete.title',
        isBlocking: false,
      },
    ]);
  });
});
