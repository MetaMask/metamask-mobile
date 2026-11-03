import metroTransformer from '../metro.transform';

jest.mock('@expo/metro-config/babel-transformer', () => ({
  transform: jest.fn(),
}));
jest.mock('react-native-svg-transformer/expo', () => ({
  transform: jest.fn(),
}));

interface MockTransformer {
  transform: jest.Mock;
}
const defaultTransformer = jest.requireMock<MockTransformer>(
  '@expo/metro-config/babel-transformer',
);
const svgTransformer = jest.requireMock<MockTransformer>(
  'react-native-svg-transformer/expo',
);

const metroPlugins = [jest.fn(), jest.fn()];
const options = { dev: false, platform: 'ios' };

describe('metro.transform', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends non-SVG files to the Expo transformer without Metro plugins', () => {
    metroTransformer.transform({
      src: 'export const a = 1;',
      filename: 'app/a.ts',
      options,
      plugins: metroPlugins,
    });

    expect(defaultTransformer.transform).toHaveBeenCalledWith({
      src: 'export const a = 1;',
      filename: 'app/a.ts',
      options,
    });
    expect(svgTransformer.transform).not.toHaveBeenCalled();
  });

  it('sends SVG files to the SVG transformer without Metro plugins', () => {
    metroTransformer.transform({
      src: '<svg />',
      filename: 'app/images/icon.svg',
      options,
      plugins: metroPlugins,
    });

    expect(svgTransformer.transform).toHaveBeenCalledWith({
      src: '<svg />',
      filename: 'app/images/icon.svg',
      options,
    });
    expect(defaultTransformer.transform).not.toHaveBeenCalled();
  });
});
