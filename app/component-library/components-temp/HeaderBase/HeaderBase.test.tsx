// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

// Internal dependencies.
import HeaderBase from './HeaderBase';
import { HeaderBaseTestIds } from './HeaderBase.constants';

describe('HeaderBase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders with string title', () => {
      const { getByText } = render(<HeaderBase>Test Title</HeaderBase>);

      expect(getByText('Test Title')).toBeTruthy();
    });

    it('renders with custom children', () => {
      const { getByText } = render(
        <HeaderBase>
          <Text>Custom Content</Text>
        </HeaderBase>,
      );

      expect(getByText('Custom Content')).toBeTruthy();
    });

    it('renders container with correct testID', () => {
      const { getByTestId } = render(<HeaderBase>Title</HeaderBase>);

      expect(getByTestId(HeaderBaseTestIds.CONTAINER)).toBeTruthy();
    });

    it('renders title with correct testID when string is passed', () => {
      const { getByTestId } = render(<HeaderBase>Title</HeaderBase>);

      expect(getByTestId(HeaderBaseTestIds.TITLE)).toBeTruthy();
    });
  });

  describe('accessories', () => {
    it('renders with start accessory', () => {
      const { getByTestId, getByText } = render(
        <HeaderBase startAccessory={<Text>Start</Text>}>Title</HeaderBase>,
      );

      expect(getByTestId(HeaderBaseTestIds.START_ACCESSORY)).toBeTruthy();
      expect(getByText('Start')).toBeTruthy();
    });

    it('renders with end accessory', () => {
      const { getByTestId, getByText } = render(
        <HeaderBase endAccessory={<Text>End</Text>}>Title</HeaderBase>,
      );

      expect(getByTestId(HeaderBaseTestIds.END_ACCESSORY)).toBeTruthy();
      expect(getByText('End')).toBeTruthy();
    });

    it('renders with both accessories', () => {
      const { getByTestId, getByText } = render(
        <HeaderBase
          startAccessory={<Text>Start</Text>}
          endAccessory={<Text>End</Text>}
        >
          Title
        </HeaderBase>,
      );

      expect(getByTestId(HeaderBaseTestIds.START_ACCESSORY)).toBeTruthy();
      expect(getByTestId(HeaderBaseTestIds.END_ACCESSORY)).toBeTruthy();
      expect(getByText('Start')).toBeTruthy();
      expect(getByText('End')).toBeTruthy();
    });

    it('does not render accessory wrappers when no accessories provided', () => {
      const { queryByTestId } = render(<HeaderBase>Title</HeaderBase>);

      expect(queryByTestId(HeaderBaseTestIds.START_ACCESSORY)).toBeNull();
      expect(queryByTestId(HeaderBaseTestIds.END_ACCESSORY)).toBeNull();
    });
  });

  describe('props', () => {
    it('accepts custom testID', () => {
      const customTestId = 'custom-header';
      const { getByTestId } = render(
        <HeaderBase testID={customTestId}>Title</HeaderBase>,
      );

      expect(getByTestId(customTestId)).toBeTruthy();
    });

    it('passes startAccessoryWrapperProps to start accessory wrapper', () => {
      const { getByTestId } = render(
        <HeaderBase
          startAccessory={<Text>Start</Text>}
          startAccessoryWrapperProps={{ testID: 'custom-start-wrapper' }}
        >
          Title
        </HeaderBase>,
      );

      expect(getByTestId('custom-start-wrapper')).toBeTruthy();
    });

    it('passes endAccessoryWrapperProps to end accessory wrapper', () => {
      const { getByTestId } = render(
        <HeaderBase
          endAccessory={<Text>End</Text>}
          endAccessoryWrapperProps={{ testID: 'custom-end-wrapper' }}
        >
          Title
        </HeaderBase>,
      );

      expect(getByTestId('custom-end-wrapper')).toBeTruthy();
    });
  });
});

