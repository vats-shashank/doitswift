/**
 * Client-side QR Code Generator UI.
 * @see docs/build-prompts/qr-code-generator-cursor-prompt.md §7
 */
import Papa from 'papaparse';
import JSZip from 'jszip';

export type QRType =
  | 'url'
  | 'text'
  | 'email'
  | 'phone'
  | 'sms'
  | 'wifi'
  | 'vcard'
  | 'whatsapp'
  | 'upi'
  | 'geo'
  | 'event'
  | 'app';

export interface DesignConfig {
  [key: string]: unknown;
}

/** Styling from the design panel; `logoDataUrl` is the embedded image or null. */
export interface QrDesignState {
  fg: string;
  bg: string;
  useGradient: boolean;
  gradType: 'linear' | 'radial';
  gradA: string;
  gradB: string;
  gradAngleDeg: number;
  dotType: 'square' | 'rounded' | 'dots' | 'classy' | 'classy-rounded' | 'extra-rounded';
  cornerFrame: 'square' | 'extra-rounded' | 'dot';
  cornerDot: 'square' | 'dot';
  logoDataUrl: string | null;
  logoSize: number;
  hideBackgroundDots: boolean;
  errorCorrection: 'L' | 'M' | 'Q' | 'H';
  /** 0–4: quiet area (px) around the code in the canvas, see qr-code-styling `margin` */
  margin: number;
}

export interface QRInput {
  type: QRType;
  fields: Record<string, string>;
}

const BYTE_MODE_MAX_M: readonly number[] = [
  0, 14, 26, 42, 62, 84, 106, 122, 152, 180, 213, 251, 287, 331, 362, 412, 450, 504, 560, 624, 666, 711, 779, 857,
  911, 997, 1059, 1125, 1190, 1264, 1370, 1452, 1538, 1628, 1722, 1809, 1911, 1989, 2099, 2213, 2331,
];

function minVersionForByteLengthM(byteLength: number): number {
  for (let v = 1; v <= 40; v += 1) {
    if (byteLength <= BYTE_MODE_MAX_M[v]!) return v;
  }
  return 40;
}

function utf8ByteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

const PREVIEW_PX = 300;
const DEBOUNCE_MS = 150;
const LOGO_MAX_BYTES = 2 * 1024 * 1024;

type QRStyling = {
  update: (opts: Record<string, unknown>) => void;
  append: (el: Element) => void;
  download: (opts: { name: string; extension: string }) => void | Promise<void>;
  getRawData: (ext: 'png' | 'jpeg' | 'svg' | 'webp') => Promise<Blob | Buffer | null>;
};

type QRStylingCtor = new (opts: Record<string, unknown>) => QRStyling;

function getQRCodeStyling(): QRStylingCtor {
  const Ctor = (typeof window !== 'undefined' && (window as unknown as { QRCodeStyling?: QRStylingCtor })
    .QRCodeStyling) as QRStylingCtor | undefined;
  if (!Ctor) {
    throw new Error('QRCodeStyling is not loaded (check the qr-code-styling script tag).');
  }
  return Ctor;
}

function cornerColor(design: QrDesignState): string {
  if (design.useGradient) return design.gradA;
  return design.fg;
}

/**
 * Build qr-code-styling options. Use `type: "svg"` for on-screen preview and SVG export, `"canvas"` for PNG/JPEG.
 * Top-level `margin` is the library’s border width in px (0–4 here).
 */
export function buildStylingConfig(
  data: string,
  design: QrDesignState,
  sizePx: number,
  renderType: 'svg' | 'canvas',
): Record<string, unknown> {
  const dots: { type: QrDesignState['dotType']; color?: string; gradient?: { type: string; rotation: number; colorStops: { offset: number; color: string }[] }; roundSize: boolean } = {
    type: design.dotType,
    roundSize: true,
  };
  if (design.useGradient) {
    dots.gradient = {
      type: design.gradType,
      rotation: design.gradType === 'linear' ? (design.gradAngleDeg * Math.PI) / 180 : 0,
      colorStops: [
        { offset: 0, color: design.gradA },
        { offset: 1, color: design.gradB },
      ],
    };
  } else {
    dots.color = design.fg;
  }
  const cCol = cornerColor(design);
  const base: Record<string, unknown> = {
    width: sizePx,
    height: sizePx,
    type: renderType,
    data: data || ' ',
    margin: design.margin,
    qrOptions: { errorCorrectionLevel: design.errorCorrection },
    dotsOptions: dots,
    cornersSquareOptions: { type: design.cornerFrame, color: cCol },
    cornersDotOptions: { type: design.cornerDot, color: cCol },
    backgroundOptions: { color: design.bg, round: 0 },
  };
  if (design.logoDataUrl) {
    base.image = design.logoDataUrl;
    base.imageOptions = {
      saveAsBlob: true,
      hideBackgroundDots: design.hideBackgroundDots,
      imageSize: design.logoSize,
      margin: 0,
    };
  }
  return base;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

// --- §7 payload builders (exported) ---

export function buildPayload_url(fields: Record<string, string>): string {
  const raw = (fields.url ?? '').trim();
  if (raw.length === 0) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

export function buildPayload_text(fields: Record<string, string>): string {
  return (fields.text ?? '').trim();
}

export function buildPayload_email(fields: Record<string, string>): string {
  const to = (fields.to ?? '').trim();
  if (to.length === 0) return '';
  const subject = (fields.subject ?? '').trim();
  const body = (fields.body ?? '').trim();
  const params: string[] = [];
  if (subject.length > 0) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body.length > 0) params.push(`body=${encodeURIComponent(body)}`);
  return params.length > 0 ? `mailto:${to}?${params.join('&')}` : `mailto:${to}`;
}

export function buildPayload_phone(fields: Record<string, string>): string {
  const t = (fields.phone ?? '').trim();
  if (t.length === 0) return '';
  const n = t.startsWith('+') ? `+${t.slice(1).replace(/\D/g, '')}` : t.replace(/\D/g, '');
  if (n.length === 0) return '';
  return `tel:${n}`;
}

export function buildPayload_sms(fields: Record<string, string>): string {
  const ph = (fields.phone ?? '').trim();
  if (ph.length === 0) return '';
  const m = (fields.message ?? '').trim();
  const digits = ph.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (m.length === 0) return `SMSTO:${digits}`;
  return `SMSTO:${digits}:${m}`;
}

/** Escape SSID and password for WIFI: T:...;S:...;P:... */
export function escapeWifiField(s: string): string {
  return s.replace(/([\\;,":])/g, '\\$1');
}

export function buildPayload_wifi(fields: Record<string, string>): string {
  const ssid = (fields.ssid ?? '').trim();
  if (ssid.length === 0) return '';
  const enc = (fields.encryption ?? 'WPA').trim();
  const password = fields.password ?? '';
  const hidden = (fields.hidden ?? 'false') === 'true' || (fields.hidden ?? '') === 'on';
  const t = enc === 'WEP' ? 'WEP' : enc === 'None' || enc === 'nopass' ? 'nopass' : 'WPA';
  const sEsc = escapeWifiField(ssid);
  const pEsc = escapeWifiField(t === 'nopass' ? '' : password);
  return `WIFI:T:${t};S:${sEsc};P:${pEsc};H:${hidden ? 'true' : 'false'};;`;
}

function escapeVCardText(s: string): string {
  return s.replace(/([\\,;])/g, '\\$1').replace(/\n/g, '\\n');
}

export function buildPayload_vcard(fields: Record<string, string>): string {
  const fn = (fields.firstName ?? '').trim();
  const ln = (fields.lastName ?? '').trim();
  if (fn.length === 0 || ln.length === 0) return '';
  const org = (fields.organization ?? '').trim();
  const title = (fields.title ?? '').trim();
  const pW = (fields.phoneWork ?? '').trim();
  const pM = (fields.phoneMobile ?? '').trim();
  const em = (fields.email ?? '').trim();
  const web = (fields.website ?? '').trim();
  const adr = (fields.address ?? '').trim();
  const fullName = `${fn} ${ln}`.trim();
  const lines: string[] = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${escapeVCardText(ln)};${escapeVCardText(fn)};;;`,
    `FN:${escapeVCardText(fullName)}`,
  ];
  if (org) lines.push(`ORG:${escapeVCardText(org)}`);
  if (title) lines.push(`TITLE:${escapeVCardText(title)}`);
  if (pW) lines.push(`TEL;TYPE=WORK,VOICE:${escapeVCardText(pW)}`);
  if (pM) lines.push(`TEL;TYPE=CELL,VOICE:${escapeVCardText(pM)}`);
  if (em) lines.push(`EMAIL:${escapeVCardText(em)}`);
  if (web) lines.push(`URL:${escapeVCardText(web)}`);
  if (adr) lines.push(`ADR;TYPE=WORK:;;${escapeVCardText(adr)};;;;`);
  lines.push('END:VCARD');
  return lines.join('\r\n');
}

export function buildPayload_whatsapp(fields: Record<string, string>): string {
  const p = (fields.phone ?? '').trim();
  if (p.length === 0) return '';
  const digits = p.replace(/\D/g, '');
  if (digits.length === 0) return '';
  const msg = (fields.message ?? '').trim();
  if (msg.length === 0) return `https://wa.me/${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
}

export function buildPayload_upi(fields: Record<string, string>): string {
  const pa = (fields.upiId ?? '').trim();
  if (pa.length === 0) return '';
  const pn = (fields.payeeName ?? '').trim();
  if (pn.length === 0) return '';
  let q = `upi://pay?pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent(pn)}&cu=INR`;
  const am = (fields.amount ?? '').trim();
  if (am.length > 0 && !Number.isNaN(Number(am))) {
    q += `&am=${encodeURIComponent(String(Number(am)))}`;
  }
  const note = (fields.note ?? '').trim();
  if (note.length > 0) {
    const n = note.slice(0, 50);
    q += `&tn=${encodeURIComponent(n)}`;
  }
  return q;
}

export function buildPayload_geo(fields: Record<string, string>): string {
  const latS = (fields.latitude ?? '').trim();
  const lngS = (fields.longitude ?? '').trim();
  if (latS.length === 0 || lngS.length === 0) return '';
  const lat = Number(latS);
  const lng = Number(lngS);
  if (Number.isNaN(lat) || Number.isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return '';
  const query = (fields.query ?? '').trim();
  if (query.length > 0) {
    return `geo:${lat},${lng}?q=${encodeURIComponent(query)}`;
  }
  return `geo:${lat},${lng}`;
}

/** datetime-local value → yyyymmddThhmmssZ (UTC) */
function toVEventUTC(dtLocal: string): string {
  if (dtLocal.length === 0) return '';
  const d = new Date(dtLocal);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getUTCFullYear();
  const mo = pad2(d.getUTCMonth() + 1);
  const day = pad2(d.getUTCDate());
  const h = pad2(d.getUTCHours());
  const mi = pad2(d.getUTCMinutes());
  const s = pad2(d.getUTCSeconds());
  return `${y}${mo}${day}T${h}${mi}${s}Z`;
}

export function buildPayload_event(fields: Record<string, string>): string {
  const title = (fields.title ?? '').trim();
  if (title.length === 0) return '';
  const start = toVEventUTC((fields.start ?? '').trim());
  const end = toVEventUTC((fields.end ?? '').trim());
  if (start.length === 0 || end.length === 0) return '';
  const loc = (fields.location ?? '').trim();
  const desc = (fields.description ?? '').trim();
  const lines: string[] = ['BEGIN:VEVENT', `SUMMARY:${title}`.replace(/\r|\n/g, ' ')];
  if (loc) lines.push(`LOCATION:${loc.replace(/\r|\n/g, ' ')}`);
  lines.push(`DTSTART:${start}`, `DTEND:${end}`);
  if (desc) {
    const esc = desc.replace(/\r\n|\n/g, '\\n');
    lines.push(`DESCRIPTION:${esc}`);
  }
  lines.push('END:VEVENT');
  return lines.join('\r\n');
}

export function buildPayload_app(fields: Record<string, string>): string {
  const platform = (fields.platform ?? 'ios').trim();
  if (platform === 'ios') return (fields.iosUrl ?? '').trim();
  if (platform === 'android') return (fields.androidUrl ?? '').trim();
  return (fields.landingUrl ?? '').trim();
}

export function buildPayloadForType(type: QRType, fields: Record<string, string>): string {
  switch (type) {
    case 'url':
      return buildPayload_url(fields);
    case 'text':
      return buildPayload_text(fields);
    case 'email':
      return buildPayload_email(fields);
    case 'phone':
      return buildPayload_phone(fields);
    case 'sms':
      return buildPayload_sms(fields);
    case 'wifi':
      return buildPayload_wifi(fields);
    case 'vcard':
      return buildPayload_vcard(fields);
    case 'whatsapp':
      return buildPayload_whatsapp(fields);
    case 'upi':
      return buildPayload_upi(fields);
    case 'geo':
      return buildPayload_geo(fields);
    case 'event':
      return buildPayload_event(fields);
    case 'app':
      return buildPayload_app(fields);
    default:
      return '';
  }
}

// --- bulk CSV (§6e) ---

const ALL_BULK_TYPES: ReadonlySet<string> = new Set([
  'url',
  'text',
  'email',
  'phone',
  'sms',
  'wifi',
  'vcard',
  'whatsapp',
  'upi',
  'geo',
  'event',
  'app',
]);

export interface BulkValidRow {
  type: QRType;
  content: string;
  filename: string;
  /** 1-based line number in the original file (data row) */
  line: number;
}

export interface CsvRowError {
  row: number;
  message: string;
}

const FILENAME_SAFE = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * If valid, the basename without extension; else empty.
 */
export function sanitizeFilename(s: string): string {
  const t = s.trim();
  if (!FILENAME_SAFE.test(t)) return '';
  return t;
}

/**
 * For simple types the CSV `content` is a single value; for complex types it is the pre-built payload string.
 */
export function buildBulkPayload(type: QRType, content: string): string {
  const c = content.trim();
  if (!c) return '';
  if (type === 'app') {
    if (!/^https?:\/\//i.test(c)) return '';
    return c.trim();
  }
  if (['wifi', 'vcard', 'upi', 'geo', 'event'].includes(type)) {
    return c;
  }
  if (type === 'whatsapp' && /^https?:\/\//i.test(c)) {
    return c;
  }
  if (type === 'url') return buildPayload_url({ url: c });
  if (type === 'text') return buildPayload_text({ text: c });
  if (type === 'email') return buildPayload_email({ to: c, subject: '', body: '' });
  if (type === 'phone') return buildPayload_phone({ phone: c });
  if (type === 'sms') {
    if (/^SMSTO:/i.test(c)) return c;
    return buildPayload_sms({ phone: c, message: '' });
  }
  if (type === 'whatsapp') return buildPayload_whatsapp({ phone: c, message: '' });
  return '';
}

function normalizeCsvObject(row: Record<string, unknown>): Record<string, string> {
  const o: Record<string, string> = {};
  for (const k of Object.keys(row)) {
    const key = k.trim().toLowerCase().replace(/^\uFEFF/g, '');
    o[key] = row[k] == null ? '' : String(row[k]).trim();
  }
  return o;
}

/**
 * Parse a CSV with Papa Parse. Expects a header row with at least `type` and `content` columns.
 */
export function parseCsv(
  file: File,
): Promise<{ rows: Record<string, string>[]; error?: string }> {
  return new Promise((resolve) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        const fields = (results.meta?.fields ?? []).map((f) => String(f).trim().toLowerCase().replace(/^\uFEFF/g, ''));
        if (!fields.includes('type') || !fields.includes('content')) {
          return resolve({
            rows: [],
            error: 'The CSV must include a header row with "type" and "content" columns. Download the template to see the format.',
          });
        }
        const fatal = results.errors?.[0];
        if (fatal && (fatal.type === 'Quotes' || (fatal as { type?: string }).type === 'FieldMismatch')) {
          return resolve({ rows: [], error: `CSV could not be parsed: ${fatal.message} (row ${(fatal.row ?? 0) + 1}).` });
        }
        const data = (results.data as Record<string, unknown>[])
          .map(normalizeCsvObject)
          .filter((r) => Object.values(r).some((v) => String(v).trim().length > 0));
        resolve({ rows: data });
      },
      error: (err: Error) => resolve({ rows: [], error: err.message || 'Failed to read CSV file.' }),
    });
  });
}

/**
 * Valid rows, row-level errors, and a file-level error if the header is wrong.
 */
export function validateRows(rows: Record<string, string>[]): {
  valid: BulkValidRow[];
  errors: CsvRowError[];
} {
  const errors: CsvRowError[] = [];
  const valid: BulkValidRow[] = [];
  if (rows.length === 0) {
    errors.push({ row: 0, message: 'The file has no data rows after the header.' });
    return { valid, errors };
  }
  for (let i = 0; i < rows.length; i += 1) {
    const r = rows[i]!;
    const line = i + 2;
    const tRaw = (r['type'] ?? '').trim().toLowerCase();
    if (!tRaw) {
      errors.push({ row: line, message: `Row ${line}: type is empty.` });
      continue;
    }
    if (!ALL_BULK_TYPES.has(tRaw)) {
      errors.push({ row: line, message: `Row ${line}: invalid type "${r['type']}".` });
      continue;
    }
    const type = tRaw as QRType;
    const content = (r['content'] ?? '').trim();
    if (!content) {
      errors.push({ row: line, message: `Row ${line}: content is empty.` });
      continue;
    }
    const fn = (r['filename'] ?? '').trim();
    if (fn && !FILENAME_SAFE.test(fn)) {
      errors.push({
        row: line,
        message: `Row ${line}: filename may only use letters, numbers, underscore, hyphen, max 64 characters.`,
      });
      continue;
    }
    const payload = buildBulkPayload(type, content);
    if (!payload) {
      errors.push({ row: line, message: `Row ${line}: could not build a scannable payload for type ${type} from the given content.` });
      continue;
    }
    if (type === 'url' && !/^https?:\/\//i.test(payload)) {
      errors.push({ row: line, message: `Row ${line}: url must become a valid http(s) link.` });
      continue;
    }
    valid.push({ type, content, filename: fn, line });
  }
  return { valid, errors };
}

const THUMB_PX = 80;

function batchZipBaseName(): string {
  const d = new Date();
  const ts = `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(
    d.getMinutes()
  )}${pad2(d.getSeconds())}`;
  return `doitswift-qr-batch-${ts}.zip`;
}

// --- filename & export ---

function exportBaseFilename(t: QRType): string {
  const d = new Date();
  const ts = `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(
    d.getMinutes()
  )}${pad2(d.getSeconds())}`;
  return `doitswift-qr-${t}-${ts}`;
}

/**
 * Rebuilds a fresh QRCodeStyling at the requested size and triggers download. No network use.
 * `nameWithoutExt` is the filename without extension (e.g. doitswift-qr-url-20260423-123456).
 */
export function exportStylingDownload(
  data: string,
  design: QrDesignState,
  sizePx: number,
  format: 'png' | 'svg' | 'jpeg',
  nameWithoutExt: string,
): void | Promise<void> {
  if (data.length === 0) return;
  const Ctor = getQRCodeStyling();
  const renderType: 'svg' | 'canvas' = format === 'svg' ? 'svg' : 'canvas';
  const inst = new Ctor(buildStylingConfig(data, design, sizePx, renderType));
  return inst.download({ name: nameWithoutExt, extension: format });
}

export function readQrDesignStateFromForm(logoDataUrl: string | null): QrDesignState {
  const fg = (document.getElementById('qrColorFg') as HTMLInputElement | null)?.value ?? '#000000';
  const bg = (document.getElementById('qrColorBg') as HTMLInputElement | null)?.value ?? '#ffffff';
  const useGrad = !!(document.getElementById('qrUseGradient') as HTMLInputElement | null)?.checked;
  const gradType = ((document.getElementById('qrGradType') as HTMLSelectElement | null)?.value as 'linear' | 'radial') ?? 'linear';
  const gradA = (document.getElementById('qrGradA') as HTMLInputElement | null)?.value ?? '#000000';
  const gradB = (document.getElementById('qrGradB') as HTMLInputElement | null)?.value ?? '#2563eb';
  const angleS = (document.getElementById('qrGradAngle') as HTMLInputElement | null)?.value ?? '0';
  const gradAngleDeg = Math.min(360, Math.max(0, Number(angleS) || 0));
  const dotEl = document.querySelector<HTMLInputElement>('input[name="qrDotType"]:checked');
  const dotType = (dotEl?.value as QrDesignState['dotType']) ?? 'square';
  const frameEl = document.querySelector<HTMLInputElement>('input[name="qrCornerFrame"]:checked');
  const cornerFrame = (frameEl?.value as QrDesignState['cornerFrame']) ?? 'square';
  const ballEl = document.querySelector<HTMLInputElement>('input[name="qrCornerDot"]:checked');
  const cornerDot = (ballEl?.value as QrDesignState['cornerDot']) ?? 'square';
  const logoSizeS = (document.getElementById('qrLogoSize') as HTMLInputElement | null)?.value ?? '0.35';
  const logoSize = Math.min(0.5, Math.max(0.2, Number(logoSizeS) || 0.35));
  const hideBackgroundDots = !!(document.getElementById('qrHideLogoDots') as HTMLInputElement | null)?.checked;
  const eccS = (document.getElementById('qrEcc') as HTMLSelectElement | null)?.value ?? 'M';
  const errorCorrection = (['L', 'M', 'Q', 'H'].includes(eccS) ? eccS : 'M') as QrDesignState['errorCorrection'];
  const marginS = (document.getElementById('qrCanvasMargin') as HTMLInputElement | null)?.value ?? '1';
  const margin = Math.min(4, Math.max(0, Math.round(Number(marginS) || 0)));

  return {
    fg,
    bg,
    useGradient: useGrad,
    gradType: gradType === 'radial' ? 'radial' : 'linear',
    gradA,
    gradB,
    gradAngleDeg,
    dotType,
    cornerFrame,
    cornerDot,
    logoDataUrl: logoDataUrl,
    logoSize,
    hideBackgroundDots,
    errorCorrection,
    margin,
  };
}

function readFieldsFromForm(type: QRType): Record<string, string> {
  const get = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null)?.value ?? '';
  const getChk = (id: string) => ((document.getElementById(id) as HTMLInputElement | null)?.checked ? 'true' : 'false');
  switch (type) {
    case 'url':
      return { url: get('qrUrl') };
    case 'text':
      return { text: get('qrText') };
    case 'email':
      return { to: get('qrEmailTo'), subject: get('qrEmailSubject'), body: get('qrEmailBody') };
    case 'phone':
      return { phone: get('qrPhoneTel') };
    case 'sms':
      return { phone: get('qrSmsPhone'), message: get('qrSmsMessage') };
    case 'wifi':
      return {
        ssid: get('qrWifiSsid'),
        encryption: get('qrWifiEnc'),
        password: get('qrWifiPassword'),
        hidden: getChk('qrWifiHidden'),
      };
    case 'vcard':
      return {
        firstName: get('qrVcardFirst'),
        lastName: get('qrVcardLast'),
        organization: get('qrVcardOrg'),
        title: get('qrVcardTitle'),
        phoneWork: get('qrVcardPhoneW'),
        phoneMobile: get('qrVcardPhoneM'),
        email: get('qrVcardEmail'),
        website: get('qrVcardWeb'),
        address: get('qrVcardAdr'),
      };
    case 'whatsapp':
      return { phone: get('qrWaPhone'), message: get('qrWaMessage') };
    case 'upi':
      return {
        upiId: get('qrUpiId'),
        payeeName: get('qrUpiName'),
        amount: get('qrUpiAmount'),
        note: get('qrUpiNote'),
      };
    case 'geo':
      return { latitude: get('qrLat'), longitude: get('qrLng'), query: get('qrGeoQuery') };
    case 'event':
      return {
        title: get('qrEventTitle'),
        location: get('qrEventLoc'),
        start: get('qrEventStart'),
        end: get('qrEventEnd'),
        description: get('qrEventDesc'),
      };
    case 'app': {
      const r = document.querySelector<HTMLInputElement>('input[name="qrAppPlatform"]:checked');
      return {
        platform: r?.value ?? 'ios',
        iosUrl: get('qrIosUrl'),
        androidUrl: get('qrAndroidUrl'),
        landingUrl: get('qrLandingUrl'),
      };
    }
    default:
      return {};
  }
}

function emptyMessageForType(type: QRType): string {
  const m: Record<QRType, string> = {
    url: 'Enter a website URL to preview the QR code.',
    text: 'Enter some text to preview the QR code.',
    email: "Enter a recipient's email to preview the QR code.",
    phone: 'Enter a phone number to preview the QR code.',
    sms: 'Enter a phone number to preview the SMS QR code.',
    wifi: 'Enter a network name (SSID) to preview the WiFi QR code.',
    vcard: 'Enter first and last name to preview the vCard QR code.',
    whatsapp: 'Enter a phone number to preview the WhatsApp QR code.',
    upi: 'Enter a UPI ID and payee name to preview the UPI QR code.',
    geo: 'Enter latitude and longitude to preview the location QR code.',
    event: 'Enter a title, start, and end time to preview the event QR code.',
    app: 'Choose a platform and enter a valid App Store or landing URL to preview the QR code.',
  };
  return m[type] ?? 'Enter content to preview the QR code.';
}

export function initQrGeneratorUI(_opts?: { root?: HTMLElement }): void {
  const inputArea = document.getElementById('qrInputArea');
  const designArea = document.getElementById('qrDesignArea');
  const previewEl = document.getElementById('qrPreview');
  const statusEl = document.getElementById('qrStatus');
  if (!inputArea || !previewEl || !statusEl) return;

  const typeTabButtons = document.querySelectorAll<HTMLButtonElement>('[data-qr-type]');
  const formPanels = document.querySelectorAll<HTMLFieldSetElement>('#qrInputArea fieldset.qr-form-panel');
  const wifiShowBtn = document.getElementById('qrWifiShowPwd') as HTMLButtonElement | null;
  const wifiPass = document.getElementById('qrWifiPassword') as HTMLInputElement | null;
  const wifiEnc = document.getElementById('qrWifiEnc') as HTMLSelectElement | null;
  const logoInput = document.getElementById('qrLogoFile') as HTMLInputElement | null;
  const logoErr = document.getElementById('qrLogoError') as HTMLParagraphElement | null;
  const logoClear = document.getElementById('qrLogoClear') as HTMLButtonElement | null;
  const useGradientEl = document.getElementById('qrUseGradient') as HTMLInputElement | null;
  const gradTypeEl = document.getElementById('qrGradType') as HTMLSelectElement | null;
  const gradBlock = document.getElementById('qrGradControls');
  const gradAngleRow = document.getElementById('qrGradAngleRow');
  const angleValue = document.getElementById('qrAngleValue');
  const logoSizeValue = document.getElementById('qrLogoSizeValue');
  const marginValue = document.getElementById('qrMarginValue');

  let activeType: QRType = 'url';
  let debounceT: ReturnType<typeof setTimeout> | null = null;
  let lastPreviewInstance: QRStyling | null = null;
  const previewPx = PREVIEW_PX;
  let logoDataUrl: string | null = null;
  let hadLogo = false;
  let lastGradientOn: boolean | null = null;

  function setStatus(msg: string): void {
    statusEl.textContent = msg;
  }

  function getPayloadForActiveType(): string {
    const fields = readFieldsFromForm(activeType);
    return buildPayloadForType(activeType, fields);
  }

  function setActiveType(t: QRType): void {
    activeType = t;
    typeTabButtons.forEach((btn) => {
      const isActive = btn.getAttribute('data-qr-type') === t;
      btn.classList.toggle('qr-type-tab--active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      btn.setAttribute('tabindex', isActive ? '0' : '-1');
    });
    formPanels.forEach((fs) => {
      const formType = fs.id.replace('qrForm-', '') as QRType;
      fs.toggleAttribute('hidden', formType !== t);
    });
    lastPreviewInstance = null;
    previewEl.innerHTML = '';
    renderPreview();
  }

  function isPayloadValid(t: QRType, data: string): { ok: boolean; err?: string } {
    if (data.length === 0) return { ok: false };
    if (t === 'url' && !data.startsWith('http://') && !data.startsWith('https://')) {
      return { ok: false, err: 'URL must use http:// or https:// after normalization.' };
    }
    if (t === 'app') {
      const f = readFieldsFromForm('app');
      if (f.platform === 'ios' && !f.iosUrl?.trim()) {
        return { ok: false, err: 'Enter an iOS App Store URL (https://apps.apple.com/...).' };
      }
      if (f.platform === 'android' && !f.androidUrl?.trim()) {
        return { ok: false, err: 'Enter a Google Play or app link (https://...).' };
      }
      if (f.platform === 'both' && !f.landingUrl?.trim()) {
        return { ok: false, err: 'Enter a landing page URL (your site can detect iOS vs Android).' };
      }
    }
    return { ok: true };
  }

  function syncGradUi(): void {
    if (!useGradientEl || !gradBlock) return;
    const on = useGradientEl.checked;
    gradBlock.toggleAttribute('hidden', !on);
    if (gradTypeEl && gradAngleRow) {
      const isLin = (gradTypeEl.value ?? 'linear') === 'linear';
      gradAngleRow.toggleAttribute('hidden', !on || !isLin);
    }
    if (angleValue) {
      const a = (document.getElementById('qrGradAngle') as HTMLInputElement | null)?.value ?? '0';
      angleValue.textContent = `${a}°`;
    }
  }

  function readDesign(): QrDesignState {
    return readQrDesignStateFromForm(logoDataUrl);
  }

  function renderPreview(): void {
    const data = getPayloadForActiveType();
    const vcheck = isPayloadValid(activeType, data);
    const design = readDesign();

    if (hadLogo && !design.logoDataUrl) {
      lastPreviewInstance = null;
      previewEl.innerHTML = '';
    }
    if (lastGradientOn !== null && lastGradientOn !== design.useGradient) {
      lastPreviewInstance = null;
      previewEl.innerHTML = '';
    }
    hadLogo = !!design.logoDataUrl;
    lastGradientOn = design.useGradient;
    if (logoSizeValue) {
      logoSizeValue.textContent = String(design.logoSize);
    }
    if (marginValue) {
      marginValue.textContent = String(design.margin);
    }

    if (data.length === 0) {
      previewEl.innerHTML = '';
      lastPreviewInstance = null;
      setStatus(emptyMessageForType(activeType));
      return;
    }

    if (vcheck.ok === false && vcheck.err) {
      previewEl.innerHTML = '';
      lastPreviewInstance = null;
      setStatus(vcheck.err!);
      return;
    }
    if (vcheck.ok === false) {
      previewEl.innerHTML = '';
      lastPreviewInstance = null;
      setStatus(emptyMessageForType(activeType));
      return;
    }

    if (activeType === 'upi') {
      const f = readFieldsFromForm('upi');
      if (f.upiId && !/^[\w.\-]+@[\w.\-]+$/.test(f.upiId.trim())) {
        previewEl.innerHTML = '';
        lastPreviewInstance = null;
        setStatus('UPI ID should look like: name@bank (letters, numbers, . and -).');
        return;
      }
    }

    if (activeType === 'app') {
      if (!data.startsWith('http://') && !data.startsWith('https://')) {
        previewEl.innerHTML = '';
        lastPreviewInstance = null;
        setStatus('App / landing link must use http:// or https://');
        return;
      }
    }

    try {
      const cfg = buildStylingConfig(data, design, previewPx, 'svg');
      const Ctor = getQRCodeStyling();
      if (!lastPreviewInstance) {
        lastPreviewInstance = new Ctor(cfg);
        previewEl.innerHTML = '';
        lastPreviewInstance.append(previewEl);
      } else {
        lastPreviewInstance.update(cfg);
      }
      const bytes = utf8ByteLength(data);
      const ver = minVersionForByteLengthM(bytes);
      const ecc = design.errorCorrection;
      let line = `Size: ${bytes} bytes (UTF-8) · ~Version ${ver} (est., EC ${ecc}) — Live preview · Margin ${design.margin}px`;
      if (activeType === 'text' && (readFieldsFromForm('text').text?.length ?? 0) > 500) {
        line += ' · Long text: QR will be dense; consider a shorter link if scanning fails.';
      }
      setStatus(line);
    } catch {
      previewEl.innerHTML = '';
      lastPreviewInstance = null;
      setStatus('Could not generate QR. Shorten the content or fix invalid fields.');
    }
  }

  function scheduleRender(): void {
    if (debounceT) clearTimeout(debounceT);
    debounceT = setTimeout(() => {
      debounceT = null;
      renderPreview();
    }, DEBOUNCE_MS);
  }

  function canExportData(): { ok: boolean; data?: string; err?: string } {
    const data = getPayloadForActiveType();
    if (data.length === 0) {
      return { ok: false, err: emptyMessageForType(activeType) };
    }
    const v = isPayloadValid(activeType, data);
    if (!v.ok) {
      return { ok: false, err: v.err ?? 'Complete the form before exporting.' };
    }
    if (activeType === 'upi' && (readFieldsFromForm('upi').upiId?.trim() ?? '')) {
      if (!/^[\w.\-]+@[\w.\-]+$/.test((readFieldsFromForm('upi').upiId ?? '').trim())) {
        return { ok: false, err: 'Fix UPI ID before exporting (e.g. name@bank).' };
      }
    }
    if (activeType === 'app' && !data.startsWith('http://') && !data.startsWith('https://')) {
      return { ok: false, err: 'App or landing link must use http:// or https://' };
    }
    return { ok: true, data };
  }

  function runExportFormat(format: 'png' | 'svg' | 'jpeg', sizePx: number): void {
    const chk = canExportData();
    if (!chk.ok || !chk.data) {
      setStatus(chk.err ?? 'Cannot export yet.');
      return;
    }
    const design = readDesign();
    const name = exportBaseFilename(activeType);
    try {
      void exportStylingDownload(chk.data, design, sizePx, format, name);
    } catch {
      setStatus('Download failed. Try again.');
    }
  }

  typeTabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const t = btn.getAttribute('data-qr-type') as QRType | null;
      if (t) setActiveType(t);
    });
  });

  inputArea.addEventListener('input', scheduleRender);
  inputArea.addEventListener('change', scheduleRender);
  if (designArea) {
    designArea.addEventListener('input', scheduleRender);
    designArea.addEventListener('change', () => {
      syncGradUi();
      scheduleRender();
    });
  }

  useGradientEl?.addEventListener('change', () => {
    syncGradUi();
    scheduleRender();
  });
  gradTypeEl?.addEventListener('change', () => {
    syncGradUi();
    scheduleRender();
  });
  document.getElementById('qrGradAngle')?.addEventListener('input', () => {
    if (angleValue) {
      const el = document.getElementById('qrGradAngle') as HTMLInputElement | null;
      angleValue.textContent = `${el?.value ?? '0'}°`;
    }
  });

  if (logoInput) {
    logoInput.addEventListener('change', () => {
      if (logoErr) logoErr.textContent = '';
      const f = logoInput.files?.[0];
      if (!f) {
        logoDataUrl = null;
        scheduleRender();
        return;
      }
      if (f.size > LOGO_MAX_BYTES) {
        if (logoErr) logoErr.textContent = 'This file is larger than 2 MB. Choose a smaller image.';
        logoInput.value = '';
        return;
      }
      const t = f.type || '';
      const name = f.name || '';
      const extOk = /\.(png|jpe?g|svg)$/i.test(name);
      if (t && !/^(image\/(png|jpeg|jpg|svg\+xml))$/i.test(t) && !extOk) {
        if (logoErr) logoErr.textContent = 'Use PNG, JPG, or SVG.';
        logoInput.value = '';
        return;
      }
      const fr = new FileReader();
      fr.onload = () => {
        logoDataUrl = typeof fr.result === 'string' ? fr.result : null;
        scheduleRender();
      };
      fr.onerror = () => {
        if (logoErr) logoErr.textContent = 'Could not read this file.';
        logoDataUrl = null;
        scheduleRender();
      };
      fr.readAsDataURL(f);
    });
  }
  logoClear?.addEventListener('click', () => {
    logoDataUrl = null;
    if (logoInput) logoInput.value = '';
    if (logoErr) logoErr.textContent = '';
    lastPreviewInstance = null;
    previewEl.innerHTML = '';
    hadLogo = false;
    scheduleRender();
  });

  if (wifiShowBtn && wifiPass) {
    wifiShowBtn.addEventListener('click', () => {
      if (wifiPass.type === 'password') {
        wifiPass.type = 'text';
        wifiShowBtn.setAttribute('aria-pressed', 'true');
        wifiShowBtn.textContent = 'Hide';
      } else {
        wifiPass.type = 'password';
        wifiShowBtn.setAttribute('aria-pressed', 'false');
        wifiShowBtn.textContent = 'Show';
      }
    });
  }

  if (wifiEnc && wifiPass) {
    wifiEnc.addEventListener('change', () => {
      const none = wifiEnc.value === 'None';
      if (none) {
        wifiPass.value = '';
        wifiPass.removeAttribute('required');
      } else {
        wifiPass.setAttribute('required', '');
      }
      renderPreview();
    });
  }

  const appRadios = document.querySelectorAll<HTMLInputElement>('input[name="qrAppPlatform"]');
  appRadios.forEach((r) => {
    r.addEventListener('change', () => {
      const v = (document.querySelector<HTMLInputElement>('input[name="qrAppPlatform"]:checked') || r).value;
      document.getElementById('qrAppGroupIos')?.toggleAttribute('hidden', v !== 'ios');
      document.getElementById('qrAppGroupAndroid')?.toggleAttribute('hidden', v !== 'android');
      document.getElementById('qrAppGroupBoth')?.toggleAttribute('hidden', v !== 'both');
      renderPreview();
    });
  });
  {
    const r0 = document.querySelector<HTMLInputElement>('input[name="qrAppPlatform"]:checked')?.value ?? 'ios';
    document.getElementById('qrAppGroupIos')?.toggleAttribute('hidden', r0 !== 'ios');
    document.getElementById('qrAppGroupAndroid')?.toggleAttribute('hidden', r0 !== 'android');
    document.getElementById('qrAppGroupBoth')?.toggleAttribute('hidden', r0 !== 'both');
  }

  document.getElementById('qrExportPng512')?.addEventListener('click', () => runExportFormat('png', 512));
  document.getElementById('qrExportPng1024')?.addEventListener('click', () => runExportFormat('png', 1024));
  document.getElementById('qrExportPng2048')?.addEventListener('click', () => runExportFormat('png', 2048));
  document.getElementById('qrExportSvg')?.addEventListener('click', () => runExportFormat('svg', 1024));
  document.getElementById('qrExportJpeg1024')?.addEventListener('click', () => runExportFormat('jpeg', 1024));

  // --- mode tabs (single / bulk) ---
  const elModeSingle = document.getElementById('qrModeSingle');
  const elModeBulk = document.getElementById('qrModeBulk');
  const elPanelSingle = document.getElementById('qrPanelSingle');
  const elPanelBulk = document.getElementById('qrPanelBulk');
  const elBulkDrop = document.getElementById('qrBulkDropzone');
  const elBulkInput = document.getElementById('qrBulkCsvInput') as HTMLInputElement | null;
  const elBulkErrorList = document.getElementById('qrBulkErrorList') as HTMLUListElement | null;
  const elBulkSummary = document.getElementById('qrBulkSummary');
  const elBulkTableBody = document.getElementById('qrBulkTableBody') as HTMLTableSectionElement | null;
  const elBulkOutput = document.getElementById('qrBulkOutput') as HTMLSelectElement | null;
  const elBulkGen = document.getElementById('qrBulkGenerate') as HTMLButtonElement | null;
  const elBulkProgress = document.getElementById('qrBulkProgress');
  const OUTPUT_ZIP: Record<string, { ext: 'png' | 'svg'; size: number; raw: 'png' | 'svg' }> = {
    'png-512': { ext: 'png', size: 512, raw: 'png' },
    'png-1024': { ext: 'png', size: 1024, raw: 'png' },
    'png-2048': { ext: 'png', size: 2048, raw: 'png' },
    'svg-1024': { ext: 'svg', size: 1024, raw: 'svg' },
  };
  let bulkValid: BulkValidRow[] = [];

  function setGenerationMode(mode: 'single' | 'bulk'): void {
    const isSingle = mode === 'single';
    elModeSingle?.classList.toggle('qr-mode-tab--active', isSingle);
    elModeBulk?.classList.toggle('qr-mode-tab--active', !isSingle);
    elModeSingle?.setAttribute('aria-selected', isSingle ? 'true' : 'false');
    elModeBulk?.setAttribute('aria-selected', isSingle ? 'false' : 'true');
    elModeSingle?.setAttribute('tabindex', isSingle ? '0' : '-1');
    elModeBulk?.setAttribute('tabindex', isSingle ? '-1' : '0');
    if (isSingle) {
      elPanelBulk?.setAttribute('hidden', '');
      elPanelSingle?.removeAttribute('hidden');
      renderPreview();
    } else {
      elPanelSingle?.setAttribute('hidden', '');
      elPanelBulk?.removeAttribute('hidden');
    }
  }
  elModeSingle?.addEventListener('click', () => setGenerationMode('single'));
  elModeBulk?.addEventListener('click', () => setGenerationMode('bulk'));

  function downloadBlobFile(blob: Blob, filename: string): void {
    const a = document.createElement('a');
    const u = URL.createObjectURL(blob);
    a.href = u;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 0);
  }

  async function renderBulkThumbs(rows: BulkValidRow[], design: QrDesignState): Promise<void> {
    if (!elBulkTableBody) return;
    elBulkTableBody.innerHTML = '';
    for (const row of rows.slice(0, 5)) {
      const data = buildBulkPayload(row.type, row.content);
      const tr = document.createElement('tr');
      const td0 = document.createElement('td');
      td0.textContent = row.type;
      const td1 = document.createElement('td');
      td1.textContent = row.content.length > 64 ? `${row.content.slice(0, 64)}…` : row.content;
      td1.title = row.content;
      const td2 = document.createElement('td');
      td2.textContent = row.filename || '—';
      const td3 = document.createElement('td');
      td3.className = 'qr-bulk-preview-cell';
      tr.appendChild(td0);
      tr.appendChild(td1);
      tr.appendChild(td2);
      tr.appendChild(td3);
      elBulkTableBody.appendChild(tr);
      if (!data) {
        td3.textContent = '—';
        continue;
      }
      try {
        const Ctor = getQRCodeStyling();
        const inst = new Ctor(buildStylingConfig(data, design, THUMB_PX, 'canvas'));
        const b = await inst.getRawData('png');
        if (b && b instanceof Blob) {
          const u = URL.createObjectURL(b);
          const im = document.createElement('img');
          im.width = THUMB_PX;
          im.height = THUMB_PX;
          im.src = u;
          im.alt = 'QR';
          im.onload = () => URL.revokeObjectURL(u);
          td3.appendChild(im);
        }
      } catch {
        td3.textContent = 'Error';
      }
    }
  }

  async function handleBulkCsvFile(file: File | undefined): Promise<void> {
    bulkValid = [];
    if (elBulkErrorList) {
      elBulkErrorList.innerHTML = '';
    }
    if (elBulkTableBody) elBulkTableBody.innerHTML = '';
    if (elBulkGen) elBulkGen.disabled = true;
    if (elBulkProgress) elBulkProgress.textContent = '';
    if (!file) {
      if (elBulkSummary) elBulkSummary.textContent = '';
      return;
    }
    if (!file.name.toLowerCase().endsWith('.csv')) {
      if (elBulkSummary) elBulkSummary.textContent = '';
      if (elBulkErrorList) {
        const li = document.createElement('li');
        li.textContent = 'Please use a .csv file.';
        elBulkErrorList.appendChild(li);
      }
      return;
    }
    const { rows, error: parseErr } = await parseCsv(file);
    if (parseErr) {
      if (elBulkSummary) elBulkSummary.textContent = '';
      if (elBulkErrorList) {
        const li = document.createElement('li');
        li.textContent = parseErr;
        elBulkErrorList.appendChild(li);
      }
      return;
    }
    const { valid, errors } = validateRows(rows);
    bulkValid = valid;
    if (elBulkSummary) {
      elBulkSummary.textContent = `${valid.length} valid row(s) of ${rows.length} data row(s).${
        errors.length ? ` ${errors.length} row(s) or column issue(s) below.` : ''
      }`;
    }
    if (elBulkErrorList && errors.length) {
      for (const e of errors) {
        const li = document.createElement('li');
        li.textContent = e.message;
        elBulkErrorList.appendChild(li);
      }
    }
    if (elBulkGen) elBulkGen.disabled = valid.length === 0;
    const design = readDesign();
    if (elBulkProgress) elBulkProgress.textContent = 'Rendering preview…';
    await renderBulkThumbs(valid, design);
    if (elBulkProgress) elBulkProgress.textContent = '';
  }

  elBulkInput?.addEventListener('change', () => {
    void handleBulkCsvFile(elBulkInput.files?.[0]);
  });
  elBulkDrop?.addEventListener('click', () => elBulkInput?.click());
  elBulkDrop?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      elBulkInput?.click();
    }
  });
  elBulkDrop?.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    elBulkDrop.classList.add('is-dragover');
  });
  elBulkDrop?.addEventListener('dragleave', () => {
    elBulkDrop.classList.remove('is-dragover');
  });
  elBulkDrop?.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    elBulkDrop.classList.remove('is-dragover');
    const f = e.dataTransfer?.files?.[0];
    void handleBulkCsvFile(f);
  });

  elBulkGen?.addEventListener('click', async () => {
    if (bulkValid.length === 0) return;
    if (bulkValid.length > 500) {
      if (
        !window.confirm(
          `You're about to generate ${bulkValid.length} codes. This may take a minute and use significant memory. Keep this tab open. Continue?`,
        )
      ) {
        return;
      }
    }
    const outKey = elBulkOutput?.value ?? 'png-1024';
    const o = OUTPUT_ZIP[outKey] ?? OUTPUT_ZIP['png-1024']!;
    if (!elBulkGen) return;
    elBulkGen.disabled = true;
    const design = readDesign();
    const zip = new JSZip();
    const zipName = batchZipBaseName();
    try {
      for (let i = 0; i < bulkValid.length; i += 1) {
        if (elBulkProgress) {
          elBulkProgress.textContent = `Generating ${i + 1}/${bulkValid.length}…`;
        }
        await new Promise((r) => {
          setTimeout(r, 0);
        });
        const row = bulkValid[i]!;
        const data = buildBulkPayload(row.type, row.content);
        if (!data) continue;
        const Ctor = getQRCodeStyling();
        const renderT: 'svg' | 'canvas' = o.raw === 'svg' ? 'svg' : 'canvas';
        const inst = new Ctor(buildStylingConfig(data, design, o.size, renderT));
        const blob = await inst.getRawData(o.raw);
        if (!blob || !(blob instanceof Blob)) continue;
        const base = sanitizeFilename(row.filename) || `qr-${i + 1}`;
        const fname = `${base}.${o.ext === 'png' ? 'png' : 'svg'}`;
        zip.file(fname, blob);
      }
      if (elBulkProgress) elBulkProgress.textContent = 'Building ZIP file…';
      const outBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlobFile(outBlob, zipName);
      if (elBulkProgress) elBulkProgress.textContent = `Downloaded ${zipName}.`;
    } catch {
      if (elBulkProgress) {
        elBulkProgress.textContent = 'ZIP build failed. Try a smaller file or close other browser tabs.';
      }
    } finally {
      if (elBulkGen) {
        elBulkGen.disabled = bulkValid.length === 0;
      }
    }
  });

  syncGradUi();
  renderPreview();
}