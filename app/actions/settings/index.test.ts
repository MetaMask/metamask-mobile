import { toggleBasicServices } from '.';
import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { initialState, settingsReducer } from '../../reducers/settings';

describe('settings, toggleBasicServices', () => {
  // describe('toggleBasicServices actions', () => {
  //   it('should disable certain api calls when set to true', () => {
  //     expect(toggleBasicServices(true)).toEqual({
  //       type: 'TOGGLE_BASIC_SERVICES',
  //       basicServicesEnabled: true,
  //     });
  //   });

  //   it('should enable api calls when set to false', () => {
  //     expect(toggleBasicServices(false)).toEqual({
  //       type: 'TOGGLE_BASIC_SERVICES',
  //       basicServicesEnabled: false,
  //     });
  //   });
  // });

  // TODO:
  // Mock the store  

  // 1. Mock the fetch request
  // 2. Test the toggleBasicServices functionality
  // 3. Test the fetch request with an error
  // 4. Test the fetch request with a successful response
  // 5. Test the fetch request with a disallowed URL
  // 6. Test the fetch request with an allowed URL
  // 7. Test the fetch request with an empty URL
  // 8. Test the fetch request with a non-string URL


  describe('toggleBasicServices functionality', () => {
    // Reset the mocks before each test
    // const originalFetch = fetchMock;
    const mockStore = configureMockStore([thunk]);
    const initialState2 = {}
    const store = mockStore(initialState2);
    // store.dispatch({
    //   type: 'TOGGLE_BASIC_SERVICES',
    //   basicServicesEnabled: false,
    // });
    // console.log("STORE", store.getState())
    const allowUrl = 'https://api.com';
    const denyUrl = 'https://infura.com';
    let fetchMock: any;

    beforeEach(() => {
      // Spy on fetch and mock its implementation
      fetchMock = jest.spyOn(globalThis, 'fetch');
    });

    afterEach(() => {
      // Restore the original fetch implementation after each test
      fetchMock.mockRestore();
    });

    it('fetches data with an error from an API', async () => {
      const errorMessage = 'API call failed';

      const expectedActions = [
        { type: 'TOGGLE_BASIC_SERVICES', basicServicesEnabled: false }
      ];

      // Dispatch the action
      await store.dispatch(toggleBasicServices(false));

      const expectedState = { ...initialState, basicServicesEnabled: false };

      // Get the dispatched actions
      const actions = store.getActions();
      const newState = actions.reduce(settingsReducer, initialState);

      // Test if your store dispatched the expected actions
      expect(store.getActions()).toEqual(expectedActions);
      expect(newState).toEqual(expectedState);

      // console.log("RESPONECE", response)
      // TODO: reject and expected responses
      fetchMock.mockImplementationOnce(() =>
        Promise.reject(new Error(errorMessage)),
      );
      await expect(fetch(denyUrl)).rejects.toThrow(errorMessage);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    // it('fetches data successfully from an API', async () => {
    //   fetchMock.mockImplementationOnce(() =>
    //     // Use 'fetchMock' instead of 'fetch'
    //     Promise.resolve({
    //       json: () => Promise.resolve({ data: 'expected data' }),
    //     }),
    //   );
    //   const response = await fetchMock(allowUrl); // Use 'fetchMock' instead of 'fetch'
    //   const result = await response.json();
    //   expect(result.data).toEqual('expected data');
    //   expect(fetchMock).toHaveBeenCalledTimes(1); // Use 'fetchMock' instead of 'fetch'
    // });
  });
});
