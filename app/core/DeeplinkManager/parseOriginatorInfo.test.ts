import parseOriginatorInfo from './parseOriginatorInfo'; // Adjust the import path as needed

describe('parseOriginatorInfo', () => {
  it('should correctly parse a valid base64-encoded OriginatorInfo', () => {
    const validOriginatorInfo = {
      url: 'https://example.com',
      title: 'Example DApp',
      platform: 'web',
      dappId: 'example-dapp-id',
      icon: 'https://example.com/icon.png',
      source: 'direct',
      apiVersion: '1.0.0',
    };
    const base64OriginatorInfo = Buffer.from(
      JSON.stringify(validOriginatorInfo),
    ).toString('base64');

    const result = parseOriginatorInfo({ base64OriginatorInfo });

    expect(result).toEqual(validOriginatorInfo);
  });

  it('should correctly parse a valid base64-encoded OriginatorInfo with only required fields', () => {
    const validOriginatorInfo = {
      url: 'https://example.com',
      title: 'Example DApp',
      platform: 'web',
      dappId: 'example-dapp-id',
    };
    const base64OriginatorInfo = Buffer.from(
      JSON.stringify(validOriginatorInfo),
    ).toString('base64');

    const result = parseOriginatorInfo({ base64OriginatorInfo });

    expect(result).toEqual(validOriginatorInfo);
  });

  it('should throw an error for invalid base64 string', () => {
    const invalidBase64 = 'not a valid base64 string';

    expect(() =>
      parseOriginatorInfo({ base64OriginatorInfo: invalidBase64 }),
    ).toThrow('Invalid base64 string');
  });

  it('should throw an error for non-UTF-8 encoded base64 string', () => {
    // This is a valid base64 string, but it doesn't decode to valid UTF-8
    const nonUtf8Base64 = Buffer.from([255, 254, 253]).toString('base64');

    expect(() =>
      parseOriginatorInfo({ base64OriginatorInfo: nonUtf8Base64 }),
    ).toThrow('Invalid base64 string');
  });

  it('should throw an error for invalid JSON', () => {
    const invalidJson = Buffer.from('{invalid json}').toString('base64');

    expect(() =>
      parseOriginatorInfo({ base64OriginatorInfo: invalidJson }),
    ).toThrow('Invalid JSON format');
  });

  it('should throw an error for missing required fields', () => {
    const invalidOriginatorInfo = {
      url: 'https://example.com',
      title: 'Example DApp',
      // missing platform and dappId
    };
    const base64OriginatorInfo = Buffer.from(
      JSON.stringify(invalidOriginatorInfo),
    ).toString('base64');

    expect(() => parseOriginatorInfo({ base64OriginatorInfo })).toThrow(
      'Invalid OriginatorInfo structure',
    );
  });

  it('should throw an error for incorrect field types', () => {
    const invalidOriginatorInfo = {
      url: 'https://example.com',
      title: 'Example DApp',
      platform: 'web',
      dappId: 123, // should be a string
    };
    const base64OriginatorInfo = Buffer.from(
      JSON.stringify(invalidOriginatorInfo),
    ).toString('base64');

    expect(() => parseOriginatorInfo({ base64OriginatorInfo })).toThrow(
      'Invalid OriginatorInfo structure',
    );
  });

  it('should accept valid optional fields', () => {
    const validOriginatorInfo = {
      url: 'https://example.com',
      title: 'Example DApp',
      platform: 'web',
      dappId: 'example-dapp-id',
      icon: 'https://example.com/icon.png',
      source: 'direct',
      apiVersion: '1.0.0',
    };
    const base64OriginatorInfo = Buffer.from(
      JSON.stringify(validOriginatorInfo),
    ).toString('base64');

    const result = parseOriginatorInfo({ base64OriginatorInfo });

    expect(result).toEqual(validOriginatorInfo);
  });

  it('should reject invalid optional field types', () => {
    const invalidOriginatorInfo = {
      url: 'https://example.com',
      title: 'Example DApp',
      platform: 'web',
      dappId: 'example-dapp-id',
      icon: 123, // should be a string or undefined
    };
    const base64OriginatorInfo = Buffer.from(
      JSON.stringify(invalidOriginatorInfo),
    ).toString('base64');

    expect(() => parseOriginatorInfo({ base64OriginatorInfo })).toThrow(
      'Invalid OriginatorInfo structure',
    );
  });
});
