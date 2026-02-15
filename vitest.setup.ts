import { beforeEach, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Set env vars for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'

// Chainable Supabase mock builder
function createChainableMock(resolveValue: { data: unknown; error: unknown } = { data: null, error: null }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}

  const methods = ['from', 'select', 'insert', 'update', 'delete', 'eq', 'order', 'single', 'maybeSingle', 'limit', 'range', 'filter', 'match', 'in', 'neq', 'gt', 'lt', 'gte', 'lte', 'like', 'ilike', 'is', 'not', 'or', 'contains', 'containedBy', 'textSearch']

  for (const method of methods) {
    chain[method] = vi.fn()
  }

  // All methods return the chain (proxy) except terminal ones
  const proxy = new Proxy(chain, {
    get(target, prop: string) {
      if (prop === 'then') {
        // Make it thenable — resolves with the configured value
        return (resolve: (v: unknown) => void) => resolve(resolveValue)
      }
      if (prop in target) {
        target[prop].mockReturnValue(proxy)
        return target[prop]
      }
      // For unknown methods, return a function that continues the chain
      const fn = vi.fn().mockReturnValue(proxy)
      target[prop] = fn
      return fn
    },
  })

  return proxy
}

// Export for use in individual test files
export { createChainableMock }

// Global Supabase client mock
const mockSupabase = createChainableMock()

// Also add auth mock
const mockAuth = {
  getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
  getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'test-token' } }, error: null }),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
}

const mockStorage = {
  from: vi.fn().mockReturnValue({
    upload: vi.fn().mockResolvedValue({ data: { path: 'test/path.jpg' }, error: null }),
    getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://test.supabase.co/storage/v1/object/public/recipe-images/test/path.jpg' } }),
    remove: vi.fn().mockResolvedValue({ data: null, error: null }),
  }),
}

// Attach auth and storage to the proxy
Object.defineProperty(mockSupabase, 'auth', { value: mockAuth, writable: true })
Object.defineProperty(mockSupabase, 'storage', { value: mockStorage, writable: true })

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

// Reset all mocks between tests
beforeEach(() => {
  vi.clearAllMocks()
})
