import React from 'react';
import Header from '.';
import { render } from '@testing-library/react-native';

jest.mock('../../../../../util/theme');
jest.mock('@react-navigation/native');

jest.mock('../../../../../component-library/components/Texts/Text', () => {
  const originalModule = jest.requireActual(
    '../../../../../component-library/components/Texts/Text',
  );
  return {
    ...originalModule,
    __esModule: true,
    default: jest.fn(({ children }) => children),
  };
});

describe('Header', () => {
  const TITLE = 'Notification Announcement';
  const DESCRIPTION = 'This is a mock of description';

  it('should render correctly', () => {
    const { toJSON } = render(<Header title={TITLE} subtitle={DESCRIPTION} />);
    expect(toJSON()).toMatchSnapshot();
  });
});
