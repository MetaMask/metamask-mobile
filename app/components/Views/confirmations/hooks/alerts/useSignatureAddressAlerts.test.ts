import {
  SignatureRequest,
  SignatureRequestType,
} from '@metamask/signature-controller';
import { SignTypedDataVersion } from '@metamask/eth-sig-util';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { Severity } from '../../types/alerts';
import { TrustSignalDisplayState } from '../../types/trustSignals';
import { useSignatureAddressAlerts } from './useSignatureAddressAlerts';
import { useSignatureRequest } from '../signatures/useSignatureRequest';
import { useAddressTrustSignals } from '../useAddressTrustSignals';
import { parseTypedDataMessage } from '../../../../../lib/address-scanning/address-scan-util';

jest.mock('../signatures/useSignatureRequest', () => ({
  useSignatureRequest: jest.fn(),
}));

jest.mock('../useAddressTrustSignals', () => ({
  useAddressTrustSignals: jest.fn(),
}));

jest.mock('../../../../../lib/address-scanning/address-scan-util', () => ({
  ...jest.requireActual(
    '../../../../../lib/address-scanning/address-scan-util',
  ),
  parseTypedDataMessage: jest.fn(),
}));

const mockUseSignatureRequest = jest.mocked(useSignatureRequest);
const mockUseAddressTrustSignals = jest.mocked(useAddressTrustSignals);
const mockParseTypedDataMessage = jest.mocked(parseTypedDataMessage);

const MALICIOUS_ADDRESS = '0x0000000000000000000000000000000000000bad';
const WARNING_ADDRESS = '0x0000000000000000000000000000000000000001';
const SIGNER_ADDRESS = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const CHAIN_ID = '0x1';

const enabledState = {
  state: {
    engine: {
      backgroundState: {
        PreferencesController: {
          securityAlertsEnabled: true,
        },
      },
    },
  },
};

const makeTypedSignRequest = (
  data: object,
  version: SignTypedDataVersion = SignTypedDataVersion.V4,
): SignatureRequest =>
  ({
    type: SignatureRequestType.TypedSign,
    chainId: CHAIN_ID,
    messageParams: {
      from: SIGNER_ADDRESS,
      data: JSON.stringify(data),
      version,
    },
  }) as unknown as SignatureRequest;

const SIMPLE_TYPED_DATA = {
  types: {
    Transfer: [{ name: 'recipient', type: 'address' }],
  },
  primaryType: 'Transfer',
  message: { recipient: MALICIOUS_ADDRESS },
};

describe('useSignatureAddressAlerts (mobile)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAddressTrustSignals.mockReturnValue([]);
    mockParseTypedDataMessage.mockReturnValue(null);
  });

  it('returns empty array when security alerts are disabled', () => {
    mockUseSignatureRequest.mockReturnValue(
      makeTypedSignRequest(SIMPLE_TYPED_DATA),
    );
    mockParseTypedDataMessage.mockReturnValue(SIMPLE_TYPED_DATA);

    const { result } = renderHookWithProvider(
      () => useSignatureAddressAlerts(),
      {
        state: {
          engine: {
            backgroundState: {
              PreferencesController: { securityAlertsEnabled: false },
            },
          },
        },
      },
    );

    expect(result.current).toEqual([]);
    expect(mockUseAddressTrustSignals).toHaveBeenCalledWith([]);
  });

  it('returns empty array when there is no signature request', () => {
    mockUseSignatureRequest.mockReturnValue(undefined);

    const { result } = renderHookWithProvider(
      () => useSignatureAddressAlerts(),
      enabledState,
    );

    expect(result.current).toEqual([]);
  });

  it('returns empty array for non-typed-sign request type', () => {
    mockUseSignatureRequest.mockReturnValue({
      type: SignatureRequestType.PersonalSign,
      chainId: CHAIN_ID,
      messageParams: { from: SIGNER_ADDRESS, data: 'hello' },
    } as unknown as SignatureRequest);

    const { result } = renderHookWithProvider(
      () => useSignatureAddressAlerts(),
      enabledState,
    );

    expect(result.current).toEqual([]);
    expect(mockUseAddressTrustSignals).toHaveBeenCalledWith([]);
  });

  it('returns empty array for v1 typed data', () => {
    mockUseSignatureRequest.mockReturnValue(
      makeTypedSignRequest(SIMPLE_TYPED_DATA, SignTypedDataVersion.V1),
    );

    const { result } = renderHookWithProvider(
      () => useSignatureAddressAlerts(),
      enabledState,
    );

    expect(result.current).toEqual([]);
    expect(mockUseAddressTrustSignals).toHaveBeenCalledWith([]);
  });

  it('returns empty array when parseTypedDataMessage returns null', () => {
    mockUseSignatureRequest.mockReturnValue(
      makeTypedSignRequest(SIMPLE_TYPED_DATA),
    );
    mockParseTypedDataMessage.mockReturnValue(null);

    const { result } = renderHookWithProvider(
      () => useSignatureAddressAlerts(),
      enabledState,
    );

    expect(result.current).toEqual([]);
  });

  it('returns empty array when no addresses in message', () => {
    const typedData = {
      types: { Greeting: [{ name: 'text', type: 'string' }] },
      primaryType: 'Greeting',
      message: { text: 'Hello world' },
    };
    mockUseSignatureRequest.mockReturnValue(makeTypedSignRequest(typedData));
    mockParseTypedDataMessage.mockReturnValue(typedData);

    const { result } = renderHookWithProvider(
      () => useSignatureAddressAlerts(),
      enabledState,
    );

    expect(result.current).toEqual([]);
  });

  it('returns danger alert for malicious address field', () => {
    mockUseSignatureRequest.mockReturnValue(
      makeTypedSignRequest(SIMPLE_TYPED_DATA),
    );
    mockParseTypedDataMessage.mockReturnValue(SIMPLE_TYPED_DATA);
    mockUseAddressTrustSignals.mockReturnValue([
      { state: TrustSignalDisplayState.Malicious, label: null },
    ]);

    const { result } = renderHookWithProvider(
      () => useSignatureAddressAlerts(),
      enabledState,
    );

    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toMatchObject({
      key: `${AlertKeys.SignatureAddressTrustSignalMalicious}_${MALICIOUS_ADDRESS}`,
      field: RowAlertKey.InteractingWith,
      severity: Severity.Danger,
      isBlocking: false,
    });
  });

  it('returns warning alert for flagged address field', () => {
    const typedData = {
      types: { T: [{ name: 'addr', type: 'address' }] },
      primaryType: 'T',
      message: { addr: WARNING_ADDRESS },
    };
    mockUseSignatureRequest.mockReturnValue(makeTypedSignRequest(typedData));
    mockParseTypedDataMessage.mockReturnValue(typedData);
    mockUseAddressTrustSignals.mockReturnValue([
      { state: TrustSignalDisplayState.Warning, label: null },
    ]);

    const { result } = renderHookWithProvider(
      () => useSignatureAddressAlerts(),
      enabledState,
    );

    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toMatchObject({
      key: `${AlertKeys.SignatureAddressTrustSignalWarning}_${WARNING_ADDRESS}`,
      field: RowAlertKey.InteractingWith,
      severity: Severity.Warning,
    });
  });

  it('returns no alerts for Unknown trust signal state', () => {
    mockUseSignatureRequest.mockReturnValue(
      makeTypedSignRequest(SIMPLE_TYPED_DATA),
    );
    mockParseTypedDataMessage.mockReturnValue(SIMPLE_TYPED_DATA);
    mockUseAddressTrustSignals.mockReturnValue([
      { state: TrustSignalDisplayState.Unknown, label: null },
    ]);

    const { result } = renderHookWithProvider(
      () => useSignatureAddressAlerts(),
      enabledState,
    );

    expect(result.current).toEqual([]);
  });

  it('excludes the signer address', () => {
    const typedData = {
      types: { T: [{ name: 'addr', type: 'address' }] },
      primaryType: 'T',
      message: { addr: SIGNER_ADDRESS },
    };
    mockUseSignatureRequest.mockReturnValue(makeTypedSignRequest(typedData));
    mockParseTypedDataMessage.mockReturnValue(typedData);

    const { result } = renderHookWithProvider(
      () => useSignatureAddressAlerts(),
      enabledState,
    );

    expect(mockUseAddressTrustSignals).toHaveBeenCalledWith([]);
    expect(result.current).toEqual([]);
  });

  it('returns overflow caution alert when address cap is exceeded', () => {
    const types: { name: string; type: string }[] = [];
    const message: Record<string, string> = {};
    for (let i = 0; i < 12; i += 1) {
      types.push({ name: `addr${i}`, type: 'address' });
      message[`addr${i}`] = `0x${String(i).padStart(40, '0')}`;
    }
    const typedData = {
      types: { Flood: types },
      primaryType: 'Flood',
      message,
    };

    mockUseSignatureRequest.mockReturnValue(makeTypedSignRequest(typedData));
    mockParseTypedDataMessage.mockReturnValue(typedData);
    mockUseAddressTrustSignals.mockReturnValue(
      new Array(10).fill({
        state: TrustSignalDisplayState.Unknown,
        label: null,
      }),
    );

    const { result } = renderHookWithProvider(
      () => useSignatureAddressAlerts(),
      enabledState,
    );

    expect(
      result.current.some(
        (a) => a.key === AlertKeys.SignatureAddressScanIncomplete,
      ),
    ).toBe(true);
    expect(
      result.current.find(
        (a) => a.key === AlertKeys.SignatureAddressScanIncomplete,
      ),
    ).toMatchObject({
      field: RowAlertKey.InteractingWith,
      severity: Severity.Warning,
    });
  });

  it('passes address+chainId pairs to useAddressTrustSignals', () => {
    mockUseSignatureRequest.mockReturnValue(
      makeTypedSignRequest(SIMPLE_TYPED_DATA),
    );
    mockParseTypedDataMessage.mockReturnValue(SIMPLE_TYPED_DATA);
    mockUseAddressTrustSignals.mockReturnValue([
      { state: TrustSignalDisplayState.Unknown, label: null },
    ]);

    renderHookWithProvider(() => useSignatureAddressAlerts(), enabledState);

    expect(mockUseAddressTrustSignals).toHaveBeenCalledWith([
      { address: MALICIOUS_ADDRESS, chainId: CHAIN_ID },
    ]);
  });
});
