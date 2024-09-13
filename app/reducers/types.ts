// this module's purpose is to re-export useful types like RootState
// make it easy for js files like app/reducers/swaps/index.js to import RootState without triggering an import cycle

export type { RootState } from './';
