import React from 'react';
import { render } from '@testing-library/react-native';
import DataCollectionModal from './'; // Adjust the import path as necessary
import { strings } from '../../../../locales/i18n';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DataCollectionBottomSheetSelectorsIDs } from './DataCollectionBottomSheet.testIds';

jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn().mockReturnValue('Mocked string'),
}));

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 1, right: 2, bottom: 3, left: 4 };
  const frame = { width: 5, height: 6, x: 7, y: 8 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
    useSafeAreaFrame: jest.fn().mockImplementation(() => frame),
  };
});

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

describe('DataCollectionModal', () => {
  it('renders icon and content', () => {
    const { getByTestId } = render(<DataCollectionModal />);

    expect(
      getByTestId(DataCollectionBottomSheetSelectorsIDs.ICON_WARNING),
    ).toBeTruthy(); // Assuming you add testID='icon-warning' to your Icon component

    expect(strings).toHaveBeenCalledWith('data_collection_modal.content');
    expect(strings).toHaveBeenCalledWith('data_collection_modal.accept');
  });

  it('should render expected snapshot', () => {
    const { toJSON } = render(
      <SafeAreaProvider>
        <DataCollectionModal />
      </SafeAreaProvider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
