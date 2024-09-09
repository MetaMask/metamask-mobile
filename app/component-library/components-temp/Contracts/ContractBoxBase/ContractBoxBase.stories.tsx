/* eslint-disable no-console */
import React from 'react';
import { View, ImageSourcePropType } from 'react-native';
import { createStore, combineReducers } from 'redux';
import { Provider } from 'react-redux';
import { Meta, StoryObj } from '@storybook/react-native';
import ContractBoxBase from './ContractBoxBase';
import TEST_ADDRESS from '../../../../constants/address';
import {
  EXPORT_ICON_TEST_ID,
  COPY_ICON_TEST_ID,
  CONTRACT_BOX_TEST_ID,
  CONTRACT_BOX_NO_PET_NAME_TEST_ID,
} from './ContractBoxBase.constants';

const contractAddress = TEST_ADDRESS;
const contractPetName = 'My Contract';
const contractLocalImage: ImageSourcePropType = { uri: 'https://example.com/image.png' };

const initialState = {
  contracts: {
    selectedAddress: contractAddress,
  },
};

const rootReducer = combineReducers({
  contracts: (state = initialState.contracts) => state,
});

const store = createStore(rootReducer);

const defaultProps = {
  contractAddress,
  contractPetName,
  contractLocalImage,
  onCopyAddress: () => console.log('Copy address'),
  onExportAddress: () => console.log('Export address'),
  onContractPress: () => console.log('Contract pressed'),
  hasBlockExplorer: true,
};

const WithReduxProvider = ({ children }: { children: React.ReactNode }) => (
  <Provider store={store}>{children}</Provider>
);

const meta: Meta<typeof ContractBoxBase> = {
  title: 'Components Temp / Contracts / ContractBoxBase',
  component: ContractBoxBase,
  decorators: [
    (Story) => (
      <WithReduxProvider>
        <View>
          <Story />
        </View>
      </WithReduxProvider>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof ContractBoxBase>;

export const Default: Story = {
  args: defaultProps,
};

export const WithoutPetName: Story = {
  args: {
    ...defaultProps,
    contractPetName: undefined,
  },
};

export const WithoutBlockExplorer: Story = {
  args: {
    ...defaultProps,
    hasBlockExplorer: false,
  },
};

export const WithoutLocalImage: Story = {
  args: {
    ...defaultProps,
    contractLocalImage: undefined,
  },
};
