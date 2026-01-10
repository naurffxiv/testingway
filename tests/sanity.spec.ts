// tests/sanity.spec.ts
import { test, expect } from '@playwright/test';

/**
 * Sanity Check Test Suite
 * Health checks for all NAUR ecosystem services
 */

test.describe('NAUR Ecosystem Health Checks', () => {
  
  // Frontend: Usually serves 200 OK on root
  test('naurffxiv (Site) should respond with 200 OK', async ({ request }) => {
    const url = process.env.NAURFFXIV_URL || 'http://naurffxiv:3000';
    console.log(`Checking Site at: ${url}`);
    
    const response = await request.get(url);
    expect(response.status()).toBe(200);
  });

  // Backend: Usually needs a specific endpoint like /health
  test('moddingway (Bot API) should respond with 200 OK', async ({ request }) => {
    const baseUrl = process.env.MODDINGWAY_URL || 'http://moddingway:8000';
    const url = `${baseUrl}/health`; 
    console.log(`Checking Bot at: ${url}`);

    const response = await request.get(url);
    expect(response.status(), `Failed to connect to ${url}`).toBe(200);
  });

  // Backend: Usually needs a specific endpoint like /health
  test('authingway (Auth API) should respond with 200 OK', async ({ request }) => {
    const baseUrl = process.env.AUTHINGWAY_URL || 'http://authingway:8080';
    const url = `${baseUrl}/health`;
    console.log(`Checking Auth at: ${url}`);

    const response = await request.get(url);
    expect(response.status(), `Failed to connect to ${url}`).toBe(200);
  });

});