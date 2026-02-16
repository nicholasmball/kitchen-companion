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

  it('does not show Take Photo button when no camera is detected', () => {
    // With no mediaDevices and a desktop user agent, hasCamera should be false
    render(<ImageUpload onImageSelect={mockOnImageSelect} showCameraCapture />)
    // No camera on test environment (happy-dom)
    expect(screen.queryByText('Take Photo')).toBeNull()
  })

  it('shows Take Photo button on mobile devices with camera', async () => {
    // Mock enumerateDevices to report a camera
    const mockEnumerateDevices = vi.fn().mockResolvedValue([
      { kind: 'videoinput', deviceId: 'cam1', label: 'Camera', groupId: 'g1' }
    ])
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { enumerateDevices: mockEnumerateDevices },
      configurable: true,
    })

    render(<ImageUpload onImageSelect={mockOnImageSelect} showCameraCapture />)

    // Wait for async camera detection
    await vi.waitFor(() => {
      expect(screen.getByText('Take Photo')).toBeDefined()
    })

    expect(screen.getByText('Tap to take a photo')).toBeDefined()
    expect(screen.getByText('Choose File')).toBeDefined()
  })

  it('renders camera input with capture="environment" attribute when camera available', async () => {
    const mockEnumerateDevices = vi.fn().mockResolvedValue([
      { kind: 'videoinput', deviceId: 'cam1', label: 'Camera', groupId: 'g1' }
    ])
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { enumerateDevices: mockEnumerateDevices },
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
