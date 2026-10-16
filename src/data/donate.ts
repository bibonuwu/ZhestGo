import type { Localized } from './vocabulary';

/**
 * Contacts and payment details for the “Support our project” window.
 *
 * Empty payment fields are not shown. While all of them are empty, the window
 * asks visitors to share the project instead.
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
  /** Where the donations go. Shown in the window with a map. */
  charity: {
    name: Localized;
    address: Localized;
    /** The organisation's card on 2GIS. */
    link: string;
    lat: number;
    lon: number;
  };
}

export const DONATE: DonateConfig = {
  kaspiPhone: '+7 777 138 77 93',
  kaspiLink: '',
  kaspiQr: '',
  cardNumber: '',
  recipient: 'Ғайнижамал Б.',
  amounts: [500, 1000, 2000, 5000],
  telegram: ['Gainiyusha', 'tenmakiuy'],
  charity: {
    name: {
      kk: 'Қызылорда облысы білім басқармасының №6 арнайы мектеп-интернаты',
      ru: 'Специальная школа-интернат №6 Управления образования Кызылординской области',
      en: 'Special boarding school No. 6, Kyzylorda Region Department of Education',
    },
    address: {
      kk: 'Мерей ш/а, 27, Қызылорда',
      ru: 'мкр. Мерей, 27, Кызылорда',
      en: '27 Merey microdistrict, Kyzylorda',
    },
    link: 'https://2gis.kz/kyzylorda/firm/70000001087542580/tab/info',
    lat: 44.845815,
    lon: 65.467061,
  },
};

/** An OpenStreetMap view centred on the charity, for an <iframe>. */
export function charityMapUrl(): string {
  const { lat, lon } = DONATE.charity;
  const d = 0.004;
  const bbox = [lon - d * 1.6, lat - d, lon + d * 1.6, lat + d].map((n) => n.toFixed(6)).join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;
}

export const hasKaspi = Boolean(DONATE.kaspiPhone || DONATE.kaspiLink || DONATE.kaspiQr);
export const hasCard = Boolean(DONATE.cardNumber);
export const telegramUrl = (username: string) => `https://t.me/${username}`;
