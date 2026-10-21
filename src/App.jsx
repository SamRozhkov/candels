import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import logoSvgRaw from './assets/logo.svg?raw';

const features = [
  '100% натуральный воск без парафина и токсичных добавок.',
  'Хлопковый фитиль для ровного, спокойного пламени.',
  'Дизайн баночек, который вписывается в любой интерьер.'
];

const recommendationPages = {
  candle: {
    title: 'Рекомендации по использованию свечи',
    items: [
      'При первом зажжении дайте верхнему слою воска полностью расплавиться, во избежание образования лунки.',
      'Обрезайте фитиль перед каждым зажжением, в идеале он должен быть 5-7 мм. Правильная высота фитиля важна для чистого горения и красивого пламени.',
      'Не задувайте свечу, а накрывайте крышкой из комплекта, перекрыв доступ кислорода. Это позволит избежать неприятного запаха и дыма.',
      'Не оставляйте свечу гореть дольше 3 часов. Долгое горение перегревает стекло, может исказить аромат и привести к разрушению фитиля. Оптимально - 1,5-3 часа.',
      'Храните свечу в закрытом виде. Так аромат останется стойким и на свече не образуется пыль.',
      'Храните в прохладном и сухом месте, вдали от прямых солнечных лучей и батарей.'
    ]
  },
  diffuser: {
    title: 'Рекомендации по использованию аромадиффузора',
    items: [
      'Аккуратно откройте крышку и вставьте необходимое количество палочек.',
      'Через 24 часа палочки полностью пропитаются, наполнив все пространство комнаты.',
      'Переворачивайте палочки раз в 2-3 дня.',
      'Для регулирования интенсивности аромата, а также продления срока службы диффузора используйте разное количество палочек. Чем больше палочек, тем аромат интенсивнее, а срок использования короче.',
      'Для равномерного распределения запаха рекомендуем располагать аромадиффузор в центре комнаты, в месте с хорошей циркуляцией воздуха.',
      'Не располагайте аромадиффузор на лакированных и окрашенных поверхностях.',
      'Беречь от детей, домашних животных и огня.'
    ]
  },
  sachet: {
    title: 'Флорентийское / ароматическое саше используется',
    items: ['для ароматизации небольших помещений', 'в бельевых шкафах и комодах', 'в гардеробных'],
    notes: [
      'Благодаря своему составу, плитка не тает, поэтому риска испачкать вещи нет.',
      '*Аромат удерживается в такой плитке до 6 мес.',
      '*Хранить при температуре не выше 25 градусов и влажности не выше 70%. Вдали от прямых солнечных лучей и отопительных приборов.'
    ]
  },
  car: {
    title: 'Рекомендации по использованию автопарфюма',
    items: [
      'Открутите деревянную крышку.',
      'Извлеките пластиковую крышку из горлышка флакона.',
      'Закрутите обратно деревянную крышку.',
      'Переверните флакон на 3-5 сек., чтобы крышка пропиталась раствором. Повторяйте процедуру по мере необходимости. При частом смачивании деревянной крышки, флакона хватает примерно на 1-3 мес.'
    ],
    notes: [
      '*В теплое время года аромат испаряется быстрее, чем в холодное!',
      'Меры предосторожности',
      'Храните и размещайте флакон в недоступном для детей и животных месте. Вдали от источников тепла, раскаленных предметов, открытого огня.',
      'При попадании раствора на кожу или в глаза немедленно промойте холодной водой. Избегать попадания на пластик и другие поверхности, может оставлять следы.'
    ]
  },
  spa: {
    title: 'Рекомендации по использованию spa-свечи',
    items: [
      'Зажечь фитиль и подождать несколько минут пока не расплавится весь бассейн свечи.',
      'Потушить свечу, закрыв крышку. Температура свечи будет комфортной для тела (приятной и не обжигающей).',
      'Небольшое количество воска втирающими движениями распределить по коже.',
      'Излишки масла можно промокнуть бумажной салфеткой. Средство не требует смывания, благодаря чему кожа еще долгое время остается увлажненной и защищенной.'
    ]
  }
};

const recommendationLinks = [
  { slug: 'candle', label: 'Свечи' },
  { slug: 'diffuser', label: 'Аромадиффузор' },
  { slug: 'sachet', label: 'Саше' },
  { slug: 'car', label: 'Автопарфюм' },
  { slug: 'spa', label: 'SPA-свеча' }
];

function getPageFromHash() {
  const hash = window.location.hash.replace(/^#\/?/, '');
  if (!hash || hash === 'home') {
    return { type: 'home', slug: null };
  }

  const match = hash.match(/^recommendations\/(candle|diffuser|sachet|car|spa)$/);
  if (match) {
    return { type: 'recommendation', slug: match[1] };
  }

  return { type: 'home', slug: null };
}

gsap.registerPlugin(ScrollTrigger);

function prepareLogoMarkup(svgText) {
  const parsed = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const svg = parsed.querySelector('svg');

  if (!svg) {
    return '';
  }

  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.classList.add('brand-logo-svg');
  return svg.outerHTML;
}

const logoSvgMarkup = prepareLogoMarkup(logoSvgRaw);

// Заявки уходят в Yandex Cloud Function (functions/send-email), которая через Postbox
// пишет владельцу и отправляет клиенту письмо с промокодом.
// В контейнере адрес берётся из runtime-конфига (/config.js), при локальной разработке — из .env.
const FORM_ENDPOINT = window.APP_CONFIG?.formEndpoint || import.meta.env.VITE_FORM_ENDPOINT;

const formStatusMessages = {
  idle: '',
  sending: '',
  success: 'Спасибо! Промокод на скидку 10% придёт на вашу почту.',
  error: 'Не получилось отправить заявку. Попробуйте ещё раз чуть позже.'
};

// Пути логотипа выше этой отметки (в координатах viewBox) — иконка, ниже — надпись.
const LOGO_TEXT_TOP = 520;

export default function App() {
  const [formState, setFormState] = useState({ name: '', email: '' });
  const [formStatus, setFormStatus] = useState('idle');
  const [pageState, setPageState] = useState(getPageFromHash());
  const appRef = useRef(null);

  useEffect(() => {
    const onHashChange = () => {
      setPageState(getPageFromHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHashChange);

    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Вступительная анимация шапки — один раз при загрузке.
  useLayoutEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      return undefined;
    }

    const ctx = gsap.context(() => {
      gsap.from('.nav', {
        y: -22,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out'
      });

      const logoPaths = gsap.utils.toArray('.logo-draw path');

      if (logoPaths.length > 0) {
        const iconPaths = [];
        const textPaths = [];

        logoPaths.forEach((path) => {
          const fill = path.getAttribute('fill') || '#5a391b';
          const stroke = path.getAttribute('stroke');
          const pathLength = path.getTotalLength();

          (path.getBBox().y < LOGO_TEXT_TOP ? iconPaths : textPaths).push(path);

          gsap.set(path, {
            fill: 'transparent',
            stroke: stroke && stroke !== 'none' ? stroke : fill,
            strokeWidth: path.getAttribute('stroke-width') || 1.2,
            strokeDasharray: pathLength,
            strokeDashoffset: pathLength
          });
          path.dataset.origFill = fill;
        });

        const iconTargets = iconPaths.length ? iconPaths : logoPaths;
        const originalFill = (index, path) => path.dataset.origFill;

        const timeline = gsap
          .timeline({ delay: 0.08 })
          .fromTo('.logo-draw', { opacity: 0, scale: 0.97 }, { opacity: 1, scale: 1, duration: 0.35, ease: 'power2.out' })
          .to(iconTargets, { strokeDashoffset: 0, duration: 0.95, stagger: 0.01, ease: 'power2.out' })
          .to(iconTargets, { fill: originalFill, duration: 0.25, ease: 'power2.out' }, '-=0.15');

        if (textPaths.length) {
          timeline
            .to(textPaths, { strokeDashoffset: 0, duration: 1.35, stagger: 0.004, ease: 'power1.inOut' }, '+=0.3')
            .to(textPaths, { fill: originalFill, duration: 0.45, ease: 'power2.out' }, '-=0.18');
        }
      }

      gsap.from('.brand-copy > *', {
        y: 22,
        opacity: 0,
        duration: 0.7,
        stagger: 0.1,
        delay: 0.15,
        ease: 'power3.out'
      });

      gsap.from('.header-menu .menu-link', {
        y: 14,
        opacity: 0,
        duration: 0.55,
        stagger: 0.06,
        delay: 0.25,
        ease: 'power2.out'
      });

      gsap.to('.glow-left', {
        x: 24,
        y: 14,
        scale: 1.05,
        repeat: -1,
        yoyo: true,
        duration: 9,
        ease: 'sine.inOut'
      });

      gsap.to('.glow-right', {
        x: -24,
        y: -14,
        scale: 1.04,
        repeat: -1,
        yoyo: true,
        duration: 10,
        ease: 'sine.inOut'
      });
    }, appRef);

    return () => ctx.revert();
  }, []);

  // Появление секций — при каждой смене страницы.
  useLayoutEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      return undefined;
    }

    const ctx = gsap.context(() => {
      if (pageState.type === 'home') {
        gsap.set(['.about', '.features p', '.cta'], { autoAlpha: 0, y: 24 });

        gsap.to('.about', {
          y: 0,
          autoAlpha: 1,
          duration: 0.75,
          ease: 'power3.out',
          scrollTrigger: { trigger: '.about', start: 'top 82%' }
        });

        gsap.to('.features p', {
          y: 0,
          autoAlpha: 1,
          duration: 0.55,
          stagger: 0.1,
          ease: 'power2.out',
          scrollTrigger: { trigger: '.about', start: 'top 78%' }
        });

        gsap.to('.cta', {
          y: 0,
          autoAlpha: 1,
          duration: 0.75,
          ease: 'power3.out',
          scrollTrigger: { trigger: '.cta', start: 'top 82%' }
        });
      } else {
        gsap.set(['.recommendation-page', '.recommendation-page .tips li', '.recommendation-page .sachet-notes p'], {
          autoAlpha: 0,
          y: 24
        });

        gsap.to('.recommendation-page', {
          y: 0,
          autoAlpha: 1,
          duration: 0.75,
          ease: 'power3.out',
          scrollTrigger: { trigger: '.recommendation-page', start: 'top 82%' }
        });

        gsap.to('.recommendation-page .tips li, .recommendation-page .sachet-notes p', {
          y: 0,
          autoAlpha: 1,
          duration: 0.5,
          stagger: 0.08,
          ease: 'power2.out',
          scrollTrigger: { trigger: '.recommendation-page', start: 'top 78%' }
        });
      }
    }, appRef);

    return () => ctx.revert();
  }, [pageState.type, pageState.slug]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!FORM_ENDPOINT) {
      console.error('Не задан VITE_FORM_ENDPOINT — форма не может отправить заявку.');
      setFormStatus('error');
      return;
    }

    setFormStatus('sending');

    try {
      // text/plain — «простой» запрос без CORS-preflight; функция сама разбирает JSON.
      const response = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify({
          name: formState.name,
          email: formState.email,
          botcheck: event.target.elements.botcheck.checked
        })
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }

      setFormStatus('success');
      setFormState({ name: '', email: '' });
    } catch (error) {
      console.error('Не удалось отправить заявку:', error);
      setFormStatus('error');
    }
  };

  const isHome = pageState.type === 'home';
  const activeRecommendation = pageState.slug ? recommendationPages[pageState.slug] : null;
  const currentYear = new Date().getFullYear();

  return (
    <div ref={appRef}>
      <div className="glow glow-left"></div>
      <div className="glow glow-right"></div>

      <header className="hero">
        <nav className="nav">
          <div className="brand-block">
            <a className="brand brand-link" href="#/home" aria-label="Resource Laboratory">
              <span
                className="brand-logo logo-draw"
                role="img"
                aria-label="Resource Laboratory"
                dangerouslySetInnerHTML={{ __html: logoSvgMarkup }}
              />
            </a>
            <div className="brand-copy">
              <h1 className="hero-title nav-title">Свечи, которые наполняют ресурсом</h1>
              <p className="subtitle nav-subtitle">Натуральный воск, природные ароматы и ручная работа в каждой детали.</p>
            </div>
          </div>
          <div className="header-menu">
            {recommendationLinks.map((link) => (
              <a className="menu-link" key={link.slug} href={`#/recommendations/${link.slug}`}>
                {link.label}
              </a>
            ))}
            {!isHome ? (
              <a className="menu-link menu-link-home" href="#/home">
                На главную
              </a>
            ) : null}
          </div>
        </nav>
      </header>

      <main>
        {isHome ? (
          <>
            <section className="about">
              <h2>Почему наши свечи особенные</h2>
              <div className="features">
                {features.map((feature) => (
                  <p key={feature}>{feature}</p>
                ))}
              </div>
            </section>

            <section id="order" className="cta">
              <h2>Получите скидку 10% на первый заказ</h2>
              <form className="form" onSubmit={handleSubmit}>
                <input
                  type="text"
                  name="name"
                  value={formState.name}
                  placeholder="Ваше имя"
                  onChange={handleChange}
                  required
                />
                <input
                  type="email"
                  name="email"
                  value={formState.email}
                  placeholder="Email"
                  onChange={handleChange}
                  required
                />
                <input type="checkbox" name="botcheck" className="form-honeypot" tabIndex={-1} autoComplete="off" />
                <button type="submit" disabled={formStatus === 'sending'}>
                  {formStatus === 'sending' ? 'Отправляем…' : 'Оформить'}
                </button>
              </form>
              <p className={`form-status form-status-${formStatus}`} role="status" aria-live="polite">
                {formStatusMessages[formStatus]}
              </p>
              <p className="note">Нажимая «Оформить», вы соглашаетесь с обработкой данных.</p>
            </section>
          </>
        ) : (
          activeRecommendation && (
            <>
              <section className="recommendations recommendation-page">
                <h2>{activeRecommendation.title}</h2>
                <ul className="tips">
                  {activeRecommendation.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>

                {activeRecommendation.notes ? (
                  <div className="sachet-notes">
                    {activeRecommendation.notes.map((note) => (
                      <p className={note === 'Меры предосторожности' ? 'safety-title' : ''} key={note}>
                        {note}
                      </p>
                    ))}
                  </div>
                ) : null}
              </section>

              
            </>
          )
        )}
      </main>

      <footer className="site-footer">
        <p>© {currentYear} Resource Laboratory. Все права защищены.</p>
      </footer>
    </div>
  );
}
