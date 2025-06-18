import { renderHook, act } from '@testing-library/react-hooks';

/**
 * Unit tests for the blockaid validation logic.
 * These tests isolate the validation logic to ensure it handles different response scenarios correctly.
 */

describe('Blockaid Validation Logic', () => {
  const mockNavigate = jest.fn();
  const mockDispatch = jest.fn();
  const mockValidateBridgeTx = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Simulate the handleContinue logic extracted for testing
  const handleContinueLogic = async (activeQuote: any, validateBridgeTx: any, navigate: any, dispatch: any) => {
    if (activeQuote) {
      dispatch({ type: 'setIsSubmittingTx', payload: true });
      
      try {
        const validationResult = await validateBridgeTx({
          quoteResponse: activeQuote,
        });

        if (validationResult.error || validationResult.result?.validation?.reason) {
          const isValidationError = !!validationResult.result?.validation?.reason;
          navigate('BRIDGE_MODALS_ROOT', {
            screen: 'BLOCKAID_MODAL',
            params: {
              errorType: isValidationError ? 'validation' : 'simulation',
              errorMessage: isValidationError 
                ? validationResult.result.validation.reason 
                : validationResult.error,
            },
          });
          return;
        }
        
        // If validation passes, continue with transaction submission
        console.log('Validation passed, would proceed with transaction');
        
      } catch (error) {
        console.error('Error submitting bridge tx', error);
      } finally {
        dispatch({ type: 'setIsSubmittingTx', payload: false });
      }
    }
  };

  it('should navigate to blockaid modal with validation error', async () => {
    const mockQuote = { id: 'test-quote' };
    
    mockValidateBridgeTx.mockResolvedValue({
      result: {
        validation: {
          reason: 'Transaction may result in loss of funds',
        },
      },
    });

    await act(async () => {
      await handleContinueLogic(mockQuote, mockValidateBridgeTx, mockNavigate, mockDispatch);
    });

    expect(mockValidateBridgeTx).toHaveBeenCalledWith({
      quoteResponse: mockQuote,
    });

    expect(mockNavigate).toHaveBeenCalledWith('BRIDGE_MODALS_ROOT', {
      screen: 'BLOCKAID_MODAL',
      params: {
        errorType: 'validation',
        errorMessage: 'Transaction may result in loss of funds',
      },
    });

    expect(mockDispatch).toHaveBeenCalledWith({ type: 'setIsSubmittingTx', payload: true });
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'setIsSubmittingTx', payload: false });
  });

  it('should navigate to blockaid modal with simulation error', async () => {
    const mockQuote = { id: 'test-quote' };
    
    mockValidateBridgeTx.mockResolvedValue({
      error: 'Simulation failed: Insufficient balance for transaction',
      result: {
        validation: {
          reason: null,
        },
      },
    });

    await act(async () => {
      await handleContinueLogic(mockQuote, mockValidateBridgeTx, mockNavigate, mockDispatch);
    });

    expect(mockNavigate).toHaveBeenCalledWith('BRIDGE_MODALS_ROOT', {
      screen: 'BLOCKAID_MODAL',
      params: {
        errorType: 'simulation',
        errorMessage: 'Simulation failed: Insufficient balance for transaction',
      },
    });
  });

  it('should prioritize validation error over simulation error', async () => {
    const mockQuote = { id: 'test-quote' };
    
    mockValidateBridgeTx.mockResolvedValue({
      error: 'Simulation failed: Some simulation error',
      result: {
        validation: {
          reason: 'Transaction flagged as suspicious',
        },
      },
    });

    await act(async () => {
      await handleContinueLogic(mockQuote, mockValidateBridgeTx, mockNavigate, mockDispatch);
    });

    expect(mockNavigate).toHaveBeenCalledWith('BRIDGE_MODALS_ROOT', {
      screen: 'BLOCKAID_MODAL',
      params: {
        errorType: 'validation',
        errorMessage: 'Transaction flagged as suspicious',
      },
    });
  });

  it('should proceed without blockaid modal when validation passes', async () => {
    const mockQuote = { id: 'test-quote' };
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    mockValidateBridgeTx.mockResolvedValue({
      result: {
        validation: {
          reason: null,
        },
      },
    });

    await act(async () => {
      await handleContinueLogic(mockQuote, mockValidateBridgeTx, mockNavigate, mockDispatch);
    });

    expect(mockNavigate).not.toHaveBeenCalledWith('BRIDGE_MODALS_ROOT', {
      screen: 'BLOCKAID_MODAL',
      params: expect.any(Object),
    });

    expect(consoleSpy).toHaveBeenCalledWith('Validation passed, would proceed with transaction');
    
    consoleSpy.mockRestore();
  });

  it('should handle validation hook errors gracefully', async () => {
    const mockQuote = { id: 'test-quote' };
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    mockValidateBridgeTx.mockRejectedValue(new Error('Network error'));

    await act(async () => {
      await handleContinueLogic(mockQuote, mockValidateBridgeTx, mockNavigate, mockDispatch);
    });

    expect(consoleSpy).toHaveBeenCalledWith('Error submitting bridge tx', expect.any(Error));
    
    expect(mockNavigate).not.toHaveBeenCalledWith('BRIDGE_MODALS_ROOT', {
      screen: 'BLOCKAID_MODAL',
      params: expect.any(Object),
    });

    expect(mockDispatch).toHaveBeenCalledWith({ type: 'setIsSubmittingTx', payload: false });
    
    consoleSpy.mockRestore();
  });

  it('should handle malformed validation responses', async () => {
    const mockQuote = { id: 'test-quote' };
    
    mockValidateBridgeTx.mockResolvedValue({
      // Missing result property
    });

    await act(async () => {
      await handleContinueLogic(mockQuote, mockValidateBridgeTx, mockNavigate, mockDispatch);
    });

    // Should not crash and should not navigate to blockaid modal
    expect(mockNavigate).not.toHaveBeenCalledWith('BRIDGE_MODALS_ROOT', {
      screen: 'BLOCKAID_MODAL',
      params: expect.any(Object),
    });

    expect(mockDispatch).toHaveBeenCalledWith({ type: 'setIsSubmittingTx', payload: false });
  });

  it('should handle undefined validation responses', async () => {
    const mockQuote = { id: 'test-quote' };
    
    mockValidateBridgeTx.mockResolvedValue(undefined);

    await act(async () => {
      await handleContinueLogic(mockQuote, mockValidateBridgeTx, mockNavigate, mockDispatch);
    });

    // Should not crash and should not navigate to blockaid modal
    expect(mockNavigate).not.toHaveBeenCalledWith('BRIDGE_MODALS_ROOT', {
      screen: 'BLOCKAID_MODAL',
      params: expect.any(Object),
    });
  });
}); 