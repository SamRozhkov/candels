// Yandex Cloud Function: принимает заявку с лендинга и отправляет два письма через Yandex Cloud Postbox —
// уведомление владельцу и письмо клиенту с промокодом. Авторизация — IAM-токен привязанного
// сервисного аккаунта (роль postbox.sender), поэтому ключи доступа хранить не нужно.
//
// Переменные окружения:
//   FROM_EMAIL       — адрес отправителя на подтверждённом в Postbox домене, например hello@example.ru
//   OWNER_EMAIL      — куда присылать заявки
//   ALLOWED_ORIGINS  — домены сайта через пробел, например "https://example.ru http://localhost:5173"
//   PROMO_CODE       — промокод для письма клиенту (необязательно)

const POSTBOX_URL = 'https://postbox.cloud.yandex.net/v2/email/outbound-emails';
const BRAND = 'Resource Laboratory';
const EMAIL_PATTERN = /^[^\s@<>()",;]+@[^\s@<>()",;]+\.[^\s@<>()",;]+$/;
const LINK_PATTERN = /https?:|www\.|\.(ru|com|net|org|info|xyz)\b/i;

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(/[\s,]+/)
  .map((origin) => origin.trim())
  .filter(Boolean);

function corsHeaders(origin) {
  const allowOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || '';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin'
  };
}

function reply(statusCode, origin, body) {
  return {
    statusCode,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json; charset=utf-8' },
    body: body === undefined ? '' : JSON.stringify(body)
  };
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

function parseBody(event) {
  const raw = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : event.body || '';
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function letter({ to, subject, text, html, replyTo }) {
  return {
    FromEmailAddress: `${BRAND} <${process.env.FROM_EMAIL}>`,
    Destination: { ToAddresses: [to] },
    ...(replyTo ? { ReplyToAddresses: [replyTo] } : {}),
    Content: {
      Simple: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: {
          Text: { Data: text, Charset: 'UTF-8' },
          Html: { Data: html, Charset: 'UTF-8' }
        }
      }
    }
  };
}

function ownerLetter(name, email) {
  const safeName = escapeHtml(name);
  return letter({
    to: process.env.OWNER_EMAIL,
    replyTo: email,
    subject: `Новая заявка на скидку 10% — ${name}`,
    text: `Новая заявка с сайта ${BRAND}.\n\nИмя: ${name}\nEmail: ${email}\n\nЧтобы ответить клиенту, просто ответьте на это письмо.`,
    html: `<p>Новая заявка с сайта ${BRAND}.</p><p><b>Имя:</b> ${safeName}<br><b>Email:</b> ${escapeHtml(email)}</p><p>Чтобы ответить клиенту, просто ответьте на это письмо.</p>`
  });
}

function clientLetter(name, email) {
  const promo = process.env.PROMO_CODE;
  const promoText = promo
    ? `Ваш промокод на скидку 10% на первый заказ: ${promo}`
    : 'Мы получили вашу заявку и скоро пришлём промокод на скидку 10% на первый заказ.';
  const promoHtml = promo
    ? `<p>Ваш промокод на скидку 10% на первый заказ:</p><p style="font-size:24px;font-weight:700;letter-spacing:0.08em;color:#a84d22">${escapeHtml(promo)}</p>`
    : `<p>${promoText}</p>`;

  return letter({
    to: email,
    subject: `Скидка 10% на первый заказ — ${BRAND}`,
    text: `${name}, здравствуйте!\n\n${promoText}\n\nСпасибо, что выбрали свечи ${BRAND}.`,
    html: `<div style="font-family:Arial,sans-serif;color:#241a14;line-height:1.5"><p>${escapeHtml(name)}, здравствуйте!</p>${promoHtml}<p>Спасибо, что выбрали свечи ${BRAND}.</p></div>`
  });
}

async function sendLetter(token, payload) {
  const response = await fetch(POSTBOX_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-YaCloud-SubjectToken': token },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Postbox ${response.status}: ${await response.text()}`);
  }
}

module.exports.handler = async function handler(event, context) {
  const origin = (event.headers && (event.headers.Origin || event.headers.origin)) || '';

  if (event.httpMethod === 'OPTIONS') {
    return reply(204, origin);
  }

  if (event.httpMethod !== 'POST') {
    return reply(405, origin, { ok: false, error: 'method_not_allowed' });
  }

  if (allowedOrigins.length && !allowedOrigins.includes(origin)) {
    return reply(403, origin, { ok: false, error: 'forbidden_origin' });
  }

  const data = parseBody(event);
  if (!data) {
    return reply(400, origin, { ok: false, error: 'invalid_json' });
  }

  // Поле-ловушка: его заполняют только боты — отвечаем «успехом», ничего не отправляя.
  if (data.botcheck) {
    return reply(200, origin, { ok: true });
  }

  const name = String(data.name || '').trim();
  const email = String(data.email || '').trim();

  if (!name || name.length > 60 || LINK_PATTERN.test(name) || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return reply(400, origin, { ok: false, error: 'invalid_fields' });
  }

  const token = context && context.token && context.token.access_token;
  if (!token || !process.env.FROM_EMAIL || !process.env.OWNER_EMAIL) {
    console.error('Функция не настроена: нет сервисного аккаунта или переменных FROM_EMAIL / OWNER_EMAIL.');
    return reply(500, origin, { ok: false, error: 'not_configured' });
  }

  try {
    await sendLetter(token, ownerLetter(name, email));
    await sendLetter(token, clientLetter(name, email));
  } catch (error) {
    console.error(error);
    return reply(502, origin, { ok: false, error: 'send_failed' });
  }

  return reply(200, origin, { ok: true });
};
