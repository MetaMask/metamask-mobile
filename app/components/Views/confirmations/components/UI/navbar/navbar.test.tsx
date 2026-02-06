import { getNavbar, getEmptyNavHeader } from './navbar';
import getHeaderCompactStandardNavbarOptions from '../../../../../../component-library/components-temp/HeaderCompactStandard/getHeaderCompactStandardNavbarOptions';

jest.mock(
  '../../../../../../component-library/components-temp/HeaderCompactStandard/getHeaderCompactStandardNavbarOptions',
);

describe('getNavbar', () => {
  const mockOnReject = jest.fn();
  const mockGetHeaderCompactStandardNavbarOptions = jest.mocked(
    getHeaderCompactStandardNavbarOptions,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetHeaderCompactStandardNavbarOptions.mockReturnValue({
      header: () => null,
    });
  });

  it('calls getHeaderCompactStandardNavbarOptions with title and onBack when addBackButton is true', () => {
    const title = 'Test Title';

    getNavbar({
      title,
      onReject: mockOnReject,
      addBackButton: true,
    });

    expect(mockGetHeaderCompactStandardNavbarOptions).toHaveBeenCalledWith({
      title,
      onBack: mockOnReject,
      includesTopInset: true,
    });
  });

  it('calls getHeaderCompactStandardNavbarOptions with undefined onBack when addBackButton is false', () => {
    const title = 'Test Title';

    getNavbar({
      title,
      onReject: mockOnReject,
      addBackButton: false,
    });

    expect(mockGetHeaderCompactStandardNavbarOptions).toHaveBeenCalledWith({
      title,
      onBack: undefined,
      includesTopInset: true,
    });
  });

  it('defaults addBackButton to true when not specified', () => {
    const title = 'Test Title';

    getNavbar({
      title,
      onReject: mockOnReject,
    });

    expect(mockGetHeaderCompactStandardNavbarOptions).toHaveBeenCalledWith({
      title,
      onBack: mockOnReject,
      includesTopInset: true,
    });
  });
});

describe('getEmptyNavHeader', () => {
  const mockGetHeaderCompactStandardNavbarOptions = jest.mocked(
    getHeaderCompactStandardNavbarOptions,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetHeaderCompactStandardNavbarOptions.mockReturnValue({
      header: () => null,
    });
  });

  it('returns navbar options with headerShown true and gestureEnabled false', () => {
    const result = getEmptyNavHeader();

    expect(mockGetHeaderCompactStandardNavbarOptions).toHaveBeenCalledWith({
      title: '',
      onBack: undefined,
      includesTopInset: true,
    });
    expect(result).toEqual({
      header: expect.any(Function),
      headerShown: true,
      gestureEnabled: false,
    });
  });
});
