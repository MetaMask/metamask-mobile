import { baseUrl, subtitlePath, getSubtitleUri, ext } from '.';

describe('getSubtitleUri', () => {
  it('should return en by default', () => {
    expect(getSubtitleUri('lol')).toStrictEqual(
      `${baseUrl}${subtitlePath}en${ext}`,
    );
  });
  it('should return hi-in for hi', () => {
    expect(getSubtitleUri('hi')).toStrictEqual(
      `${baseUrl}${subtitlePath}hi-in${ext}`,
    );
  });
});
