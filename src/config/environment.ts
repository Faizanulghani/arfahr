export const config = {
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
  APP_NAME: 'AfraExpress Attendance System',
  VERSION: '1.0.0',
  ENVIRONMENT: import.meta.env.MODE || 'development',
  
  // Laravel API specific settings
  CSRF_COOKIE_NAME: 'XSRF-TOKEN',
  SESSION_COOKIE_NAME: 'laravel_session',
  
  // Pagination settings
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  
  // File upload settings
  MAX_FILE_SIZE: 5 * 1024 * 1024, 
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/jpg'],
  
  // Attendance settings
  WORK_START_TIME: '09:00',
  WORK_END_TIME: '17:00',
  LATE_THRESHOLD_MINUTES: 15,
};

export default config;