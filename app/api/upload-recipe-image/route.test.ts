import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted so these are available before vi.mock runs
const { mockUpload, mockGetPublicUrl, mockRemove, mockGetUser } = vi.hoisted(() => ({
  mockUpload: vi.fn(),
  mockGetPublicUrl: vi.fn(),
  mockRemove: vi.fn(),
  mockGetUser: vi.fn(),
}))

// Set default return values
mockUpload.mockResolvedValue({ data: { path: 'user-1/temp-123.jpg' }, error: null })
mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://test.supabase.co/storage/v1/object/public/recipe-images/user-1/temp-123.jpg' } })
mockRemove.mockResolvedValue({ data: null, error: null })

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
    storage: {
      from: vi.fn(() => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
        remove: mockRemove,
      })),
    },
  })),
}))

import { POST, DELETE } from './route'

function makeFormDataRequest(file: File | null, recipeId?: string, token?: string): Request {
  const formData = new FormData()
  if (file) formData.append('file', file)
  if (recipeId) formData.append('recipeId', recipeId)

  const headers: Record<string, string> = {}
  if (token) headers['authorization'] = `Bearer ${token}`

  return new Request('http://localhost:3000/api/upload-recipe-image', {
    method: 'POST',
    headers,
    body: formData,
  })
}

describe('POST /api/upload-recipe-image', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpload.mockResolvedValue({ data: { path: 'user-1/temp-123.jpg' }, error: null })
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://test.supabase.co/storage/v1/object/public/recipe-images/user-1/temp-123.jpg' } })
    mockRemove.mockResolvedValue({ data: null, error: null })
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
  })

  it('returns 401 when authorization header is missing', async () => {
    const req = new Request('http://localhost:3000/api/upload-recipe-image', {
      method: 'POST',
      body: new FormData(),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when token is invalid', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'invalid' } })
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const res = await POST(makeFormDataRequest(file, undefined, 'bad-token'))
    expect(res.status).toBe(401)
  })

  it('returns 400 when no file is provided', async () => {
    const res = await POST(makeFormDataRequest(null, undefined, 'valid-token'))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('No file')
  })

  it('returns 400 for invalid file type', async () => {
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
    const res = await POST(makeFormDataRequest(file, undefined, 'valid-token'))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('Invalid file type')
  })

  it('returns 400 for file exceeding 5MB', async () => {
    const bigContent = new Uint8Array(6 * 1024 * 1024)
    const file = new File([bigContent], 'big.jpg', { type: 'image/jpeg' })
    const res = await POST(makeFormDataRequest(file, undefined, 'valid-token'))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('too large')
  })

  it('uploads valid image and returns public URL', async () => {
    const file = new File(['image data'], 'photo.jpg', { type: 'image/jpeg' })
    const res = await POST(makeFormDataRequest(file, 'recipe-123', 'valid-token'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.url).toContain('recipe-images')
  })

  it('returns 500 when storage upload fails', async () => {
    mockUpload.mockResolvedValueOnce({ data: null, error: { message: 'Storage error' } })
    const file = new File(['image data'], 'photo.png', { type: 'image/png' })
    const res = await POST(makeFormDataRequest(file, undefined, 'valid-token'))
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toContain('Failed to upload')
  })
})

describe('DELETE /api/upload-recipe-image', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRemove.mockResolvedValue({ data: null, error: null })
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
  })

  it('returns 401 when authorization header is missing', async () => {
    const req = new Request('http://localhost:3000/api/upload-recipe-image', { method: 'DELETE' })
    const res = await DELETE(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when url param is missing', async () => {
    const req = new Request('http://localhost:3000/api/upload-recipe-image', {
      method: 'DELETE',
      headers: { authorization: 'Bearer token' },
    })
    const res = await DELETE(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('No URL')
  })

  it('returns 400 for invalid image URL format', async () => {
    const req = new Request('http://localhost:3000/api/upload-recipe-image?url=https://other.com/image.jpg', {
      method: 'DELETE',
      headers: { authorization: 'Bearer token' },
    })
    const res = await DELETE(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('Invalid image URL')
  })

  it('returns 403 when image does not belong to user', async () => {
    const imageUrl = 'https://test.supabase.co/storage/v1/object/public/recipe-images/other-user/photo.jpg'
    const req = new Request(`http://localhost:3000/api/upload-recipe-image?url=${encodeURIComponent(imageUrl)}`, {
      method: 'DELETE',
      headers: { authorization: 'Bearer token' },
    })
    const res = await DELETE(req)
    expect(res.status).toBe(403)
  })

  it('deletes image successfully', async () => {
    const imageUrl = 'https://test.supabase.co/storage/v1/object/public/recipe-images/user-1/photo.jpg'
    const req = new Request(`http://localhost:3000/api/upload-recipe-image?url=${encodeURIComponent(imageUrl)}`, {
      method: 'DELETE',
      headers: { authorization: 'Bearer token' },
    })
    const res = await DELETE(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it('returns 500 when storage delete fails', async () => {
    mockRemove.mockResolvedValueOnce({ data: null, error: { message: 'Delete error' } })
    const imageUrl = 'https://test.supabase.co/storage/v1/object/public/recipe-images/user-1/photo.jpg'
    const req = new Request(`http://localhost:3000/api/upload-recipe-image?url=${encodeURIComponent(imageUrl)}`, {
      method: 'DELETE',
      headers: { authorization: 'Bearer token' },
    })
    const res = await DELETE(req)
    expect(res.status).toBe(500)
  })
})
