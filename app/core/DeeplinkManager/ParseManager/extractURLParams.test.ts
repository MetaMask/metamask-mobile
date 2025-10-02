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

    expect(params).toEqual({ ...expectedParams, hr: false });
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

    expect(params).toEqual({ ...expectedParams, hr: false });
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
      hr: false,
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
      hr: false,
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

    expect(params).toEqual({ ...expectedParams, hr: false });
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

    expect(params).toEqual({ ...expectedParams, hr: false });
  });

  describe('hr parameter (hideReturnToApp)', () => {
    it('extracts hr parameter as true when set to "1"', () => {
      const url = `${PROTOCOLS.DAPP}/https://example.com?hr=1&channelId=123`;
      const expectedParams = {
        channelId: '123',
        uri: '',
        redirect: '',
        originatorInfo: '',
        rpc: '',
        sdkVersion: '',
        comm: '',
        pubkey: '',
        v: '',
        attributionId: '',
        utm_source: '',
        utm_medium: '',
        utm_campaign: '',
        utm_term: '',
        utm_content: '',
        hr: '1',
      };

      mockQs.parse.mockReturnValue(expectedParams);

      const { params } = extractURLParams(url);

      expect(params).toEqual({
        ...expectedParams,
        hr: true, // Should be converted to boolean true
      });
    });

    it('extracts hr parameter as false when set to any value other than "1"', () => {
      const url = `${PROTOCOLS.DAPP}/https://example.com?hr=0&channelId=123`;
      const expectedParams = {
        channelId: '123',
        uri: '',
        redirect: '',
        originatorInfo: '',
        rpc: '',
        sdkVersion: '',
        comm: '',
        pubkey: '',
        v: '',
        attributionId: '',
        utm_source: '',
        utm_medium: '',
        utm_campaign: '',
        utm_term: '',
        utm_content: '',
        hr: '0',
      };

      mockQs.parse.mockReturnValue(expectedParams);

      const { params } = extractURLParams(url);

      expect(params).toEqual({
        ...expectedParams,
        hr: false, // Should be converted to boolean false
      });
    });

    it('extracts hr parameter as false when not provided', () => {
      const url = `${PROTOCOLS.DAPP}/https://example.com?channelId=123`;
      const expectedParams = {
        channelId: '123',
        uri: '',
        redirect: '',
        originatorInfo: '',
        rpc: '',
        sdkVersion: '',
        comm: '',
        pubkey: '',
        v: '',
        attributionId: '',
        utm_source: '',
        utm_medium: '',
        utm_campaign: '',
        utm_term: '',
        utm_content: '',
      };

      mockQs.parse.mockReturnValue(expectedParams);

      const { params } = extractURLParams(url);

      expect(params).toEqual({
        ...expectedParams,
        hr: false, // Should default to false
      });
    });
  });
});
