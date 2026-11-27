import React from 'react';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { BuySheetView } from '../views/BuySheetView';
import { collectiblesRoutes, type BuySheetParams } from '../routeNames';

export function BuySheet() {
  const navigation = useNavigation();
  const { name, priceUsd } =
    useRoute<
      RouteProp<
        Record<typeof collectiblesRoutes.buySheet, BuySheetParams>,
        typeof collectiblesRoutes.buySheet
      >
    >().params;

  return (
    <BuySheetView
      name={name}
      priceUsd={priceUsd}
      onDismiss={() => navigation.goBack()}
    />
  );
}
