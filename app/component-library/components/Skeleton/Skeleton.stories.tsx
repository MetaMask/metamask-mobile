/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react/display-name */

// Third party dependencies.
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';

// External dependencies.
import Text from '../Texts/Text';
import Button from '../Buttons/Button';
import { ButtonVariants } from '../Buttons/Button/Button.types';

// Internal dependencies.
import { default as SkeletonComponent } from './Skeleton';

const SkeletonMeta = {
  title: 'Component Library / Skeleton',
  component: SkeletonComponent,
  argTypes: {
    height: {
      control: { type: 'number' },
    },
    width: {
      control: { type: 'number' },
    },
    hideChildren: {
      control: { type: 'boolean' },
    },
  },
};

export default SkeletonMeta;

export const Skeleton = {
  args: {
    width: 300,
    height: 32,
  },
};

export const WidthHeight = () => {
  const styles = StyleSheet.create({
    container: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    },
  });

  return (
    <View style={styles.container}>
      <SkeletonComponent height={32} width={300} />
      <SkeletonComponent height={16} width={250} />
      <SkeletonComponent height={16} width={250} />
    </View>
  );
};

export const HideChildren = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const styles = StyleSheet.create({
    container: {
      marginBottom: 16,
    },
    skeleton: {
      alignSelf: 'flex-start',
    },
  });

  return (
    <View>
      <Button
        variant={ButtonVariants.Secondary}
        label="Toggle Loading"
        onPress={() => setIsLoaded(!isLoaded)}
        style={styles.container}
      />
      {isLoaded ? (
        <Text>Content to load</Text>
      ) : (
        <SkeletonComponent hideChildren style={styles.skeleton}>
          <Text>Content to load</Text>
        </SkeletonComponent>
      )}
    </View>
  );
};
