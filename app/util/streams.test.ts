import { jsonParseStream, jsonStringifyStream, setupMultiplex } from './streams';
import Through from 'through2';
import ObjectMultiplex from '@metamask/object-multiplex';
import pump from 'pump';

jest.mock('through2');
jest.mock('@metamask/object-multiplex');
jest.mock('pump');

describe('streams', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('jsonParseStream', () => {
    it('should parse JSON strings', (done) => {
      const mockThrough = {
        push: jest.fn(),
      };
      (Through.obj as jest.Mock).mockImplementation((callback) => {
        callback.call(mockThrough, '{"key":"value"}', null, () => {});
        return mockThrough;
      });

      const stream = jsonParseStream();
      expect(Through.obj).toHaveBeenCalled();
      expect(mockThrough.push).toHaveBeenCalledWith({ key: 'value' });
      done();
    });

    it('should handle JSON parse errors', (done) => {
      const mockThrough = {
        push: jest.fn(),
      };
      const mockCallback = jest.fn();
      (Through.obj as jest.Mock).mockImplementation((callback) => {
        callback.call(mockThrough, 'invalid json', null, mockCallback);
        return mockThrough;
      });

      jsonParseStream();
      expect(mockCallback).toHaveBeenCalledWith(expect.any(Error));
      done();
    });
  });

  describe('jsonStringifyStream', () => {
    it('should stringify objects', (done) => {
      const mockThrough = {
        push: jest.fn(),
      };
      (Through.obj as jest.Mock).mockImplementation((callback) => {
        callback.call(mockThrough, { key: 'value' }, null, () => {});
        return mockThrough;
      });

      const stream = jsonStringifyStream();
      expect(Through.obj).toHaveBeenCalled();
      expect(mockThrough.push).toHaveBeenCalledWith('{"key":"value"}');
      done();
    });

    it('should handle stringify errors', (done) => {
      const mockThrough = {
        push: jest.fn(),
      };
      const mockCallback = jest.fn();
      const circularObj: any = {};
      circularObj.circular = circularObj;
      (Through.obj as jest.Mock).mockImplementation((callback) => {
        callback.call(mockThrough, circularObj, null, mockCallback);
        return mockThrough;
      });

      jsonStringifyStream();
      expect(mockCallback).toHaveBeenCalledWith(expect.any(Error));
      done();
    });
  });

  describe('setupMultiplex', () => {
    it('should set up stream multiplexing', () => {
      const mockConnectionStream = {} as NodeJS.ReadWriteStream;
      const mockMux = {} as NodeJS.ReadWriteStream;

      (ObjectMultiplex as jest.Mock).mockReturnValue(mockMux);
      (pump as jest.Mock).mockImplementation((stream1, stream2, stream3, callback) => {
        callback(null);
      });

      const result = setupMultiplex(mockConnectionStream);

      expect(ObjectMultiplex).toHaveBeenCalled();
      expect(pump).toHaveBeenCalledWith(
        mockConnectionStream,
        mockMux,
        mockConnectionStream,
        expect.any(Function)
      );
      expect(result).toBe(mockMux);
    });

    it('should handle errors in pump', () => {
      const mockConnectionStream = {} as NodeJS.ReadWriteStream;
      const mockMux = {} as NodeJS.ReadWriteStream;
      const mockError = new Error('Pump error');

      (ObjectMultiplex as jest.Mock).mockReturnValue(mockMux);
      (pump as jest.Mock).mockImplementation((stream1, stream2, stream3, callback) => {
        callback(mockError);
      });

      console.warn = jest.fn();

      setupMultiplex(mockConnectionStream);

      expect(console.warn).toHaveBeenCalledWith('Multiplexing error:', mockError);
    });
  });
});
