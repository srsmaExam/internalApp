'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { captureAndPersistUtmParams, trackCtaClick } from '@/lib/analytics';

function GoogleAnalyticsRouteTracker({ gaId }: { gaId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // 1. Capture and persist UTM parameters across page navigation
    captureAndPersistUtmParams();

    // 2. Track page_view on client-side route transitions
    const win = typeof window !== 'undefined' ? (window as unknown as { gtag?: (...args: unknown[]) => void }) : null;
    if (win && typeof win.gtag === 'function') {
      const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
      win.gtag('config', gaId, {
        page_path: url,
      });
    }
  }, [pathname, searchParams, gaId]);

  useEffect(() => {
    // Global delegated click listener for any element marked with data-ga-cta
    const handleCtaClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('[data-ga-cta]') as HTMLElement | null;
      if (target && target.dataset.gaCta) {
        trackCtaClick(target.dataset.gaCta);
      }
    };

    document.addEventListener('click', handleCtaClick);
    return () => {
      document.removeEventListener('click', handleCtaClick);
    };
  }, []);

  return null;
}

export function GoogleAnalytics({ gaId }: { gaId?: string }) {
  const measurementId = gaId || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  if (!measurementId || measurementId === 'disabled' || measurementId === 'off') {
    return null;
  }

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      />
      <Script
        id="google-analytics-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${measurementId}', {
              page_path: window.location.pathname + window.location.search,
              send_page_view: true
            });
          `,
        }}
      />
      <Suspense fallback={null}>
        <GoogleAnalyticsRouteTracker gaId={measurementId} />
      </Suspense>
    </>
  );
}
