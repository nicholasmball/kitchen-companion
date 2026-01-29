import { Navbar } from '@/components/layout/navbar'
import { MobileNav } from '@/components/layout/mobile-nav'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-6 pb-20 md:pb-6">
        {children}
      </main>
      <MobileNav />
    </div>
  )
}
