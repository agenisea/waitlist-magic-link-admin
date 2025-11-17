import { AcceptPage } from '@/components/accept/accept-page'
import { PageContainer } from '@/components/layout/page-container'

export const metadata = {
  title: 'Accept Invite | App',
  description: 'Accept your magic link invitation to access App'
}

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  return (
    <PageContainer maxWidth="md" showHeader={false}>
      <div className="flex items-center justify-center min-h-[calc(100dvh-8rem)]">
        <AcceptPage
          slug={slug}
          apiBasePath="/api/magic-link"
          redirectPath="/"
        />
      </div>
    </PageContainer>
  )
}
