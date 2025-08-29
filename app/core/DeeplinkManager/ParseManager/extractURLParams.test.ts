import qs from 'qs';
import { Alert } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { PROTOCOLS } from '../../../constants/deeplinks';
import extractURLParams from './extractURLParams';

jest.mock('qs', () => ({
  parse: jest.fn(),
}));

jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

describe('extractURLParams', () => {
  // const mockUrlParser = UrlParser as jest.MockedClass<typeof UrlParser>;
  const mockQs = qs as jest.Mocked<typeof qs>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('extracts parameters from a valid URL with query parameters', () => {
    const url = `${PROTOCOLS.DAPP}/https://example.com?uri=test&redirect=true&channelId=123&comm=test&pubkey=abc&v=2`;
    const expectedParams = {
      uri: 'test',
      redirect: 'true',
      originatorInfo: '',
      rpc: '',
      sdkVersion: '',
      channelId: '123',
      comm: 'test',
      pubkey: 'abc',
      v: '2',
      attributionId: '',
      utm_source: '',
      utm_medium: '',
      utm_campaign: '',
      utm_term: '',
      utm_content: '',
    };

    mockQs.parse.mockReturnValue(expectedParams);

    const { params } = extractURLParams(url);

    expect(params).toEqual(expectedParams);
  });

  it('extracts UTM parameters from a URL', () => {
    const url = `${PROTOCOLS.DAPP}/https://example.com?utm_source=facebook&utm_medium=social&utm_campaign=summer_sale&utm_term=wallet&utm_content=banner`;
    const expectedParams = {
      uri: '',
      redirect: '',
      originatorInfo: '',
      rpc: '',
      sdkVersion: '',
      channelId: '',
      comm: '',
      v: '',
      pubkey: '',
      attributionId: '',
      utm_source: 'facebook',
      utm_medium: 'social',
      utm_campaign: 'summer_sale',
      utm_term: 'wallet',
      utm_content: 'banner',
    };

    mockQs.parse.mockReturnValue(expectedParams);

    const { params } = extractURLParams(url);

    expect(params).toEqual(expectedParams);
  });

  it('returns an empty params object when the URL has no query parameters', () => {
    const url = `${PROTOCOLS.DAPP}/https://example.com`;

    const { params } = extractURLParams(url);

    expect(params).toEqual({
      uri: '',
      redirect: '',
      originatorInfo: '',
      rpc: '',
      sdkVersion: '',
      channelId: '',
      comm: '',
      pubkey: '',
      v: '',
      attributionId: '',
      utm_source: '',
      utm_medium: '',
      utm_campaign: '',
      utm_term: '',
      utm_content: '',
    });
  });

  it('handles invalid query parameters and shows an alert when parsing fails', () => {
    const url = `${PROTOCOLS.DAPP}/https://example.com?invalid=param`;
    const errorMessage = 'Invalid query parameter';

    mockQs.parse.mockImplementation(() => {
      throw new Error(errorMessage);
    });

    const alertSpy = jest.spyOn(Alert, 'alert');

    const { params } = extractURLParams(url);

    expect(params).toEqual({
      uri: '',
      redirect: '',
      originatorInfo: '',
      rpc: '',
      sdkVersion: '',
      channelId: '',
      comm: '',
      pubkey: '',
      v: '',
      attributionId: '',
      utm_source: '',
      utm_medium: '',
      utm_campaign: '',
      utm_term: '',
      utm_content: '',
    });

    expect(alertSpy).toHaveBeenCalledWith(
      strings('deeplink.invalid'),
      'Error: ' + errorMessage,
    );
  });

  it('parses and extracts parameters from a URL with valid query parameters', () => {
    const url = `${PROTOCOLS.DAPP}/https://example.com?uri=test&redirect=false&channelId=456&comm=other&pubkey=xyz`;
    const expectedParams = {
      uri: 'test',
      redirect: 'false',
      channelId: '456',
      comm: 'other',
      v: '',
      originatorInfo: '',
      rpc: '',
      sdkVersion: '',
      pubkey: 'xyz',
      attributionId: '',
      utm_source: '',
      utm_medium: '',
      utm_campaign: '',
      utm_term: '',
      utm_content: '',
    };

    mockQs.parse.mockReturnValue(expectedParams);

    const { params } = extractURLParams(url);

    expect(params).toEqual(expectedParams);
  });

  it('extracts parameters from a valid URL with duplicate query parameters', () => {
    // pubkey and comm is duplicated
    const url = `${PROTOCOLS.DAPP}/https://example.com?uri=test&redirect=true&channelId=123&comm=test&comm=test&pubkey=abc&v=2&pubkey=abc`;
    const expectedParams = {
      uri: 'test',
      redirect: 'true',
      originatorInfo: '',
      rpc: '',
      sdkVersion: '',
      channelId: '123',
      comm: 'test',
      pubkey: 'abc',
      v: '2',
      attributionId: '',
      utm_source: '',
      utm_medium: '',
      utm_campaign: '',
      utm_term: '',
      utm_content: '',
    };

    mockQs.parse.mockReturnValue(expectedParams);

    const { params } = extractURLParams(url);

    expect(params).toEqual(expectedParams);
  });
});
