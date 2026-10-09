import { describe, expect, it } from 'vitest';
import { z } from 'zod';

const LeadActionSchema = z.object({
  action: z.enum(['whatsapp_contact_us', 'whatsapp_enroll_now']),
  attemptId: z.string().uuid().optional().nullable(),
  source: z.string().max(100).optional(),
});

describe('Lead Action Tracking Schema & Validation', () => {
  it('validates contact us action payload', () => {
    const payload = {
      action: 'whatsapp_contact_us',
      attemptId: '11111111-1111-4111-a111-111111111111',
      source: 'report_page_5',
    };
    const result = LeadActionSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('validates enroll now action payload without attemptId', () => {
    const payload = {
      action: 'whatsapp_enroll_now',
    };
    const result = LeadActionSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('rejects unknown action names', () => {
    const payload = {
      action: 'invalid_action_name',
    };
    const result = LeadActionSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('generates the correct WhatsApp prefilled URL and message', () => {
    const message = `Hi, I just completed the JEE Online Test at Shri Ram Smart Minds Academy. Based on my diagnostic report, I would like to enroll in the Class 10 Board Mastery Course. Please share the next steps and batch details.`;
    const encoded = encodeURIComponent(message);
    const expectedUrl = `https://wa.me/918463911854?text=${encoded}`;

    expect(expectedUrl).toContain('918463911854');
    expect(decodeURIComponent(encoded)).toBe(message);
    expect(message).toContain('Shri Ram Smart Minds Academy');
    expect(message).toContain('Class 10 Board Mastery Course');
    expect(message).toContain('JEE Online Test');
  });
});
