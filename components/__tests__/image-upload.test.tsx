import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImageUpload } from '../shared/image-upload'

describe('ImageUpload', () => {
  const mockOnImageSelect = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders file upload area and Choose File button', () => {
    render(<ImageUpload onImageSelect={mockOnImageSelect} />)
    expect(screen.getByText('Click to upload or drag and drop')).toBeDefined()
    expect(screen.getByText('Choose File')).toBeDefined()
  })

  it('does not show Take Photo button when showCameraCapture is false', () => {
    render(<ImageUpload onImageSelect={mockOnImageSelect} />)
    expect(screen.queryByText('Take Photo')).toBeNull()
  })

  it('does not show Take Photo button on desktop', () => {
    // happy-dom has no touch support and desktop UA, so isMobile should be false
    render(<ImageUpload onImageSelect={mockOnImageSelect} showCameraCapture />)
    expect(screen.queryByText('Take Photo')).toBeNull()
  })

  it('shows Take Photo button on mobile devices', async () => {
    // Mock mobile user agent
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0',
      configurable: true,
    })

    render(<ImageUpload onImageSelect={mockOnImageSelect} showCameraCapture />)

    await vi.waitFor(() => {
      expect(screen.getByText('Take Photo')).toBeDefined()
    })

    expect(screen.getByText('Tap to take a photo')).toBeDefined()
    expect(screen.getByText('Choose File')).toBeDefined()
  })

  it('renders camera input with capture="environment" on mobile', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0',
      configurable: true,
    })

    const { container } = render(
      <ImageUpload onImageSelect={mockOnImageSelect} showCameraCapture />
    )

    await vi.waitFor(() => {
      expect(screen.getByText('Take Photo')).toBeDefined()
    })

    const cameraInput = container.querySelector('input[capture="environment"]')
    expect(cameraInput).not.toBeNull()
    expect(cameraInput?.getAttribute('accept')).toBe('image/*')
  })

  it('disables all inputs when disabled prop is true', () => {
    render(<ImageUpload onImageSelect={mockOnImageSelect} disabled />)
    const buttons = screen.getAllByRole('button')
    buttons.forEach(btn => {
      expect(btn).toHaveProperty('disabled', true)
    })
  })
})
