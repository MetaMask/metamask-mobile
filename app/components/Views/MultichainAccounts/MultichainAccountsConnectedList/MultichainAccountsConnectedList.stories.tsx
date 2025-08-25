/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react/display-name */
// Third party dependencies
import React from 'react';
import { AccountGroupObject } from '@metamask/account-tree-controller';

// External dependencies
import { mockTheme } from '../../../../util/theme';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { withNavigation } from '../../../../../.storybook/decorators';

// Internal dependencies
import MultichainAccountsConnectedList from './MultichainAccountsConnectedList';
import { createMockAccountGroup } from '../../../../component-library/components-temp/MultichainAccounts/test-utils';

// No mock store needed - component only uses props

// Mock account groups for different scenarios
const createMockAccountGroups = (count: number): AccountGroupObject[] => {
  const groups: AccountGroupObject[] = [];

  for (let i = 1; i <= count; i++) {
    groups.push(
      createMockAccountGroup(`group-${i}`, `Account ${i}`, [`account-${i}`]),
    );
  }

  return groups;
};

// Simple wrapper component for consistent styling
const StoryContainer = ({ children }: { children: React.ReactNode }) => {
  const tw = useTailwind();

  const WrappedStory = () => (
    <Box
      style={tw.style('flex-1 p-4', {
        backgroundColor: mockTheme.colors.background.default,
      })}
    >
      {children}
    </Box>
  );

  return withNavigation(WrappedStory);
};

// Sample account groups
const NO_ACCOUNTS: AccountGroupObject[] = [];
const ONE_ACCOUNT = createMockAccountGroups(1);
const THREE_ACCOUNTS = createMockAccountGroups(3);

// Default props
const defaultProps = {
  privacyMode: false,
  handleEditAccountsButtonPress: () => {
    // Handle edit accounts button press
  },
};

const InteractiveStoryContainer = ({
  privacyMode,
  accountCount,
}: {
  privacyMode: boolean;
  accountCount: number;
}) => {
  const tw = useTailwind();
  const accountGroups = createMockAccountGroups(accountCount);

  const WrappedStory = () => (
    <Box
      style={tw.style('flex-1 p-4', {
        backgroundColor: mockTheme.colors.background.default,
      })}
    >
      <Text variant={TextVariant.BodyMDBold} style={tw.style('mb-4')}>
        Interactive Demo
      </Text>
      <Text
        variant={TextVariant.BodySM}
        style={tw.style('mb-6', { color: mockTheme.colors.text.muted })}
      >
        Use the controls below to adjust the component properties.
      </Text>
      <MultichainAccountsConnectedList
        {...defaultProps}
        selectedAccountGroups={accountGroups}
        privacyMode={privacyMode}
      />
    </Box>
  );

  return withNavigation(WrappedStory);
};

const MultichainAccountsConnectedListMeta = {
  title: 'Component Library / Views / MultichainAccountsConnectedList',
  component: MultichainAccountsConnectedList,
  argTypes: {
    privacyMode: {
      control: { type: 'boolean' },
      description: 'Whether privacy mode is enabled',
    },
    selectedAccountGroups: {
      control: { type: 'object' },
      description: 'Array of selected account groups',
    },
  },
};

export default MultichainAccountsConnectedListMeta;

// Individual stories for each scenario
export const NoAccounts = {
  render: () => (
    <StoryContainer>
      <MultichainAccountsConnectedList
        {...defaultProps}
        selectedAccountGroups={NO_ACCOUNTS}
      />
    </StoryContainer>
  ),
};

export const OneAccount = {
  render: () => (
    <StoryContainer>
      <MultichainAccountsConnectedList
        {...defaultProps}
        selectedAccountGroups={ONE_ACCOUNT}
      />
    </StoryContainer>
  ),
};

export const ThreeAccounts = {
  render: () => (
    <StoryContainer>
      <MultichainAccountsConnectedList
        {...defaultProps}
        selectedAccountGroups={THREE_ACCOUNTS}
      />
    </StoryContainer>
  ),
};

export const WithPrivacyMode = {
  render: () => (
    <StoryContainer>
      <MultichainAccountsConnectedList
        {...defaultProps}
        selectedAccountGroups={THREE_ACCOUNTS}
        privacyMode
      />
    </StoryContainer>
  ),
};

// Interactive story with controls
export const Interactive = {
  render: (args: { privacyMode: boolean; accountCount: number }) => (
    <InteractiveStoryContainer
      privacyMode={args.privacyMode}
      accountCount={args.accountCount}
    />
  ),
  args: {
    privacyMode: false,
    accountCount: 3,
  },
  argTypes: {
    privacyMode: {
      control: { type: 'boolean' },
      description: 'Enable or disable privacy mode',
    },
    accountCount: {
      control: {
        type: 'range',
        min: 0,
        max: 10,
        step: 1,
      },
      description: 'Number of account groups to display',
    },
  },
};
