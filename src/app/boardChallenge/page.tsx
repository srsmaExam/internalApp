import Image from 'next/image';
import Link from 'next/link';
import {
  GraduationCap,
  Clock,
  Atom,
  Trophy,
  ArrowRight,
  Phone,
  MapPin,
  Globe,
  CheckCircle2,
  ShieldCheck,
  BarChart3,
  LogIn,
  MessageCircle,
  BrainCircuit,
  Zap,
  Target,
  Map,
  Timer,
  TrendingUp,
  Rocket,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { BRAND } from '@/config/branding';

export const metadata = {
  title: 'JEE Online Test | Shri Ram Smart Minds Academy',
  description:
    'A Diagnostic Test For Class 10 Students. 20 Questions | 20 Minutes in Mathematics & Science. Take the challenge and get your FREE Strengths & Improvement Report!',
  keywords: [
    'JEE Online Test',
    'Class 10 Diagnostic Test',
    'SRSMA',
    'Shri Ram Smart Minds Academy',
    'JEE NEET Foundation',
    'CBSE Class 10 Exam Prep',
    'Bandlaguda Jagir Hyderabad',
  ],
  openGraph: {
    title: 'JEE Online Test | Shri Ram Smart Minds Academy',
    description: 'Are you Board Ready? 20 Questions | 20 Minutes in Mathematics & Science for Class 10 Students.',
    images: [{ url: '/board-challenge/pamphlet_full_hd.webp' }],
  },
};

export const dynamic = 'force-static';

export default function BoardChallengePage() {
  const destination = '/login';
  const ctaLabel = 'Take the Challenge Now';
  const ctaSubtext = 'Instant Whatsapp Login • Works on phone & laptop';

  return (
    <div className="dark relative min-h-screen w-full overflow-x-hidden bg-[#071120] text-slate-100 selection:bg-amber-400 selection:text-slate-950">
      {/* Background with Authentic Science Pattern & Navy Gradient */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <Image
          src="/board-challenge/hero_bg.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-top opacity-30 mix-blend-screen brightness-90"
        />
        {/* Ambient Gradient Glows */}
        <div className="absolute left-1/2 -top-40 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-amber-500/15 blur-[140px]" />
        <div className="absolute -left-32 top-1/3 h-96 w-96 rounded-full bg-blue-600/20 blur-[150px]" />
        <div className="absolute -right-32 top-1/2 h-96 w-96 rounded-full bg-orange-600/15 blur-[150px]" />
      </div>

      {/* Main Content Wrapper */}
      <div className="relative z-10 flex min-h-screen flex-col overflow-x-hidden">
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#071120]/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3.5 py-2.5 sm:px-6 sm:py-4">
            {/* Institute Identity: Shri Ram on Line 1, Smart Minds Academy on Line 2; Subtitle with by IIT Alumni on 2nd Line */}
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-4">
              <div className="relative size-10 shrink-0 overflow-hidden rounded-xl border border-amber-400/40 bg-slate-900 p-0.5 shadow-md shadow-amber-500/10 sm:size-14">
                <Image
                  src={BRAND.logoMark}
                  alt="SRSMA Logo"
                  width={56}
                  height={56}
                  priority
                  className="size-full rounded-[9px] object-cover"
                />
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-xs font-black tracking-tight uppercase leading-tight text-slate-900 sm:text-xl dark:text-white">
                  SHRI RAM
                </span>
                <span className="truncate text-[11px] font-black tracking-tight uppercase leading-tight text-slate-700 sm:text-lg dark:text-slate-100">
                  SMART MINDS ACADEMY
                </span>
                <div className="mt-0.5 flex flex-col text-[10px] font-bold leading-tight text-amber-600 sm:text-sm dark:text-amber-400">
                  <span className="truncate">A JEE &amp; NEET Coaching Institute</span>
                  <span className="font-extrabold tracking-wide text-amber-700 dark:text-amber-300">
                    by IIT Alumni
                  </span>
                </div>
              </div>
            </div>

            {/* Login Navigation Action */}
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <Link
                href={destination}
                data-ga-cta="header_login"
                className="group inline-flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-3 py-1.5 text-xs font-bold text-amber-800 shadow-sm transition hover:border-amber-400 hover:bg-amber-400/30 hover:text-slate-950 active:scale-95 sm:px-5 sm:py-2.5 sm:text-base dark:text-amber-300 dark:hover:text-white"
              >
                <LogIn className="size-3.5 sm:size-5" />
                <span>Login</span>
                <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5 sm:size-4" />
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-1">
          <section className="mx-auto max-w-6xl px-3.5 pt-3 pb-10 sm:px-6 sm:pt-6 sm:pb-16">
            {/* Split layout on md/lg, stacked on mobile */}
            <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-12 md:gap-8 lg:gap-12">
              {/* Left Column (Desktop) / Top Intro (Mobile) */}
              <div className="flex flex-col items-center text-center md:col-span-7 md:items-start md:text-left">
                {/* 1. ARE YOU BOARD READY? (Massive, High-Impact Typography) */}
                <div className="w-full">
                  <h1 className="text-balance font-black tracking-tight uppercase text-4xl xs:text-5xl sm:text-6xl md:text-6xl lg:text-7xl xl:text-8xl leading-[0.92]">
                    <span className="block text-slate-900 drop-shadow-[0_2px_20px_rgba(0,0,0,0.12)] dark:text-white dark:drop-shadow-[0_2px_24px_rgba(255,255,255,0.35)]">
                      ARE YOU
                    </span>
                    <span className="mt-1 block bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 bg-clip-text text-transparent drop-shadow-[0_4px_30px_rgba(245,158,11,0.5)] dark:from-amber-300 dark:via-amber-400 dark:to-orange-500 dark:drop-shadow-[0_6px_36px_rgba(245,158,11,0.65)]">
                      BOARD READY?
                    </span>
                  </h1>
                </div>

                {/* 2. Text : "Presenting" in stylish way */}
                <div className="my-1.5 flex w-full max-w-xs items-center justify-center gap-2 sm:my-3 sm:max-w-sm sm:gap-3 md:justify-start">
                  <span className="h-[1.5px] flex-1 bg-gradient-to-r from-transparent via-amber-400/80 to-amber-500 md:hidden" />
                  <span className="font-serif text-sm font-medium italic tracking-[0.22em] text-amber-700 drop-shadow-sm sm:text-xl md:text-2xl dark:text-amber-300 dark:drop-shadow-[0_2px_12px_rgba(245,158,11,0.35)]">
                    — Presenting —
                  </span>
                  <span className="h-[1.5px] flex-1 bg-gradient-to-l from-transparent via-amber-400/80 to-amber-500" />
                </div>

                {/* 3. JEE Online Test (Commanding Header) */}
                <h2 className="text-balance text-xl font-black tracking-tight uppercase text-slate-900 drop-shadow-sm xs:text-2xl sm:text-4xl md:text-4xl lg:text-5xl dark:text-white">
                  JEE ONLINE TEST
                </h2>

                {/* 4. Subtitle */}
                <p className="mt-1.5 max-w-xl text-balance text-xs font-semibold leading-relaxed text-slate-600 sm:mt-2.5 sm:text-base md:text-lg dark:text-slate-300">
                  Studying for hours with no score improvement? Find out where you are losing marks in just 20 minutes
                </p>

                {/* Desktop-Only Primary Call-to-Action Area */}
                <div className="hidden w-full max-w-lg flex-col items-start gap-3.5 pt-6 md:flex">
                  <Link
                    href={destination}
                    data-ga-cta="hero_cta_desktop"
                    className="relative group flex w-full max-w-md items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 px-6 py-4 text-lg font-black text-slate-950 shadow-2xl shadow-amber-500/30 transition-all duration-200 hover:brightness-110 hover:shadow-amber-500/45 active:scale-[0.98] sm:text-xl"
                  >
                    <span className="relative z-10 flex items-center gap-2.5">
                      <Zap className="size-5 fill-slate-950 text-slate-950" />
                      <span>{ctaLabel}</span>
                      <ArrowRight className="size-5 transition group-hover:translate-x-1" />
                    </span>
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  </Link>

                  <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 sm:text-sm dark:text-slate-300">
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>{ctaSubtext}</span>
                  </div>

                  {/* Trust Badges Grid (Clean 2x2 Orientation) */}
                  <div className="mt-3 grid w-full grid-cols-2 gap-x-6 gap-y-2.5 border-t border-slate-200/80 pt-4 text-xs font-semibold text-slate-700 sm:text-sm dark:border-slate-800/80 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>Designed by IIT Alumni</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span>100% Free</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
                      <span>Instant 5-Page Diagnostic Report</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Trophy className="size-4 shrink-0 text-amber-500 dark:text-amber-400" />
                      <span>All-India Relative Ranking</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column (Desktop) / Central Visual (Mobile): Student Girl with Books */}
              <div className="relative flex w-full flex-col items-center justify-center md:col-span-5">
                {/* Background Ambient Aura and Concentric Science Accent Rings */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="size-48 rounded-full bg-amber-500/20 blur-3xl sm:size-72 lg:size-96" />
                  <div className="absolute size-36 rounded-full bg-blue-600/20 blur-2xl sm:size-60 lg:size-80" />
                  <div className="absolute size-44 rounded-full border border-amber-400/20 opacity-50 sm:size-64 lg:size-80" />
                  <div className="absolute size-32 rounded-full border border-dashed border-blue-400/20 opacity-40 sm:size-52 lg:size-64" />
                </div>

                {/* Student Hero Image with Smooth Gradient Mask at Bottom */}
                <div className="relative z-10 mx-auto flex w-full max-w-[280px] justify-center xs:max-w-[320px] sm:max-w-[380px] md:max-w-none">
                  <div className="relative [mask-image:linear-gradient(to_bottom,black_82%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_82%,transparent_100%)]">
                    <Image
                      src="/board-challenge/girl.webp"
                      alt="Class 10 Student holding Mathematics and Science textbooks for JEE Online Test"
                      width={971}
                      height={1484}
                      priority
                      className="h-[230px] w-auto object-contain drop-shadow-[0_12px_32px_rgba(0,0,0,0.6)] xs:h-[270px] sm:h-[350px] md:h-[460px] lg:h-[520px] xl:h-[560px]"
                    />
                  </div>
                </div>

                {/* Mobile-Only CTA Button and Trust Badges (Positioned immediately below student visual) */}
                <div className="mt-3 flex w-full max-w-sm flex-col items-center gap-2.5 md:hidden">
                  <Link
                    href={destination}
                    data-ga-cta="hero_cta_mobile"
                    className="relative group flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 px-5 py-3 text-base font-black text-slate-950 shadow-xl shadow-amber-500/30 transition-all active:scale-[0.98]"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <Zap className="size-4.5 fill-slate-950 text-slate-950" />
                      <span>{ctaLabel}</span>
                      <ArrowRight className="size-4" />
                    </span>
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  </Link>

                  <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-400">
                    <CheckCircle2 className="size-3.5 shrink-0 text-emerald-400" />
                    <span>{ctaSubtext}</span>
                  </div>

                  {/* Mobile Trust Badges Grid */}
                  <div className="mt-2 grid w-full max-w-xs grid-cols-2 gap-x-3 gap-y-2 text-[11px] font-semibold text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="size-3.5 shrink-0 text-amber-400" />
                      <span>By IIT Alumni</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="size-3.5 shrink-0 text-emerald-400" />
                      <span>100% Free</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <BarChart3 className="size-3.5 shrink-0 text-blue-400" />
                      <span>5-Page Report</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Trophy className="size-3.5 shrink-0 text-amber-400" />
                      <span>All-India Rank</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* The 4 Core Challenge Badges matching pamphlet (Below Hero Grid) */}
            <div className="mt-8 sm:mt-10 grid w-full grid-cols-1 gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
              {/* Item 1: Diagnostic Test for Class 10 */}
              <div className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-md transition hover:border-amber-400 hover:shadow-lg dark:border-slate-800/90 dark:bg-slate-900/80 dark:hover:border-amber-400/50 dark:hover:bg-slate-800/90">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-600 ring-1 ring-amber-400/40 dark:text-amber-400">
                  <GraduationCap className="size-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 sm:text-xl dark:text-white">Class 10 Diagnostic Test</h2>
                  <p className="mt-1 text-sm leading-snug text-slate-600 sm:text-base dark:text-slate-300">
                    Formulated specifically for CBSE &amp; State Board students to evaluate true board readiness.
                  </p>
                </div>
              </div>

              {/* Item 2: 20 Questions | 20 Minutes */}
              <div className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-md transition hover:border-amber-400 hover:shadow-lg dark:border-slate-800/90 dark:bg-slate-900/80 dark:hover:border-amber-400/50 dark:hover:bg-slate-800/90">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-600 ring-1 ring-amber-400/40 dark:text-amber-400">
                  <Clock className="size-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 sm:text-xl dark:text-white">20 Questions | 20 Minutes</h2>
                  <p className="mt-1 text-sm leading-snug text-slate-600 sm:text-base dark:text-slate-300">
                    The test evaluates your conceptual clarity & solving speed under real exam pressure, so you never run out of time.
                  </p>
                </div>
              </div>

              {/* Item 3: Mathematics & Science Subjects */}
              <div className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-md transition hover:border-amber-400 hover:shadow-lg dark:border-slate-800/90 dark:bg-slate-900/80 dark:hover:border-amber-400/50 dark:hover:bg-slate-800/90">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-600 ring-1 ring-amber-400/40 dark:text-amber-400">
                  <Atom className="size-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 sm:text-xl dark:text-white">Mathematics &amp; Science</h2>
                  <p className="mt-1 text-sm leading-snug text-slate-600 sm:text-base dark:text-slate-300">
                    Multiple-choice questions covering key Class 10 topics in Mathematics and Science.
                  </p>
                </div>
              </div>

              {/* Item 4: Free Strengths & Improvement Report */}
              <div className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-md transition hover:border-amber-400 hover:shadow-lg dark:border-slate-800/90 dark:bg-slate-900/80 dark:hover:border-amber-400/50 dark:hover:bg-slate-800/90">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-600 ring-1 ring-amber-400/40 dark:text-amber-400">
                  <Trophy className="size-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 sm:text-xl dark:text-white">FREE Diagnostic Report</h2>
                  <p className="mt-1 text-sm leading-snug text-slate-600 sm:text-base dark:text-slate-300">
                    Receive an instant personalized report revealing your strengths, blind spots, and key areas to gain marks!
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section: Why This Challenge is a Must For You */}
          <section className="relative border-t border-slate-800/80 bg-[#071120] py-10 sm:py-14">
            {/* Ambient subtle glow */}
            <div className="pointer-events-none absolute -left-20 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-amber-500/10 blur-[120px]" />
            <div className="pointer-events-none absolute -right-20 top-1/4 h-72 w-72 rounded-full bg-blue-600/10 blur-[120px]" />

            <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
              <div className="text-left">
                <h2 className="mx-auto max-w-4xl text-center text-balance text-3xl font-black uppercase tracking-tight text-white sm:text-4xl md:text-5xl">
                  Why This Challenge is a Must For&nbsp;You
                </h2>

                <div className="mt-5 space-y-4 text-base font-normal leading-relaxed text-slate-300 sm:text-lg">
                    
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-4 text-slate-200 sm:p-5 space-y-2.5">
                    <p>
                      Class 10 is your first big board exam. Most students work very hard and have the potential to score 90%+, but they walk into the exam hall without knowing how ready they really are.
                    </p>
                    <p>
                      Re-reading notes, watching video lectures, or scrolling through guidebook solutions feels productive, but it can hide your real weak areas. It gives you a{' '}
                      <strong className="font-extrabold text-amber-400">false sense of preparation</strong> without showing you where you will actually lose marks when solving on your own.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3 Questions Container */}
              <div className="mt-10">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-400/20 text-amber-400 ring-1 ring-amber-400/40">
                    <HelpCircle className="size-4" />
                  </span>
                  <h3 className="text-lg font-black uppercase tracking-tight text-white sm:text-xl">
                    Ask yourself these 3 questions:
                  </h3>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                  {/* Question 1 */}
                  <div className="group relative flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg transition-all duration-300 hover:border-amber-400/50 hover:bg-slate-900 hover:shadow-amber-500/10 hover:-translate-y-0.5 sm:p-6">
                    <div className="flex items-start gap-3.5">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 font-mono text-sm font-black text-amber-400 ring-1 ring-amber-400/30">
                        01
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-base leading-snug text-slate-100 sm:text-lg">
                          Can you solve direct, textbook questions easily, but get stuck on tricky, multi-step problems?
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Question 2 */}
                  <div className="group relative flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg transition-all duration-300 hover:border-blue-400/50 hover:bg-slate-900 hover:shadow-blue-500/10 hover:-translate-y-0.5 sm:p-6">
                    <div className="flex items-start gap-3.5">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 font-mono text-sm font-black text-blue-400 ring-1 ring-blue-400/30">
                        02
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-base leading-snug text-slate-100 sm:text-lg">
                          Do you understand the concepts well at home, yet run out of time during school exams?
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Question 3 */}
                  <div className="group relative flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg transition-all duration-300 hover:border-orange-400/50 hover:bg-slate-900 hover:shadow-orange-500/10 hover:-translate-y-0.5 sm:p-6">
                    <div className="flex items-start gap-3.5">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 font-mono text-sm font-black text-orange-400 ring-1 ring-orange-400/30">
                        03
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-base leading-snug text-slate-100 sm:text-lg">
                          Are you studying hard, but your marks stay stuck at the same level test after test?
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Solution Callout Card & CTA */}
              <div className="mt-8 rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-500/10 via-slate-900/90 to-blue-900/15 p-6 shadow-xl sm:p-8">
                <div className="flex flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
                  <div className="max-w-2xl">
                    <p className="text-base font-bold leading-snug text-slate-100 sm:text-xl">
                      If you answered <span className="font-black text-amber-400">yes</span> to even one of these, you don’t need more hours—you need to know where you are losing marks.
                    </p>
                    <p className="mt-2 text-sm text-slate-300 sm:text-base">
                      Take the JEE Online Test to pinpoint your score leaks and get your instant 5-page report.
                    </p>
                  </div>

                  <div className="shrink-0">
                    <Link
                      href={destination}
                      data-ga-cta="section_sample_report_cta"
                      className="group relative inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 px-6 py-3.5 text-base font-black text-slate-950 shadow-xl shadow-amber-500/30 transition-all duration-200 hover:brightness-110 hover:shadow-amber-500/45 active:scale-[0.98] sm:px-7 sm:py-4 sm:text-lg"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        <Zap className="size-4.5 fill-slate-950 text-slate-950" />
                        <span>Take the Free 20-Min Challenge</span>
                        <ArrowRight className="size-4.5 transition group-hover:translate-x-1" />
                      </span>
                      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section: What Your 5-Page Personalized Diagnostic Report Delivers */}
          <section className="relative border-t border-slate-800/80 bg-slate-950/70 py-10 sm:py-14">
            {/* Background Ambient Aura */}
            <div className="pointer-events-none absolute right-1/4 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-blue-600/10 blur-[130px]" />

            <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
              <div className="text-center">
                <h2 className="text-3xl font-black uppercase tracking-tight text-white sm:text-4xl md:text-5xl">
                  What Your 5-Page Personalized Diagnostic Report Delivers
                </h2>
              </div>

              {/* 5 Deliverables Grid in 2-2-1 Format */}
              <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 lg:gap-6">
                {/* Row 1 - Card 1: Question-Type Breakdown */}
                <div className="group rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-md transition-all duration-300 hover:border-amber-400/50 hover:bg-slate-900/95 hover:shadow-lg sm:p-6">
                  <div className="flex items-start gap-3.5 sm:gap-4">
                    <div className="flex size-11 sm:size-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500/15 text-2xl text-rose-400 ring-1 ring-rose-500/30">
                      🎯
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-black text-white sm:text-xl">
                        Question-Type Breakdown
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-300 sm:text-base">
                        Pinpoint exactly where you are losing marks: conceptual fundamentals, multi-step application problems, or diagram &amp; formula interpretation.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Row 1 - Card 2: Chapter & Topic Priority Map */}
                <div className="group rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-md transition-all duration-300 hover:border-amber-400/50 hover:bg-slate-900/95 hover:shadow-lg sm:p-6">
                  <div className="flex items-start gap-3.5 sm:gap-4">
                    <div className="flex size-11 sm:size-12 shrink-0 items-center justify-center rounded-2xl bg-sky-500/15 text-2xl text-sky-400 ring-1 ring-sky-500/30">
                      🗺️
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-black text-white sm:text-xl">
                        Chapter &amp; Topic Priority Map
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-300 sm:text-base">
                        Stop revising what you already know. Get a clear priority list of chapters that actually need fixing to boost your score (like Trigonometry, Electricity, Light, and Quadratic Equations).
                      </p>
                    </div>
                  </div>
                </div>

                {/* Row 2 - Card 3: Time-Management Analysis */}
                <div className="group rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-md transition-all duration-300 hover:border-amber-400/50 hover:bg-slate-900/95 hover:shadow-lg sm:p-6">
                  <div className="flex items-start gap-3.5 sm:gap-4">
                    <div className="flex size-11 sm:size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-2xl text-amber-400 ring-1 ring-amber-400/30">
                      ⏱️
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-black text-white sm:text-xl">
                        Time-Management Analysis
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-300 sm:text-base">
                        Identify whether you are spending too long on basic questions or rushing through complex ones. Master your pacing so you never leave questions unattempted.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Row 2 - Card 4: All-India Benchmarking & Relative Rank* */}
                <div className="group rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-md transition-all duration-300 hover:border-amber-400/50 hover:bg-slate-900/95 hover:shadow-lg sm:p-6">
                  <div className="flex items-start gap-3.5 sm:gap-4">
                    <div className="flex size-11 sm:size-12 shrink-0 items-center justify-center rounded-2xl bg-purple-500/15 text-2xl text-purple-400 ring-1 ring-purple-500/30">
                      📈
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-black text-white sm:text-xl">
                        All-India Benchmarking &amp; Relative Rank*
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-300 sm:text-base">
                        Benchmark yourself against thousands of Class 10 students across India and receive your projected relative rank.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Row 3 - Card 5: 5-Step Action Plan for the Next 3 Months (Highlighted & Full Width across 2 columns) */}
                <div className="group relative rounded-2xl border-2 border-amber-400/80 bg-gradient-to-r from-amber-500/15 via-slate-900/95 to-orange-500/15 p-5 shadow-xl shadow-amber-500/10 transition-all duration-300 hover:border-amber-300 hover:shadow-amber-500/20 md:col-span-2 sm:p-6">
                  <div className="flex items-start gap-3.5 sm:gap-4">
                    <div className="flex size-11 sm:size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400/20 text-2xl text-amber-300 ring-1 ring-amber-400/50 shadow-inner">
                      🚀
                    </div>
                    <div className="min-w-0 flex-1">
                      <div>
                        <h3 className="text-lg font-black text-amber-300 sm:text-xl">
                          5-Step Action Plan for the Next 3 Months
                        </h3>
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-200 sm:text-base">
                        A personalized 5-step action plan to guide your revision, fix recurring mistakes and boost your board score over the next 3 months.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footnote */}
              <p className="mt-6 text-center text-xs font-semibold italic text-slate-400 sm:text-sm">
                *Rank will be released in January
              </p>

              {/* CTA Button */}
              <div className="mt-8 flex justify-center">
                <Link
                  href={destination}
                  data-ga-cta="section_rank_cta"
                  className="group relative inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 px-7 py-4 text-base font-black text-slate-950 shadow-xl shadow-amber-500/30 transition-all duration-200 hover:brightness-110 hover:shadow-amber-500/45 active:scale-[0.98] sm:text-lg"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <Zap className="size-5 fill-slate-950 text-slate-950" />
                    <span>Take the Free 20-Min Challenge</span>
                    <ArrowRight className="size-4.5 transition group-hover:translate-x-1" />
                  </span>
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                </Link>
              </div>
            </div>
          </section>

          {/* Section: Simplified 3-Step Process */}
          <section className="relative border-t border-slate-800/80 bg-[#071120] py-10 sm:py-14">
            <div className="mx-auto max-w-5xl px-4 sm:px-6">
              <div className="text-center">
                <h2 className="text-3xl font-black uppercase tracking-tight text-white sm:text-4xl md:text-5xl">
                  Simplified 3-Step Process
                </h2>
                <p className="mx-auto mt-3 max-w-2xl text-sm font-medium text-slate-300 sm:text-base">
                  Go from uncertainty to pinpoint clarity on your board preparation in three simple steps.
                </p>
              </div>

              {/* Steps Grid */}
              <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
                {/* Step 1 */}
                <div className="relative rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg transition-all duration-300 hover:border-amber-400/50 hover:bg-slate-900 sm:p-6">
                  <div className="flex items-start gap-3.5 sm:gap-4">
                    <div className="flex size-11 sm:size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400/20 font-mono text-base font-black text-amber-400 ring-1 ring-amber-400/40">
                      01
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-black text-white sm:text-xl">
                        Step 1: Take the 20-Min Test
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-300 sm:text-base">
                        Answer 20 curated Math &amp; Science MCQs on your phone or laptop with a single-click WhatsApp login.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="relative rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg transition-all duration-300 hover:border-amber-400/50 hover:bg-slate-900 sm:p-6">
                  <div className="flex items-start gap-3.5 sm:gap-4">
                    <div className="flex size-11 sm:size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400/20 font-mono text-base font-black text-amber-400 ring-1 ring-amber-400/40">
                      02
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-black text-white sm:text-xl">
                        Step 2: Instant 5-Page Diagnostic Report
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-300 sm:text-base">
                        Get your Board Readiness Index, skill profile, and time-management report immediately upon submission.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="relative rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg transition-all duration-300 hover:border-amber-400/50 hover:bg-slate-900 sm:p-6">
                  <div className="flex items-start gap-3.5 sm:gap-4">
                    <div className="flex size-11 sm:size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400/20 font-mono text-base font-black text-amber-400 ring-1 ring-amber-400/40">
                      03
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-black text-white sm:text-xl">
                        Step 3: Fix Gaps &amp; Join the Community
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-300 sm:text-base">
                        Follow your tailored 3-month action plan and gain access to our exclusive student community with free high-yield Board prep resources.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Central CTA under steps */}
              <div className="mt-10 flex justify-center">
                <Link
                  href={destination}
                  data-ga-cta="section_steps_cta"
                  className="group relative inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 px-7 py-4 text-base font-black text-slate-950 shadow-xl shadow-amber-500/30 transition-all duration-200 hover:brightness-110 hover:shadow-amber-500/45 active:scale-[0.98] sm:text-lg"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <Zap className="size-5 fill-slate-950 text-slate-950" />
                    <span>Take the Free 20-Min Challenge</span>
                    <ArrowRight className="size-4.5 transition group-hover:translate-x-1" />
                  </span>
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                </Link>
              </div>
            </div>
          </section>

          {/* Section: Closing Call To Action Banner */}
          <section className="relative border-t border-slate-800/80 bg-[#071120] py-10 sm:py-16 overflow-hidden">
            {/* Ambient Lighting */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/15 blur-[140px]" />
            <div className="pointer-events-none absolute right-10 bottom-0 h-64 w-64 rounded-full bg-blue-600/15 blur-[120px]" />

            <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
              <div className="relative overflow-hidden rounded-3xl border border-amber-400/50 bg-gradient-to-br from-amber-500/20 via-slate-900 to-[#071120] p-8 text-center shadow-2xl shadow-amber-500/10 sm:p-14">
                {/* Background glow flares */}
                <div className="pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-amber-500/20 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 right-10 size-60 rounded-full bg-blue-600/20 blur-3xl" />

                <div className="relative z-10 mx-auto max-w-3xl">
                  <h2 className="text-balance text-3xl font-black uppercase tracking-tight text-white sm:text-4xl md:text-5xl">
                    Don’t leave your Board results to guesswork.
                  </h2>
                  <p className="mt-4 text-balance text-base font-semibold leading-relaxed text-slate-300 sm:text-lg">
                    Join thousands of Class 10 students across the country and discover your true readiness today.
                  </p>

                  <div className="mt-8 flex justify-center">
                    <Link
                      href={destination}
                      data-ga-cta="footer_banner_cta"
                      className="group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 px-8 py-4 text-lg font-black text-slate-950 shadow-2xl shadow-amber-500/35 transition-all duration-200 hover:brightness-110 hover:shadow-amber-500/50 active:scale-[0.98] sm:px-10 sm:py-5 sm:text-xl"
                    >
                      <span className="relative z-10 flex items-center gap-2.5">
                        <Zap className="size-5 fill-slate-950 text-slate-950" />
                        <span>Start My Free 20-Minute Challenge</span>
                        <ArrowRight className="size-5 transition group-hover:translate-x-1" />
                      </span>
                      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                    </Link>
                  </div>

                  {/* Trust Footer Badges */}
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-bold text-slate-300 sm:text-sm">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="size-4 text-emerald-400" />
                      <span>100% Free</span>
                    </div>
                    <span className="text-slate-600">•</span>
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="size-4 text-amber-400" />
                      <span>No Credit Card Required</span>
                    </div>
                    <span className="text-slate-600">•</span>
                    <div className="flex items-center gap-1.5">
                      <BarChart3 className="size-4 text-blue-400" />
                      <span>Instant Reports Access</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section: About Shri Ram Smart Minds Academy & IIT Alumni Mentorship */}
          <section className="border-t border-slate-800/80 bg-slate-950/60 py-8 transition-colors sm:py-12">
            <div className="mx-auto max-w-5xl px-4 sm:px-6">
              <div className="flex flex-col items-center justify-between gap-6 rounded-3xl border border-amber-400/40 bg-gradient-to-r from-amber-500/10 via-slate-900/90 to-blue-900/20 p-7 sm:p-9 md:flex-row md:text-left text-center">
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:text-left">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl border border-amber-400/50 bg-slate-900 p-1 shadow-md shadow-amber-500/10 sm:size-20">
                    <Image
                      src={BRAND.logoMark}
                      alt="SRSMA Emblem"
                      width={80}
                      height={80}
                      className="size-full rounded-xl object-cover"
                    />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-xl font-black leading-tight text-white sm:text-2xl">
                      <span>Shri Ram</span>
                      <span className="block text-amber-400">Smart Minds Academy</span>
                    </h3>
                    <div className="mt-1 text-sm font-bold leading-snug text-amber-300 sm:text-base">
                      <span>A Premier JEE &amp; NEET Coaching Institute</span>
                      <span className="block font-extrabold text-amber-200">by IIT Alumni</span>
                    </div>
                    <p className="mt-2.5 max-w-xl text-justify text-sm leading-relaxed text-white sm:text-base">
                      Founded by IIT alumni, SRSMA delivers stress-free, personalized coaching in focused batches of 25–30 students. Backed by smart AI Powered AC classrooms and safe residential care, our inaugural batch achieved a 99.48 percentile in JEE Main, JEE Advanced selections, and 98% in board exams.
                    </p>
                  </div>
                </div>

                <div className="mt-2 shrink-0 md:mt-0">
                  <Link
                    href={destination}
                    data-ga-cta="section_about_institute_login"
                    className="inline-flex items-center gap-2 rounded-2xl bg-amber-400 px-6 py-3.5 text-sm font-black text-slate-950 shadow-xl shadow-amber-500/25 transition hover:bg-amber-300 active:scale-95 sm:text-base"
                  >
                    <LogIn className="size-4.5" />
                    <span>Login &amp; Start</span>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* Footer & Direct Contact Info matching pamphlet */}
        <footer className="border-t border-slate-200 bg-slate-100 py-10 pb-28 transition-colors sm:pb-10 dark:border-slate-800 dark:bg-[#050c18]">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="grid grid-cols-1 items-center gap-7 text-center sm:grid-cols-3 sm:text-left">
              {/* Call & WhatsApp */}
              <div className="flex flex-col items-center sm:items-start">
                <span className="text-xs font-semibold text-slate-500 sm:text-sm dark:text-slate-400">Direct Admissions &amp; Enquiries:</span>
                <div className="mt-1.5 flex items-center gap-2.5">
                  <a
                    href="tel:+918463911854"
                    className="flex items-center gap-1.5 font-mono text-base font-extrabold text-amber-600 transition hover:underline sm:text-lg dark:text-amber-400 dark:hover:text-amber-300"
                  >
                    <Phone className="size-4" />
                    <span>+91 84639 11854</span>
                  </a>
                  <a
                    href="https://wa.me/918463911854?text=Hello%20SRSMA%2C%20I%20am%20interested%20in%20taking%20the%20Board%20Readiness%20Challenge"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-500/35 transition hover:bg-emerald-500/25 dark:bg-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500/30"
                  >
                    <MessageCircle className="size-3.5" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>

              {/* Official Academy Website */}
              <div className="flex flex-col items-center">
                <span className="text-xs font-semibold text-slate-500 sm:text-sm dark:text-slate-400">Academy Website:</span>
                <a
                  href="https://srsma.in/?utm_source=exam-app"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1.5 flex items-center gap-1.5 text-sm font-bold text-slate-900 transition hover:text-amber-600 sm:text-base dark:text-white dark:hover:text-amber-400"
                >
                  <Globe className="size-4 text-amber-600 dark:text-amber-400" />
                  <span>https://srsma.in</span>
                </a>
              </div>

              {/* Location with Google Map Link */}
              <div className="flex flex-col items-center sm:items-end">
                <span className="text-xs font-semibold text-slate-500 sm:text-sm dark:text-slate-400">Campus Location:</span>
                <a
                  href="https://share.google/BG1sNjUDIiNbnTWLY?utm_source=exam-app"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1.5 flex items-center gap-1.5 text-sm font-bold text-slate-800 transition hover:text-amber-600 hover:underline sm:text-base dark:text-slate-200 dark:hover:text-amber-400"
                >
                  <MapPin className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>Bandlaguda Jagir, Hyderabad</span>
                </a>
              </div>
            </div>

            {/* Bottom Copyright & Portal Link */}
            <div className="mt-8 flex flex-col items-center justify-between border-t border-slate-200 pt-5 text-center text-xs text-slate-500 sm:flex-row sm:text-sm dark:border-slate-800/80 dark:text-slate-400">
              <p>© {new Date().getFullYear()} Shri Ram Smart Minds Academy (SRSMA). All rights reserved.</p>
              <div className="mt-2.5 flex items-center gap-4 font-medium sm:mt-0">
                <Link href="/login" className="transition hover:text-amber-600 dark:hover:text-amber-400">
                  Student Sign In
                </Link>
              </div>
            </div>
          </div>
        </footer>

        {/* Mobile-Only Floating Bottom Sticky Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 px-4 py-3.5 pb-[calc(0.85rem+env(safe-area-inset-bottom,0px))] backdrop-blur-lg sm:hidden dark:border-slate-800/90 dark:bg-[#071120]/95">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-xs font-bold tracking-wider uppercase text-amber-600 dark:text-amber-400">
                Board Challenge
              </span>
              <span className="text-sm font-black text-slate-900 dark:text-white">
                Class 10 • 20 Mins
              </span>
            </div>

            <Link
              href={destination}
              data-ga-cta="mobile_sticky_bottom_cta"
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-3 text-sm font-black text-slate-950 shadow-md shadow-amber-500/25 active:scale-95"
            >
              <span>Take Challenge</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
