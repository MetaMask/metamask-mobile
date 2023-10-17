import React from 'react';
import { View, Linking, StyleSheet } from 'react-native';

import { storiesOf } from '@storybook/react-native';

import Text from '../app/components/Base/Text';
import Title from '../app/components/Base/Title';

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
});

storiesOf('Getting Started', module).add('Introduction', () => {
  const openMetaMaskMobileReadme = () => {
    Linking.openURL('https://github.com/MetaMask/metamask-mobile');
  };
  const openMetaMaskMobileStorybookDocumentationGuidelines = () => {
    Linking.openURL(
      'https://github.com/MetaMask/metamask-mobile/tree/develop/storybook/DOCUMENTATION_GUIDELINES.md',
    );
  };
  return (
    <View style={styles.wrapper}>
      <Title>Introduction</Title>
      <Text>Welcome to the MetaMask Mobile Storybook.</Text>
      <Title>Building Locally and Contributing</Title>
      <Text>
        If you are looking to get a local build of MetaMask Mobile up and
        running or contribute to the mobile app codebase please read the
        MetaMask{' '}
        <Text link onPress={openMetaMaskMobileReadme}>
          README.md
        </Text>
      </Text>
      <Title>Documentation Guidelines</Title>
      <Text>
        If you&apos;re here to improve our storybook documentation you&apos;re
        in the right place! Please head over to the{' '}
        <Text link onPress={openMetaMaskMobileStorybookDocumentationGuidelines}>
          Documentation Guidelines
        </Text>{' '}
        for contributing to component documentation in storybook.
      </Text>
    </View>
  );
});
