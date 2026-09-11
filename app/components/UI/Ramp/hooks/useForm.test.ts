import { renderHook, act } from '@testing-library/react-hooks';
import { useForm } from './useForm';

describe('useForm', () => {
  interface TestForm {
    name: string;
    email: string;
  }

  const mockValidator = jest.fn((data: TestForm) => {
    const errors: Record<string, string> = {};

    if (!data.name) {
      errors.name = 'Name is required';
    }

    if (!data.email) {
      errors.email = 'Email is required';
    } else if (!data.email.includes('@')) {
      errors.email = 'Invalid email format';
    }

    return errors;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with initial form data and empty errors', () => {
    const initialFormData = { name: '', email: '' };

    const { result } = renderHook(() =>
      useForm<TestForm>({
        initialFormData,
        validateForm: mockValidator,
      }),
    );

    expect(result.current.formData).toEqual(initialFormData);
    expect(result.current.errors).toEqual({});
    expect(typeof result.current.handleChange).toBe('function');
    expect(typeof result.current.validateFormData).toBe('function');
  });

  it('should update form data when handleChange is called', () => {
    const initialFormData = { name: '', email: '' };

    const { result } = renderHook(() =>
      useForm<TestForm>({
        initialFormData,
        validateForm: mockValidator,
      }),
    );

    act(() => {
      result.current.handleChange('name', 'John Doe');
    });

    expect(result.current.formData).toEqual({
      name: 'John Doe',
      email: '',
    });
  });

  it('should clear field error when changing a field with an error', () => {
    const initialFormData = { name: '', email: '' };
    mockValidator.mockReturnValueOnce({ name: 'Name is required', email: '' });

    const { result } = renderHook(() =>
      useForm<TestForm>({
        initialFormData,
        validateForm: mockValidator,
      }),
    );

    act(() => {
      result.current.validateFormData();
    });

    expect(result.current.errors).toEqual({
      name: 'Name is required',
      email: '',
    });

    act(() => {
      result.current.handleChange('name', 'John Doe');
    });

    expect(result.current.errors).toEqual({ name: '', email: '' });
  });

  it('should not clear other field errors when changing a field', () => {
    const initialFormData = { name: '', email: '' };
    mockValidator.mockReturnValueOnce({
      name: 'Name is required',
      email: 'Email is required',
    });

    const { result } = renderHook(() =>
      useForm<TestForm>({
        initialFormData,
        validateForm: mockValidator,
      }),
    );

    act(() => {
      result.current.validateFormData();
    });

    expect(result.current.errors).toEqual({
      name: 'Name is required',
      email: 'Email is required',
    });

    act(() => {
      result.current.handleChange('name', 'John Doe');
    });

    expect(result.current.errors).toEqual({
      name: '',
      email: 'Email is required',
    });
  });

  it('should validate form data and update errors', () => {
    const initialFormData = { name: '', email: 'invalidemail' };
    mockValidator.mockReturnValueOnce({
      name: 'Name is required',
      email: 'Invalid email format',
    });

    const { result } = renderHook(() =>
      useForm<TestForm>({
        initialFormData,
        validateForm: mockValidator,
      }),
    );

    let isValid;
    act(() => {
      isValid = result.current.validateFormData();
    });

    expect(isValid).toBe(false);
    expect(result.current.errors).toEqual({
      name: 'Name is required',
      email: 'Invalid email format',
    });
    expect(mockValidator).toHaveBeenCalledWith(initialFormData);
  });

  it('should return true from validateFormData when form is valid', () => {
    const initialFormData = { name: 'John Doe', email: 'john@example.com' };
    mockValidator.mockReturnValueOnce({});

    const { result } = renderHook(() =>
      useForm<TestForm>({
        initialFormData,
        validateForm: mockValidator,
      }),
    );

    let isValid;
    act(() => {
      isValid = result.current.validateFormData();
    });

    expect(isValid).toBe(true);
    expect(result.current.errors).toEqual({});
    expect(mockValidator).toHaveBeenCalledWith(initialFormData);
  });

  it('should preserve field values of different types', () => {
    interface ComplexForm {
      name: string;
      age: number;
      isActive: boolean;
    }

    const initialFormData = { name: '', age: 0, isActive: false };
    const complexValidator = jest.fn(() => ({}));

    const { result } = renderHook(() =>
      useForm<ComplexForm>({
        initialFormData,
        validateForm: complexValidator,
      }),
    );

    act(() => {
      result.current.handleChange('name', 'John Doe');
      result.current.handleChange('age', '30');
      result.current.handleChange('isActive', 'true');
    });

    expect(result.current.formData).toEqual({
      name: 'John Doe',
      age: '30',
      isActive: 'true',
    });
  });
});
