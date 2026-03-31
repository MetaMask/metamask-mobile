import {
  SubscriptionBenefitDto,
  SubscriptionBenefitsState,
} from '../../core/Engine/controllers/rewards-controller/types';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface BenefitsState {
  benefits: SubscriptionBenefitDto[];
  benefitsLoading: boolean;
  benefitsError: boolean;
  lastFetched: number;
}

export const initialState: BenefitsState = {
  benefits: [],
  benefitsLoading: false,
  benefitsError: false,
  lastFetched: 0,
};

const benefitsSlice = createSlice({
  name: 'rewards',
  initialState,
  reducers: {
    setBenefits: (state, action: PayloadAction<SubscriptionBenefitsState>) => {
      state.benefits = action.payload.benefits;
      state.lastFetched = action.payload.lastFetched;
    },
    setBenefitsLoading: (state, action: PayloadAction<boolean>) => {
      state.benefitsLoading = action.payload;
    },
    setBenefitsError: (state, action: PayloadAction<boolean>) => {
      state.benefitsError = action.payload;
    },
  },
});

export const {
  setBenefits,
  setBenefitsError,
  setBenefitsLoading,
} = benefitsSlice.actions;

export default benefitsSlice.reducer;
