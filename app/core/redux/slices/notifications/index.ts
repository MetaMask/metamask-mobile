import { createSlice } from '@reduxjs/toolkit';

interface NotificationsAccountsState {
  [address: string]: boolean;
}

const initialState: NotificationsAccountsState = {};

const name = 'notificationsAccountsProvider';

const slice = createSlice({
  name,
  initialState,
  reducers: {},
});

const { reducer } = slice;

export default reducer;
