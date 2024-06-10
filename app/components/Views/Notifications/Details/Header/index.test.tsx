import React from 'react';
import Header from '.';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import initialBackgroundState from '../../../../../util/test/initial-background-state.json';
import {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';

const mockInitialState = {
  engine: {
    backgroundState: {
      ...initialBackgroundState,
    },
  },
};

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
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <Header
        title={'Notification Announcement'}
        subtitle={'This is a mock of description'}
      />,
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders title and subtitle with correct variants and colors', async () => {
    const wrapper = renderWithProvider(
      <Header
        title={'Notification Announcement'}
        subtitle={'This is a mock of description'}
      />,
      {
        state: mockInitialState,
      },
    );

    expect(wrapper).toMatchSnapshot();

    expect(await wrapper.getByText('Notification Announcement')).toBeDefined();
    expect(
      await wrapper.getByText('This is a mock of description'),
    ).toBeDefined();

    const titleElement = await wrapper.findByText('Notification Announcement');
    const subtitleElement = await wrapper.findByText(
      'This is a mock of description',
    );

    expect(titleElement).toBeDefined();
    expect(subtitleElement).toBeDefined();

    expect(titleElement.props.variant).toBe(TextVariant.BodyLGMedium);
    expect(titleElement.props.color).toBe(TextColor.Default);

    expect(subtitleElement.props.variant).toBe(TextVariant.BodyMD);
    expect(subtitleElement.props.color).toBe(TextColor.Alternative);
  });
});
