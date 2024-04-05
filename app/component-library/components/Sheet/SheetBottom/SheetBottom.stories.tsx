// Third party dependencies.
import React, { useRef } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

// External dependencies.
import Text, { TextVariant } from '../../Texts/Text';

// Internal dependencies.
import { default as SheetBottomComponent } from './SheetBottom';
import { SheetBottomRef } from './SheetBottom.types';

const styles = StyleSheet.create({
  wrappedContent: {
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const SheetBottomExample = () => {
  const bottomSheetRef = useRef<SheetBottomRef | null>(null);

  return (
    <SheetBottomComponent
      onDismissed={() => Alert.alert('Dismissed sheet!')}
      ref={bottomSheetRef}
      isInteractable
    >
      <View style={styles.wrappedContent}>
        <Text variant={TextVariant.BodySM}>{'Wrapped Content'}</Text>
      </View>
    </SheetBottomComponent>
  );
};

const SheetBottomMeta = {
  title: 'Component Library / Sheet',
  component: SheetBottomComponent,
};

export default SheetBottomMeta;

export const SheetBottom = () => <SheetBottomExample />;
