import { QrScanRequest } from '@metamask/eth-qr-keyring';
import { PayloadAction, createSlice } from '@reduxjs/toolkit';

export interface QrKeyringScannerState {
  pendingScanRequest?: QrScanRequest;
  isScanning: boolean;
}

export const initialState: QrKeyringScannerState = {
  isScanning: false,
};

const name = 'qrKeyringScanner';

const slice = createSlice({
  name,
  initialState,
  reducers: {
    scanRequested: (state, action: PayloadAction<QrScanRequest>) => {
      state.pendingScanRequest = action.payload;
      state.isScanning = true;
    },
    scanCompleted: (state) => {
      state.pendingScanRequest = undefined;
      state.isScanning = false;
    },
  },
});

const { actions, reducer } = slice;

export default reducer;
export const { scanRequested, scanCompleted } = actions;
