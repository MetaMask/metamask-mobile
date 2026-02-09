import React, { type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import ListItemSelect from '../../../../../component-library/components/List/ListItemSelect';
import ListItemColumn, {
  WidthType,
} from '../../../../../component-library/components/List/ListItemColumn';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import QuoteDisplay from './QuoteDisplay';

const ROW_COUNT = 8;
const LOGO_SIZE = 44;
const NAME_SKELETON_WIDTH = 120;
const NAME_SKELETON_HEIGHT = 18;
const DELAY_SKELETON_WIDTH = 80;
const DELAY_SKELETON_HEIGHT = 14;
const SKELETON_GAP = 6;

const styles = StyleSheet.create({
  skeleton: {
    borderRadius: 4,
  },
  logoSkeleton: {
    borderRadius: LOGO_SIZE / 2,
  },
  leftTextColumn: {
    gap: SKELETON_GAP,
  },
});

function PaymentMethodListSkeleton(): ReactElement {
  return (
    <>
      {Array.from({ length: ROW_COUNT }).map((_, index) => (
        <ListItemSelect
          key={`skeleton-${index}`}
          isSelected={false}
          isDisabled
          onPress={undefined}
        >
          <ListItemColumn widthType={WidthType.Auto}>
            <Skeleton
              width={LOGO_SIZE}
              height={LOGO_SIZE}
              style={styles.logoSkeleton}
            />
          </ListItemColumn>
          <ListItemColumn widthType={WidthType.Fill}>
            <View style={styles.leftTextColumn}>
              <Skeleton
                width={NAME_SKELETON_WIDTH}
                height={NAME_SKELETON_HEIGHT}
                style={styles.skeleton}
              />
              <Skeleton
                width={DELAY_SKELETON_WIDTH}
                height={DELAY_SKELETON_HEIGHT}
                style={styles.skeleton}
              />
            </View>
          </ListItemColumn>
          <ListItemColumn widthType={WidthType.Auto}>
            <QuoteDisplay cryptoAmount="" fiatAmount={null} isLoading />
          </ListItemColumn>
        </ListItemSelect>
      ))}
    </>
  );
}

export default PaymentMethodListSkeleton;
