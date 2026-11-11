import {
  RemoteTransport,
  getRequestSourceForTransport,
  getOriginProvenance,
  removeOriginProvenance,
  stampOriginProvenance,
} from './index';
import AppConstants from '../AppConstants';

describe('OriginProvenance', () => {
  const CONNECTION_ID = 'a3b1c9d0-0000-4000-8000-123456789abc';

  afterEach(() => {
    removeOriginProvenance(CONNECTION_ID);
  });

  it('stamps and returns provenance keyed by the unspoofable connection id', () => {
    const provenance = stampOriginProvenance({
      connectionId: CONNECTION_ID,
      transport: RemoteTransport.WalletConnect,
      selfReported: {
        url: 'https://claimed-by-dapp.example',
        name: 'Claimed Dapp',
        icon: 'https://claimed-by-dapp.example/icon.png',
      },
    });

    expect(getOriginProvenance(CONNECTION_ID)).toBe(provenance);
    expect(provenance).toStrictEqual({
      connectionId: CONNECTION_ID,
      transport: RemoteTransport.WalletConnect,
      // Self-reported metadata is never verified on remote transports.
      isVerified: false,
      selfReported: {
        url: 'https://claimed-by-dapp.example',
        name: 'Claimed Dapp',
        icon: 'https://claimed-by-dapp.example/icon.png',
      },
    });
  });

  it('overwrites the stamp when the same connection re-registers with fresh metadata', () => {
    stampOriginProvenance({
      connectionId: CONNECTION_ID,
      transport: RemoteTransport.SDKv1,
      selfReported: { url: 'https://old.example' },
    });
    stampOriginProvenance({
      connectionId: CONNECTION_ID,
      transport: RemoteTransport.SDKv1,
      selfReported: { url: 'https://new.example' },
    });

    expect(getOriginProvenance(CONNECTION_ID)?.selfReported.url).toBe(
      'https://new.example',
    );
  });

  it('returns undefined for connection ids that were never stamped', () => {
    expect(getOriginProvenance('never-stamped')).toBeUndefined();
  });

  it('removes the stamp when the connection closes', () => {
    stampOriginProvenance({
      connectionId: CONNECTION_ID,
      transport: RemoteTransport.MMConnect,
      selfReported: {},
    });

    removeOriginProvenance(CONNECTION_ID);

    expect(getOriginProvenance(CONNECTION_ID)).toBeUndefined();
  });

  it('maps every remote transport to its request_source constant', () => {
    expect(getRequestSourceForTransport(RemoteTransport.WalletConnect)).toBe(
      AppConstants.REQUEST_SOURCES.WC,
    );
    expect(getRequestSourceForTransport(RemoteTransport.SDKv1)).toBe(
      AppConstants.REQUEST_SOURCES.SDK_REMOTE_CONN,
    );
    expect(getRequestSourceForTransport(RemoteTransport.MMConnect)).toBe(
      AppConstants.REQUEST_SOURCES.MM_CONNECT,
    );
  });
});
