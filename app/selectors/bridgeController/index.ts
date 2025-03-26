import { RootState } from '../../reducers';

export const getQuoteRequest = (state: RootState) => {
    const { quoteRequest } = state.engine.backgroundState.BridgeController;
    return quoteRequest;
};