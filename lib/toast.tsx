'use client'

import { toast as sonnerToast } from 'sonner'

// Toaster mascot icon component
function ToasterMascot() {
  return (
    <img
      src="/images/branding/mascot toaster circle.png"
      alt=""
      className="w-6 h-6 rounded-full object-cover"
    />
  )
}

// Custom toast with mascot icon for recipe-related success messages
export function toastSuccess(message: string, description?: string) {
  sonnerToast.success(message, {
    description,
    icon: <ToasterMascot />,
  })
}

// Standard toast wrappers
export function toastError(message: string, description?: string) {
  sonnerToast.error(message, { description })
}

export function toastInfo(message: string, description?: string) {
  sonnerToast.info(message, { description })
}

export function toastLoading(message: string) {
  return sonnerToast.loading(message)
}

export function toastDismiss(toastId?: string | number) {
  sonnerToast.dismiss(toastId)
}

// Re-export the base toast for custom usage
export { sonnerToast as toast }
