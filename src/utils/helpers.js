// Clean text
export const cleanText = (text) => {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n');
};

// Validate request
export const validateProcessRequest = (data) => {
  const errors = [];

  if (!data.text) {
    errors.push('Text is required');
  }

  if (data.text && data.text.length < 50) {
    errors.push('Text must be at least 50 characters');
  }

  if (!data.userId) {
    errors.push('User ID is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};