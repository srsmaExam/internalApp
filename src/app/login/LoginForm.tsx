'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Alert, Button, Input, Label } from '@/components/ui';
import { Dialog } from '@/components/Dialog';
import { Phone, Sparkles } from 'lucide-react';
import { trackGaEvent } from '@/lib/analytics';

const COUNTRY_CODES = [
  { code: '+91', label: '🇮🇳 India (+91)' },
  { code: '+1', label: '🇺🇸 US / Canada (+1)' },
  { code: '+44', label: '🇬🇧 UK (+44)' },
  { code: '+971', label: '🇦🇪 UAE (+971)' },
  { code: '+65', label: '🇸🇬 Singapore (+65)' },
  { code: '+61', label: '🇦🇺 Australia (+61)' },
  { code: '+966', label: '🇸🇦 Saudi Arabia (+966)' },
  { code: '+974', label: '🇶🇦 Qatar (+974)' },
  { code: '+968', label: '🇴🇲 Oman (+968)' },
  { code: '+965', label: '🇰🇼 Kuwait (+965)' },
  { code: '+973', label: '🇧🇭 Bahrain (+973)' },
  { code: '+49', label: '🇩🇪 Germany (+49)' },
  { code: '+33', label: '🇫🇷 France (+33)' },
  { code: '+81', label: '🇯🇵 Japan (+81)' },
  { code: '+60', label: '🇲🇾 Malaysia (+60)' },
  { code: '+977', label: '🇳🇵 Nepal (+977)' },
  { code: '+880', label: '🇧🇩 Bangladesh (+880)' },
  { code: '+94', label: '🇱🇰 Sri Lanka (+94)' },
  { code: 'other', label: '🌐 Other (Enter code)' },
];

const CLASS_OPTIONS = ['8', '9', '10', '11', '12', '13'];

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();

  // Phone inputs
  const [selectedCode, setSelectedCode] = useState('+91');
  const [customCode, setCustomCode] = useState('');
  const [phone, setPhone] = useState('');

  // New Student details modal state
  const [showModal, setShowModal] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [selectedClass, setSelectedClass] = useState('10');
  const [modalError, setModalError] = useState<string | null>(null);

  // Status & error
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const notice =
    params.get('reason') === 'session_expired'
      ? 'Your session expired. Please sign in again.'
      : null;

  const effectiveCountryCode = selectedCode === 'other' ? customCode : selectedCode;

  // Auto-redirect if student already has a valid session
  useEffect(() => {
    fetch('/api/analytics/student/me')
      .then((res) => {
        if (res.ok) router.replace('/student');
      })
      .catch(() => {});
  }, [router]);

  async function executeLogin(fullName?: string, classLevel?: string) {
    const cleanDigits = phone.replace(/\D/g, '');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: cleanDigits,
        countryCode: effectiveCountryCode,
        fullName: fullName || undefined,
        classLevel: classLevel || undefined,
      }),
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.message ?? 'Sign-in failed. Please verify your phone number.');
    }

    trackGaEvent(fullName ? 'sign_up' : 'login', {
      method: 'direct_phone',
      class_level: classLevel,
    });

    router.replace(body.homeUrl || '/student');
    router.refresh();
  }

  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const cleanDigits = phone.replace(/\D/g, '');
    if (cleanDigits.length < 7) {
      setError('Please enter a valid phone number (at least 7 digits).');
      setBusy(false);
      return;
    }

    if (selectedCode === 'other' && !customCode.trim()) {
      setError('Please enter your country code (e.g. +91).');
      setBusy(false);
      return;
    }

    try {
      const checkRes = await fetch('/api/auth/check-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanDigits,
          countryCode: effectiveCountryCode,
        }),
      });

      const checkData = await checkRes.json();
      if (!checkRes.ok) {
        setError(checkData.message ?? 'Failed to verify phone number.');
        setBusy(false);
        return;
      }

      if (checkData.requiresDetails) {
        if (checkData.fullName) setStudentName(checkData.fullName);
        if (checkData.classLevel) setSelectedClass(checkData.classLevel);
        setShowModal(true);
        setBusy(false);
        return;
      }

      await executeLogin();
    } catch (err: any) {
      setError(err.message || 'Could not reach the server. Please check your internet connection.');
      setBusy(false);
    }
  }

  async function onModalSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentName.trim()) {
      setModalError('Please enter your name.');
      return;
    }

    setBusy(true);
    setModalError(null);

    try {
      await executeLogin(studentName.trim(), selectedClass);
      setShowModal(false);
    } catch (err: any) {
      setModalError(err.message || 'Failed to complete sign-in. Please try again.');
      setBusy(false);
    }
  }

  return (
    <>
      <form
        onSubmit={handlePhoneSubmit}
        className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-200/80 transition-colors dark:bg-slate-900 dark:ring-slate-800"
        aria-label="Student sign in"
      >
        {notice && (
          <Alert tone="brand" className="mb-4 text-xs">
            {notice}
          </Alert>
        )}

        {error && (
          <Alert tone="red" className="mb-4 text-xs" role="alert">
            {error}
          </Alert>
        )}

        <div className="mb-5">
          <Label htmlFor="phone-input" className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Phone / Mobile Number
          </Label>
          <div className="flex gap-2">
            {/* Country Code Selector */}
            <div className={selectedCode === 'other' ? 'w-28 flex-shrink-0' : 'w-36 flex-shrink-0'}>
              <select
                id="country-code-select"
                aria-label="Country Code"
                value={selectedCode}
                onChange={(e) => setSelectedCode(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom country code text input */}
            {selectedCode === 'other' && (
              <div className="w-20 flex-shrink-0">
                <Input
                  id="custom-country-code"
                  placeholder="+XX"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value)}
                  className="text-center font-mono text-sm"
                  required
                />
              </div>
            )}

            {/* Phone Number Input */}
            <div className="flex-1">
              <Input
                id="phone-input"
                name="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                autoFocus
                value={phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^\d\s-]/g, '');
                  setPhone(val);
                }}
                placeholder="e.g. 98765 43210"
                className="text-base tracking-wide"
                required
              />
            </div>
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Phone className="size-3.5 text-brand-600 dark:text-brand-400" />
            Enter your mobile or WhatsApp number for instant student access.
          </p>
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full rounded-xl bg-brand-700 py-2.5 text-base font-medium shadow-sm transition hover:bg-brand-800 dark:bg-brand-600 dark:hover:bg-brand-500"
          disabled={busy}
        >
          {busy ? 'Signing in…' : 'Sign in as Student'}
        </Button>
      </form>

      {/* Student Details Prompt Modal */}
      <Dialog
        isOpen={showModal}
        onClose={() => !busy && setShowModal(false)}
        size="sm"
        title="Complete Your Profile"
        description="Enter your name and class to personalize your test scorecard and detailed report."
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => setShowModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="student-details-form"
              size="sm"
              disabled={busy}
              className="bg-brand-700 hover:bg-brand-800 dark:bg-brand-600"
            >
              {busy ? 'Saving…' : 'Continue to Test'}
            </Button>
          </div>
        }
      >
        <form id="student-details-form" onSubmit={onModalSubmit} className="space-y-4 py-2">
          {modalError && (
            <Alert tone="red" className="text-xs">
              {modalError}
            </Alert>
          )}

          <div>
            <Label htmlFor="student-name-input" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="student-name-input"
              autoFocus
              required
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="e.g. Aditya Sharma"
              className="text-sm"
            />
          </div>

          <div>
            <Label htmlFor="student-class-select" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Class <span className="text-red-500">*</span>
            </Label>
            <select
              id="student-class-select"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              {CLASS_OPTIONS.map((cls) => (
                <option key={cls} value={cls}>
                  Class {cls} {cls === '10' ? '(Default)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
            <span className="flex items-center gap-1.5 font-semibold">
              <Sparkles className="size-3.5 shrink-0" />
              Diagnostic Test Ready
            </span>
            <p className="mt-0.5 text-[11px] text-amber-700/90 dark:text-amber-400">
              Your report will be customized based on your curriculum level.
            </p>
          </div>
        </form>
      </Dialog>
    </>
  );
}
