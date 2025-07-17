import { createClient } from '@blinkdotnew/sdk'

export const blink = createClient({
  projectId: 'nda-review-analyzer-vnkw3v44',
  authRequired: true
})

// Suppress analytics errors in console (they don't affect app functionality)
const originalConsoleError = console.error
console.error = (...args) => {
  // Filter out analytics-related errors
  const message = args[0]?.toString() || ''
  if (message.includes('Failed to send analytics events') || 
      message.includes('BlinkNetworkError') ||
      message.includes('/api/analytics/')) {
    return // Suppress analytics errors
  }
  originalConsoleError.apply(console, args)
}