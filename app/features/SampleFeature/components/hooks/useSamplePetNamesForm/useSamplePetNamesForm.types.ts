/**
 * Sample useSamplePetNamesForm return types
 *
 * @sampleFeature do not use in production code
 */
export interface UseSamplePetNamesFormReturn {
  address: string;
  setAddress: (address: string) => void;
  name: string;
  setName: (name: string) => void;
  isValid: boolean;
  onSubmit: () => void;
  reset: () => void;
}
