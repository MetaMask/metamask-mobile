import React from 'react';
import Header from '.';
import { render } from '@testing-library/react-native';

jest.mock('../../../../../util/theme');
jest.mock('@react-navigation/native');

jest.mock('../../../../../component-library/components/Texts/Text', () => {
  const originalModule = jest.requireActual(
    '../../../../../component-library/components/Texts/Text',
  );
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return {
    ...originalModule,
    __esModule: true,
    default: jest.fn(({ children, testID }) => (
      <Text testID={testID}>{children}</Text>
    )),
  };
});

describe('Header', () => {
  const TITLE = 'Notification Announcement';
  const DESCRIPTION = 'This is a mock of description';

  it('should render correctly', () => {
    const { getByTestId, getByText } = render(
      <Header title={TITLE} subtitle={DESCRIPTION} />,
    );
    expect(getByTestId('notification-details-header-title')).toBeOnTheScreen();
    expect(getByText(DESCRIPTION)).toBeOnTheScreen();
  });
});
