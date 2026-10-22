/**
 * Contacts and payment details for the “Support our project” window.
 *
 * Empty payment fields are not shown. While all of them are empty, the window
 * asks visitors to share the project instead. The payment itself happens in
 * the visitor's own bank app: the site never asks for or sees card details.
 */
export interface DonateConfig {
  /** Kaspi Gold phone number for transfers. */
  kaspiPhone: string;
  /** Kaspi payment link (Kaspi app → QR / “Payment link”), e.g. 'https://pay.kaspi.kz/pay/...'. */
  kaspiLink: string;
  /** Kaspi QR image placed in public/, e.g. 'donate/kaspi-qr.png'. */
  kaspiQr: string;
  /** Bank card number, e.g. '4400 4301 2345 6789'. */
  cardNumber: string;
  /** Recipient name shown next to the details. */
  recipient: string;
  /** Suggested amounts in tenge. */
  amounts: readonly number[];
  /** Telegram usernames (without @) for questions and help. */
  telegram: readonly string[];
}

export const DONATE: DonateConfig = {
  kaspiPhone: '+7 777 138 77 93',
  kaspiLink: '',
  kaspiQr: '',
  cardNumber: '',
  recipient: 'Ғайнижамал Б.',
  amounts: [500, 1000, 2000, 5000],
  telegram: ['Gainiyusha', 'tenmakiuy'],
};

export const hasKaspi = Boolean(DONATE.kaspiPhone || DONATE.kaspiLink || DONATE.kaspiQr);
export const hasCard = Boolean(DONATE.cardNumber);
export const telegramUrl = (username: string) => `https://t.me/${username}`;
