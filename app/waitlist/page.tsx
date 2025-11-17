import { WaitlistCarousel } from '@/components/waitlist/waitlist-carousel'
import { PageContainer } from '@/components/layout/page-container'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Join Waitlist',
  description: 'Join our waitlist to get early access'
}

export default function WaitlistPage() {
  return (
    <PageContainer showHeader={false}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <WaitlistCarousel
          apiBasePath="/api"
          embedded={false}
        />
      </div>
    </PageContainer>
  )
}
