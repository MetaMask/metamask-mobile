import setNavOptions from './utils';
import { getBrowserViewNavbarOptions } from '../../UI/Navbar';
jest.mock('../../UI/Navbar');

describe('setNavOptions', () => {
  it('should set navigation options correctly', () => {
    // Arrange
    const route = {
      params: {
        showTabs: false,
      },
    };
    const colors = {
      primary: 'blue',
      secondary: 'white',
    };
    const handleRightTopButtonAnalyticsEvent = jest.fn();
    const navigation = {
      setOptions: jest.fn(),
    };

    getBrowserViewNavbarOptions.mockReturnValue({
      title: 'Mocked Title',
      headerShown: false,
    });

    // Act
    const result = setNavOptions(
      route,
      colors,
      handleRightTopButtonAnalyticsEvent,
      navigation,
    )();

    // Assert
    expect(result).toBeUndefined();
    expect(navigation.setOptions).toHaveBeenCalledWith({
      title: 'Mocked Title',
      headerShown: true,
    });
  });
});
