import { getSubtitleUri } from '.';

describe('getSubtitleUri', () => {
  it('should return en by default', () => {
    expect(getSubtitleUri('lol')).toStrictEqual(
      'https://github.com/MetaMask/metamask-mobile/blob/main/app/videos/subtitles/secretPhrase/subtitles-en.vtt?raw=true',
    );
  });
  it('should return hi-in for hi', () => {
    expect(getSubtitleUri('hi')).toStrictEqual(
      'https://github.com/MetaMask/metamask-mobile/blob/main/app/videos/subtitles/secretPhrase/subtitles-hi-in.vtt?raw=true',
    );
  });
});
