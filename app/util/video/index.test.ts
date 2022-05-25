import { baseUrl, subtitlePath, getSubtitleUri } from '.';

describe('getSubtitleUri', () => {
  it('should return en by default', () => {
    expect(getSubtitleUri('lol')).toStrictEqual(
      `${baseUrl}${subtitlePath}en.vtt?raw=true`,
    );
  });
  it('should return hi-in for hi', () => {
    expect(getSubtitleUri('hi')).toStrictEqual(
      `${baseUrl}${subtitlePath}hi-in.vtt?raw=true`,
    );
  });
});
