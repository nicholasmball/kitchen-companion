'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ImageUploadProps {
  onImageSelect: (base64: string) => void
  disabled?: boolean
  className?: string
  accept?: string
  /** Show a prominent "Take Photo" button that opens the rear camera on mobile */
  showCameraCapture?: boolean
}

export function ImageUpload({
  onImageSelect,
  disabled,
  className,
  accept = 'image/*',
  showCameraCapture = false,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile device (which will have a camera)
  useEffect(() => {
    if (!showCameraCapture) return
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      ('ontouchstart' in window && window.innerWidth < 1024)
    setIsMobile(mobile)
  }, [showCameraCapture])

  const hasCamera = showCameraCapture && isMobile

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      return
    }

    // Compress and resize large images
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Max dimensions - keep readable for text extraction
      const maxWidth = 1600
      const maxHeight = 1600
      let { width, height } = img

      // Calculate new dimensions maintaining aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      canvas.width = width
      canvas.height = height
      ctx.drawImage(img, 0, 0, width, height)

      // Convert to JPEG with 85% quality for smaller file size
      const base64 = canvas.toDataURL('image/jpeg', 0.85)
      setPreview(base64)
      onImageSelect(base64)
    }

    // Read file as data URL to load into image
    const reader = new FileReader()
    reader.onload = (e) => {
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }, [onImageSelect])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      processFile(file)
    }
  }, [processFile])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const clearImage = () => {
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        disabled={disabled}
        className="hidden"
      />

      {/* Separate input for camera capture — uses rear camera on mobile */}
      {showCameraCapture && hasCamera && (
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          disabled={disabled}
          className="hidden"
        />
      )}

      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className="w-full max-h-64 object-contain rounded-lg border"
          />
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-2 right-2"
            onClick={clearImage}
            disabled={disabled}
          >
            Change
          </Button>
        </div>
      ) : (
        <div
          onClick={() => {
            // On devices with camera + capture enabled, default tap opens camera
            if (showCameraCapture && hasCamera && cameraInputRef.current) {
              cameraInputRef.current.click()
            } else {
              fileInputRef.current?.click()
            }
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
            dragOver
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <CameraIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">
            {showCameraCapture && hasCamera
              ? 'Tap to take a photo'
              : 'Click to upload or drag and drop'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            PNG, JPG or WEBP
          </p>
        </div>
      )}

      <div className="flex gap-2">
        {showCameraCapture && hasCamera && (
          <Button
            variant="default"
            className="flex-1"
            onClick={() => cameraInputRef.current?.click()}
            disabled={disabled}
          >
            <CameraIcon className="h-4 w-4 mr-2" />
            Take Photo
          </Button>
        )}
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
        >
          <FolderIcon className="h-4 w-4 mr-2" />
          Choose File
        </Button>
      </div>
    </div>
  )
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
    </svg>
  )
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
    </svg>
  )
}
