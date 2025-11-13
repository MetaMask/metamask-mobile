import React from 'react';
import { View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

interface XStocksSkeletonProps {
  count?: number;
}

const XStocksSkeleton: React.FC<XStocksSkeletonProps> = ({ count = 3 }) => (
  <SkeletonPlaceholder>
    {Array.from({ length: count }).map((_, index) => (
      <View
        key={`skeleton-${index}`}
        // eslint-disable-next-line react-native/no-inline-styles
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 8,
        }}
      >
        {/* Token Icon with Badge */}
        <View
          // eslint-disable-next-line react-native/no-inline-styles
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
          }}
        />
        {/* Left Container - Token Info */}
        <View
          // eslint-disable-next-line react-native/no-inline-styles
          style={{ flex: 1, marginLeft: 16 }}
        >
          <View
            // eslint-disable-next-line react-native/no-inline-styles
            style={{
              width: 80,
              height: 16,
              borderRadius: 4,
              marginBottom: 6,
            }}
          />
          <View
            // eslint-disable-next-line react-native/no-inline-styles
            style={{
              width: 120,
              height: 14,
              borderRadius: 4,
            }}
          />
        </View>
        {/* Right Container - Price Info */}
        <View
          // eslint-disable-next-line react-native/no-inline-styles
          style={{ alignItems: 'flex-end' }}
        >
          <View
            // eslint-disable-next-line react-native/no-inline-styles
            style={{
              width: 60,
              height: 16,
              borderRadius: 4,
              marginBottom: 6,
            }}
          />
          <View
            // eslint-disable-next-line react-native/no-inline-styles
            style={{
              width: 50,
              height: 14,
              borderRadius: 4,
            }}
          />
        </View>
      </View>
    ))}
  </SkeletonPlaceholder>
);

export default XStocksSkeleton;
