export class FetchError extends Error {
  url?: string;
  constructor(message?: string, url?: string) {
    super(message);
    this.url = url;
  }
}

interface Loading<T> {
  type: 'Loading';
  data?: T;
}
interface Success<T> {
  type: 'Success';
  data: T;
}
interface Error<T> {
  type: 'Error';
  data?: T;
  error?: FetchError;
  message?: string;
}

export type FetchState<T> = Loading<T> | Error<T> | Success<T>;
