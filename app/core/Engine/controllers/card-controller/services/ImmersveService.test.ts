import axios from 'axios';
import { ImmersveService } from './ImmersveService';

jest.mock('axios');
jest.mock('../../../../../util/Logger');

const mockAxiosCreate = axios.create as jest.Mock;
const mockRequest = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockAxiosCreate.mockReturnValue({ request: mockRequest });
  mockRequest.mockResolvedValue({ data: { result: 'ok' }, status: 200 });
});

describe('ImmersveService', () => {
  it('does not bake a baseURL into the axios instance', () => {
    new ImmersveService({ getBaseUrl: () => 'https://a.example' });

    expect(mockAxiosCreate).toHaveBeenCalledWith(
      expect.not.objectContaining({ baseURL: expect.anything() }),
    );
  });

  it('resolves baseURL from the thunk on each request', async () => {
    let base = 'https://first.example';
    const service = new ImmersveService({ getBaseUrl: () => base });

    await service.get('/v1/test');
    expect(mockRequest).toHaveBeenLastCalledWith(
      expect.objectContaining({ baseURL: 'https://first.example' }),
    );

    base = 'https://second.example';
    await service.get('/v1/test');
    expect(mockRequest).toHaveBeenLastCalledWith(
      expect.objectContaining({ baseURL: 'https://second.example' }),
    );
  });
});
