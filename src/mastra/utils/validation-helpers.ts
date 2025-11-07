/**
 * Calculate age from date of birth string (YYYY-MM-DD format)
 * @param dob Date of birth in YYYY-MM-DD format
 * @returns Age in years
 */
export function calculateAge(dob: string): number {
  const birthDate = new Date(dob);
  const today = new Date();
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Validate identification (cedula) format
 * Basic validation: not empty and alphanumeric
 * @param identification Identification number
 * @returns true if valid format
 */
export function validateIdentification(identification: string): boolean {
  if (!identification || identification.trim().length === 0) {
    return false;
  }
  
  // Basic validation: alphanumeric, at least 6 characters
  // Adjust regex based on your country's cedula format
  const identificationRegex = /^[A-Za-z0-9]{6,}$/;
  return identificationRegex.test(identification);
}

/**
 * Extract product ID from API response
 * Handles different response structures
 * @param response API response object
 * @returns Product ID as number or undefined
 */
export function extractProductId(response: any): number | undefined {
  if (!response) {
    return undefined;
  }
  
  // Try different possible response structures
  if (response.data?.id) {
    return typeof response.data.id === 'number' 
      ? response.data.id 
      : parseInt(response.data.id, 10);
  }
  
  if (response.data?.product_id) {
    return typeof response.data.product_id === 'number'
      ? response.data.product_id
      : parseInt(response.data.product_id, 10);
  }
  
  if (response.id) {
    return typeof response.id === 'number'
      ? response.id
      : parseInt(response.id, 10);
  }
  
  if (response.product_id) {
    return typeof response.product_id === 'number'
      ? response.product_id
      : parseInt(response.product_id, 10);
  }
  
  return undefined;
}

/**
 * Validate email format
 * @param email Email string
 * @returns true if valid email format
 */
export function validateEmail(email: string): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone format
 * Basic validation: not empty and contains digits
 * @param phone Phone string
 * @returns true if valid phone format
 */
export function validatePhone(phone: string): boolean {
  if (!phone) return false;
  // Basic validation: contains digits, allow +, -, spaces, parentheses
  const phoneRegex = /^[\d\s\+\-\(\)]{7,}$/;
  return phoneRegex.test(phone);
}







