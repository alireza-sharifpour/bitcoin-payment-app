// Jest setup file for global test configuration
// This file runs before each test file

// Set environment variables for tests
process.env.BLOCKCYPHER_TOKEN = 'test-token-123';
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_APP_URL = 'https://test.example.com';

// Optional: Setup global test utilities or mocks here
// For now, we'll keep it minimal
