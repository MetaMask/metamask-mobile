import { createAsyncMiddleware } from '@metamask/json-rpc-engine';
import { TransactionController } from '@metamask/transaction-controller';

/**
 * Creates RPC middleware for handling multichain api requests
 */
export function createMultichainRPCMiddleware() {
  return createAsyncMiddleware(async (req, res, next) => {
    // Check if this is a multichain RPC method
    if (!req.method.startsWith('multichain_')) {
      return next();
    }

    // Handle different multichain methods
    switch (req.method) {
      case 'multichain_getChains':
        return;

      case 'multichain_switchChain':
        try {
          res.result = switchChain(req.params[0]);
        } catch (error) {
          res.error = error;
        }
        return;

      case 'multichain_signTransaction':
        try {
          const { chainType, transaction } = req.params[0];
          res.result = await TransactionController.signTransaction(
            chainType,
            transaction,
          );
        } catch (error) {
          res.error = error;
        }
        return;

      // Add other multichain methods...

      default:
        res.error = {
          code: 4200,
          message: `${req.method} not supported`,
        };
        return;
    }
  });
}
