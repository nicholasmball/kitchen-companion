import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BugReportDialog } from '../shared/bug-report-dialog'

// Mock supabase client
const mockInsert = vi.fn().mockResolvedValue({ error: null })
const mockGetUser = vi.fn().mockResolvedValue({
  data: { user: { id: 'user-123' } },
})

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: () => ({ insert: mockInsert }),
  }),
}))

vi.mock('@/lib/toast', () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
  withTimeout: (promise: Promise<unknown>) => promise,
}))

describe('BugReportDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the trigger button', () => {
    render(
      <BugReportDialog>
        <button>Report Bug</button>
      </BugReportDialog>
    )
    expect(screen.getByText('Report Bug')).toBeInTheDocument()
  })

  it('opens the dialog when trigger is clicked', async () => {
    render(
      <BugReportDialog>
        <button>Report Bug</button>
      </BugReportDialog>
    )

    fireEvent.click(screen.getByText('Report Bug'))
    await waitFor(() => {
      expect(screen.getByText('Report a Bug')).toBeInTheDocument()
    })
    expect(screen.getByPlaceholderText(/What happened/)).toBeInTheDocument()
  })

  it('disables send button when description is empty', async () => {
    render(
      <BugReportDialog>
        <button>Report Bug</button>
      </BugReportDialog>
    )

    fireEvent.click(screen.getByText('Report Bug'))
    await waitFor(() => {
      expect(screen.getByText('Send Report')).toBeDisabled()
    })
  })

  it('enables send button when description has text', async () => {
    render(
      <BugReportDialog>
        <button>Report Bug</button>
      </BugReportDialog>
    )

    fireEvent.click(screen.getByText('Report Bug'))
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/What happened/)).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText(/What happened/), {
      target: { value: 'Something broke' },
    })
    expect(screen.getByText('Send Report')).not.toBeDisabled()
  })

  it('submits bug report to supabase', async () => {
    render(
      <BugReportDialog>
        <button>Report Bug</button>
      </BugReportDialog>
    )

    fireEvent.click(screen.getByText('Report Bug'))
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/What happened/)).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText(/What happened/), {
      target: { value: 'Button does not work' },
    })
    fireEvent.click(screen.getByText('Send Report'))

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          description: 'Button does not work',
        })
      )
    })
  })

  it('shows voice input button when SpeechRecognition is available', async () => {
    const mockRecognition = {
      continuous: false,
      interimResults: false,
      lang: '',
      start: vi.fn(),
      stop: vi.fn(),
      onresult: null,
      onerror: null,
      onend: null,
    }
    ;(window as unknown as Record<string, unknown>).SpeechRecognition = vi
      .fn()
      .mockImplementation(() => mockRecognition)

    render(
      <BugReportDialog>
        <button>Report Bug</button>
      </BugReportDialog>
    )

    fireEvent.click(screen.getByText('Report Bug'))
    await waitFor(() => {
      expect(screen.getByText('Voice input')).toBeInTheDocument()
    })

    delete (window as unknown as Record<string, unknown>).SpeechRecognition
  })

  it('closes dialog when cancel is clicked', async () => {
    render(
      <BugReportDialog>
        <button>Report Bug</button>
      </BugReportDialog>
    )

    fireEvent.click(screen.getByText('Report Bug'))
    await waitFor(() => {
      expect(screen.getByText('Report a Bug')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Cancel'))
    await waitFor(() => {
      expect(screen.queryByText('Report a Bug')).not.toBeInTheDocument()
    })
  })
})
