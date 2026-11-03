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

const options = { dev: false, platform: 'ios' };

// Metro calls the transformer with its own Babel plugins as well.
const metroArgs = (src: string, filename: string) => ({
  src,
  filename,
  options,
  plugins: [jest.fn(), jest.fn()],
});

describe('metro.transform', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends non-SVG files to the Expo transformer without Metro plugins', () => {
    metroTransformer.transform(metroArgs('export const a = 1;', 'app/a.ts'));

    expect(defaultTransformer.transform).toHaveBeenCalledWith({
      src: 'export const a = 1;',
      filename: 'app/a.ts',
      options,
    });
    expect(svgTransformer.transform).not.toHaveBeenCalled();
  });

  it('sends SVG files to the SVG transformer without Metro plugins', () => {
    metroTransformer.transform(metroArgs('<svg />', 'app/images/icon.svg'));

    expect(svgTransformer.transform).toHaveBeenCalledWith({
      src: '<svg />',
      filename: 'app/images/icon.svg',
      options,
    });
    expect(defaultTransformer.transform).not.toHaveBeenCalled();
  });
});
