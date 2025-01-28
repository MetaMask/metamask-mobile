import { createAction } from '@reduxjs/toolkit';

export const dismissBanner = createAction<string>('DISMISS_BANNER');
