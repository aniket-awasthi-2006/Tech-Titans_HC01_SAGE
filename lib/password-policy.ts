export function validateAdminPassword(password: string): string | null {
  if (password.length < 12) return 'Admin password must be at least 12 characters.';
  if (!/[A-Z]/.test(password)) return 'Admin password must include an uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Admin password must include a lowercase letter.';
  if (!/[0-9]/.test(password)) return 'Admin password must include a number.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Admin password must include a special character.';
  return null;
}

export function validateStaffPassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must include at least one letter and one number.';
  }
  return null;
}
