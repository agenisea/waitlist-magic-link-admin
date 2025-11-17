import { WaitlistCarousel } from '@/components/waitlist/waitlist-carousel'
import Script from 'next/script'

export default function EmbedWaitlistPage() {
  return (
    <>
      {/* Google Analytics - Delayed Load */}
      <Script
        id="google-analytics-delayed"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.addEventListener('DOMContentLoaded', function () {
              setTimeout(function () {
                var gtagScript = document.createElement('script');
                gtagScript.src = "https://www.googletagmanager.com/gtag/js?id=G-GABCD1234";
                gtagScript.async = true;
                document.head.appendChild(gtagScript);

                gtagScript.onload = function () {
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){ dataLayer.push(arguments); }
                  gtag('js', new Date());
                  gtag('config', 'G-GABCD1234');
                };
              }, 2000);
            });
          `,
        }}
      />

      <div className="flex flex-col h-[100dvh] max-h-[100dvh] overflow-hidden bg-gradient-to-br from-white to-slate-50 dark:from-slate-950 dark:to-slate-900">
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <WaitlistCarousel
              apiBasePath="/api/magic-link"
              embedded={true}
            />
          </div>
        </main>
      </div>
    </>
  )
}
