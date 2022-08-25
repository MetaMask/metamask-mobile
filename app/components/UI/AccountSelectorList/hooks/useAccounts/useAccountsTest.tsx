// TODO - Finish tests

// import { renderHook } from '@testing-library/react-hooks';
// import { useAccounts } from './useAccounts';

// const initialState = {
//   engine: {
//     backgroundState: {
//       PreferencesController: {
//         selectedAddress: '0xc4800C54cB70E7Dac746C2fA829da0004443613e',
//         identities: {
//           '0xc4800C54cB70E7Dac746C2fA829da0004443613e': { name: 'Account 1' },
//         },
//       },
//       NetworkController: {
//         network: '1',
//         provider: {
//           ticker: 'ETH',
//         },
//       },
//       CurrencyRateController: {
//         conversionRate: 1641.87,
//         currentCurrency: 'usd',
//       },
//       AccountTrackerController: {
//         accounts: {
//           '0xc4800C54cB70E7Dac746C2fA829da0004443613e': {
//             balance: '0x0',
//           },
//         },
//       },
//     },
//   },
// };

// jest.mock('react-redux', () => ({
//   ...jest.requireActual('react-redux'),
//   useSelector: jest.fn().mockImplementation((cb) => cb(initialState)),
// }));

// jest.mock('../../../../../core/Engine', () => ({
//   context: {
//     KeyringController: {
//       state: {
//         keyrings: [
//           {
//             accounts: ['0xc4800C54cB70E7Dac746C2fA829da0004443613e'],
//             type: 'HD Key Tree',
//           },
//         ],
//       },
//     },
//   },
// }));

// describe('useAccounts', () => {
//   test('it should start with a state of "Loading"', async () => {
//     const { result, waitForNextUpdate } = renderHook(() => useAccounts());
//     jest.runAllTimers();
//     await waitForNextUpdate();

//     // TODO - Actually test hook
//     expect(true).toBeTruthy();
//   });
// });
