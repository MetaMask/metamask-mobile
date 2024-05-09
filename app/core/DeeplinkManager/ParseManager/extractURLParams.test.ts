import qs from 'qs';
import { Alert } from 'react-native';
import UrlParser from 'url-parse';
import { strings } from '../../../../locales/i18n';
import { PROTOCOLS } from '../../../constants/deeplinks';
import extractURLParams from './extractURLParams';

jest.mock('qs', () => ({
  parse: jest.fn(),
}));

jest.mock('url-parse', () => {
  const mockUrlParser = jest.fn();

  return {
    __esModule: true,
    default: mockUrlParser,
  };
});

jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

describe('extractURLParams', () => {
  const mockUrlParser = UrlParser as jest.MockedClass<typeof UrlParser>;
  const mockQs = qs as jest.Mocked<typeof qs>;

  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should correctly extract parameters from a valid URL with query parameters', () => {
    const url = `${PROTOCOLS.DAPP}/https://example.com?uri=test&redirect=true&channelId=123&comm=test&pubkey=abc&v=2`;
    const expectedParams = {
      uri: 'test',
      redirect: 'true',
      channelId: '123',
      comm: 'test',
      v: '2',
    };

    mockUrlParser.mockImplementation(
      () =>
        ({
          query:
            '?uri=test&redirect=true&channelId=123&comm=test&pubkey=abc&v=2',
        } as unknown as UrlParser<string>),
    );

    mockQs.parse.mockReturnValue(expectedParams);

    const { params } = extractURLParams(url);

    expect(params).toEqual(expectedParams);
  });

  it('should return an empty params object when the URL has no query parameters', () => {
    const url = `${PROTOCOLS.DAPP}/https://example.com`;

    mockUrlParser.mockImplementation(
      () =>
        ({
          query: '',
        } as unknown as UrlParser<string>),
    );

    const { params } = extractURLParams(url);

    expect(params).toEqual({
      uri: '',
      redirect: '',
      channelId: '',
      comm: '',
      pubkey: '',
      v: '',
    });
  });

  it('should handle invalid query parameters and show an alert when parsing fails', () => {
    const url = `${PROTOCOLS.DAPP}/https://example.com?invalid=param`;
    const errorMessage = 'Invalid query parameter';

    mockUrlParser.mockImplementation(
      () =>
        ({
          query: '?invalid=param',
        } as unknown as UrlParser<string>),
    );

    mockQs.parse.mockImplementation(() => {
      throw new Error(errorMessage);
    });

    const alertSpy = jest.spyOn(Alert, 'alert');

    const { params } = extractURLParams(url);

    expect(params).toEqual({
      uri: '',
      redirect: '',
      channelId: '',
      comm: '',
      pubkey: '',
      v: '',
    });

    expect(alertSpy).toHaveBeenCalledWith(
      strings('deeplink.invalid'),
      'Error: ' + errorMessage,
    );
  });

  it('should correctly parse and extract parameters from a URL with valid query parameters', () => {
    const url = `${PROTOCOLS.DAPP}/https://example.com?uri=test&redirect=false&channelId=456&comm=other&pubkey=xyz`;
    const expectedParams = {
      uri: 'test',
      redirect: 'false',
      channelId: '456',
      comm: 'other',
      v: '',
      pubkey: 'xyz',
    };

    mockUrlParser.mockImplementation(
      () =>
        ({
          query: '?uri=test&redirect=false&channelId=456&comm=other&pubkey=xyz',
        } as unknown as UrlParser<string>),
    );

    mockQs.parse.mockReturnValue(expectedParams);

    const { params } = extractURLParams(url);

    expect(params).toEqual(expectedParams);
  });
});
