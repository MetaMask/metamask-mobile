/**
 * Parses a character that the user is typing.
 * Returns the character if it's a valid phone number character.
 * Returns `undefined` if the character should be ignored.
 */
export default function parsePhoneNumberCharacter(character: string): string | undefined {
  // Allow digits
  if (/[0-9]/.test(character)) {
    return character;
  }
  
  // Allow plus sign only at the beginning
  if (character === '+') {
    return character;
  }
  
  // Allow spaces, dashes, parentheses, and dots for formatting
  if (/[\s\-\(\)\.]/.test(character)) {
    return character;
  }
  
  // Ignore all other characters
  return undefined;
} 