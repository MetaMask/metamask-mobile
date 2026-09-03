import { handlePrivacyUrl } from '../handlePrivacyUrl';
import NavigationService from '../../../../NavigationService';
import Routes from '../../../../../constants/navigation/Routes';

jest.mock('../../../../NavigationService');

describe('handlePrivacyUrl', () => {
  let mockNavigate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockNavigate = jest.fn();
    NavigationService.navigation = {
      navigate: mockNavigate,
    } as unknown as typeof NavigationService.navigation;
  });

  it('navigates to security settings scrolled to metametrics by default', () => {
    handlePrivacyUrl({ privacyPath: '' });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SETTINGS_VIEW, {
      screen: Routes.SETTINGS.SECURITY_SETTINGS,
      params: { scrollToSection: 'metametrics' },
    });
  });

  it('navigates scrolled to metametrics when setting=metametrics', () => {
    handlePrivacyUrl({ privacyPath: '?setting=metametrics' });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SETTINGS_VIEW, {
      screen: Routes.SETTINGS.SECURITY_SETTINGS,
      params: { scrollToSection: 'metametrics' },
    });
  });

  it('navigates scrolled to data collection when setting=data-collection', () => {
    handlePrivacyUrl({ privacyPath: '?setting=data-collection' });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SETTINGS_VIEW, {
      screen: Routes.SETTINGS.SECURITY_SETTINGS,
      params: { scrollToSection: 'data-collection' },
    });
  });

  it('falls back to metametrics for unknown setting values', () => {
    handlePrivacyUrl({ privacyPath: '?setting=not-a-setting' });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SETTINGS_VIEW, {
      screen: Routes.SETTINGS.SECURITY_SETTINGS,
      params: { scrollToSection: 'metametrics' },
    });
  });

  it('ignores unrelated params', () => {
    handlePrivacyUrl({ privacyPath: '?foo=bar' });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SETTINGS_VIEW, {
      screen: Routes.SETTINGS.SECURITY_SETTINGS,
      params: { scrollToSection: 'metametrics' },
    });
  });
});
