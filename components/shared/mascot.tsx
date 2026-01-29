'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

interface MascotProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  message?: string
  mood?: 'happy' | 'thinking' | 'celebrating' | 'confused'
  className?: string
  showMessage?: boolean
}

const sizeClasses = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
  xl: 'w-48 h-48',
}

export function Mascot({
  size = 'md',
  message,
  mood = 'happy',
  className,
  showMessage = true,
}: MascotProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div className={cn(
        'relative rounded-full overflow-hidden bg-secondary/50 shadow-warm',
        sizeClasses[size]
      )}>
        <Image
          src="/images/branding/mascot circle.png"
          alt="Cat's Kitchen Companion mascot"
          fill
          className="object-cover"
          priority={size === 'lg' || size === 'xl'}
        />
      </div>
      {showMessage && message && (
        <p className={cn(
          'text-center text-muted-foreground max-w-xs',
          size === 'sm' && 'text-sm',
          size === 'lg' && 'text-lg',
          size === 'xl' && 'text-xl'
        )}>
          {message}
        </p>
      )}
    </div>
  )
}

// Cat icon for small UI elements (toasts, avatars, etc.)
export function CatIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('w-5 h-5', className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Cat face */}
      <circle cx="12" cy="14" r="7" />
      {/* Left ear */}
      <path d="M5 9 L7 4 L9 8" />
      {/* Right ear */}
      <path d="M19 9 L17 4 L15 8" />
      {/* Left eye */}
      <circle cx="9.5" cy="13" r="1" fill="currentColor" />
      {/* Right eye */}
      <circle cx="14.5" cy="13" r="1" fill="currentColor" />
      {/* Nose */}
      <path d="M12 15 L11 16.5 L13 16.5 Z" fill="currentColor" />
      {/* Whiskers left */}
      <path d="M4 14 L8 14.5" />
      <path d="M4 16 L8 15.5" />
      {/* Whiskers right */}
      <path d="M20 14 L16 14.5" />
      <path d="M20 16 L16 15.5" />
    </svg>
  )
}

// Cooking-themed loading spinner
export function CookingLoader({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'w-6 h-6' : size === 'lg' ? 'w-12 h-12' : 'w-8 h-8'

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <svg
        className={cn(sizeClass, 'animate-spin text-primary')}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Frying pan */}
        <circle cx="12" cy="12" r="8" className="opacity-25" />
        <path d="M12 4 A8 8 0 0 1 20 12" className="opacity-75" />
        {/* Handle */}
        <path d="M20 12 L23 12" strokeWidth={3} className="opacity-75" />
      </svg>
    </div>
  )
}

// Celebration component for completed meal plans
export function CelebrationMascot({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 px-4 text-center">
      <div className="relative">
        <div className="w-32 h-32 rounded-full overflow-hidden shadow-warm-lg" style={{ clipPath: 'circle(50%)' }}>
          <Image
            src="/images/branding/mascot celebrate circle.png"
            alt="Celebration!"
            fill
            className="object-cover scale-105"
          />
        </div>
        {/* Celebration sparkles */}
        <span className="absolute -top-2 -right-1 text-2xl animate-bounce">🎉</span>
        <span className="absolute -top-1 -left-4 text-xl animate-bounce delay-100">✨</span>
        <span className="absolute -bottom-1 -right-4 text-xl animate-bounce delay-200">🌟</span>
      </div>
      <div>
        <h3 className="text-xl font-bold text-primary">
          {message || "Amazing work, chef!"}
        </h3>
        <p className="text-muted-foreground mt-1">
          Your meal is ready to serve!
        </p>
      </div>
    </div>
  )
}

// Empty state component with mascot
interface EmptyStateProps {
  title: string
  message: string
  action?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export function EmptyStateWithMascot({
  title,
  message,
  action,
  size = 'md'
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <Mascot
        size={size === 'sm' ? 'md' : 'lg'}
        showMessage={false}
      />
      <h3 className={cn(
        'font-semibold mt-4',
        size === 'sm' ? 'text-base' : 'text-lg'
      )}>
        {title}
      </h3>
      <p className={cn(
        'text-muted-foreground mt-1 text-center max-w-sm',
        size === 'sm' ? 'text-sm' : 'text-base'
      )}>
        {message}
      </p>
      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
    </div>
  )
}
