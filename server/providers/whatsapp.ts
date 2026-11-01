/**
 * WhatsApp Business API providers. OTPs go out with an *authentication* template (copy-code
 * button); receipts and reminders with *utility* templates. The console provider is used in
 * TEST_MODE or when no key is configured. There is no SMS and no email OTP.
 */
export interface WhatsappProvider {
  /** Returns false when the message could not be delivered (number not on WhatsApp, API error). */
  sendOtp(phone: string, code: string): Promise<boolean>;
  sendUtility(phone: string, text: string): Promise<boolean>;
  sendEmail(email: string, subject: string, text: string): Promise<boolean>;
}

export const consoleProvider: WhatsappProvider = {
  async sendOtp(phone, code) { console.log(`[whatsapp:console] OTP → +${phone}: ${code}`); return true; },
  async sendUtility(phone, text) { console.log(`[whatsapp:console] → +${phone}: ${text}`); return true; },
  async sendEmail(email, subject, text) { console.log(`[email:console] → ${email}: ${subject} — ${text}`); return true; },
};

async function post(url: string, headers: Record<string, string>, body: unknown) {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
    return r.ok;
  } catch {
    return false;
  }
}

/** Meta Cloud API or MSG91. Fill template names from your approved templates. */
export const httpProvider: WhatsappProvider = {
  async sendOtp(phone, code) {
    const key = process.env.WHATSAPP_API_KEY;
    if (!key) return false;
    if (process.env.WHATSAPP_PROVIDER === 'meta')
      return post(`https://graph.facebook.com/v19.0/${process.env.WHATSAPP_SENDER}/messages`, { authorization: `Bearer ${key}` }, {
        messaging_product: 'whatsapp', to: phone, type: 'template',
        template: { name: process.env.WHATSAPP_AUTH_TEMPLATE, language: { code: 'en' }, components: [{ type: 'body', parameters: [{ type: 'text', text: code }] }, { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] }] },
      });
    if (process.env.WHATSAPP_PROVIDER === 'msg91')
      return post('https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/', { authkey: key }, {
        integrated_number: process.env.WHATSAPP_SENDER, content_type: 'template',
        payload: { messaging_product: 'whatsapp', type: 'template', template: { name: process.env.WHATSAPP_AUTH_TEMPLATE, language: { code: 'en', policy: 'deterministic' }, to_and_components: [{ to: [phone], components: { body_1: { type: 'text', value: code }, button_1: { subtype: 'url', type: 'text', value: code } } }] } },
      });
    return false;
  },
  async sendUtility(phone, text) {
    const key = process.env.WHATSAPP_API_KEY;
    if (!key) return false;
    if (process.env.WHATSAPP_PROVIDER === 'meta')
      return post(`https://graph.facebook.com/v19.0/${process.env.WHATSAPP_SENDER}/messages`, { authorization: `Bearer ${key}` }, {
        messaging_product: 'whatsapp', to: phone, type: 'template',
        template: { name: process.env.WHATSAPP_UTILITY_TEMPLATE, language: { code: 'hi' }, components: [{ type: 'body', parameters: [{ type: 'text', text }] }] },
      });
    return false;
  },
  async sendEmail(email, subject, text) {
    const url = process.env.EMAIL_API_URL;
    if (!url) return false;
    return post(url, { authorization: `Bearer ${process.env.EMAIL_API_KEY ?? ''}` }, { from: process.env.EMAIL_FROM, to: email, subject, text });
  },
};

export const provider = (): WhatsappProvider => (process.env.TEST_MODE === 'true' || !process.env.WHATSAPP_API_KEY ? consoleProvider : httpProvider);
