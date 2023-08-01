class TransactionError extends Error {
  constructor(message: string) {
    super(message);

    Object.setPrototypeOf(this, TransactionError.prototype);

    this.name = this.constructor.name

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

class ApproveTransactionError extends TransactionError{}

class CancelTransactionError extends TransactionError{}

class SpeedupTransactionError extends TransactionError{}

export  {
  TransactionError,
  CancelTransactionError,
  ApproveTransactionError,
  SpeedupTransactionError
}
