# Cera Landing (React)

Красивый лендинг про восковые свечи на React + Vite.

## Требования

- Node.js 18+ (рекомендуется 20 LTS)
- npm 9+

## Стек

- React 18
- Vite 5
- GSAP (анимации)

## Запуск

```bash
npm install
npm run dev
```

После запуска откройте адрес, который покажет Vite (обычно `http://localhost:5173`).

## Форма заявки

Форма «Скидка 10%» отправляет данные в Yandex Cloud Function (`functions/send-email`), а та через [Yandex Cloud Postbox](https://yandex.cloud/ru/services/postbox) отправляет два письма: заявку владельцу (ответ на неё уходит клиенту) и письмо клиенту с промокодом. Первые 2000 писем в месяц бесплатны.

Функция авторизуется IAM-токеном сервисного аккаунта — ключи доступа хранить не нужно. Зависимостей у неё нет.

### Настройка

Понадобятся аккаунт Yandex Cloud с платёжным аккаунтом, свой домен и [yc CLI](https://yandex.cloud/ru/docs/cli/quickstart).

1. **Адрес отправителя.** В консоли Yandex Cloud → Postbox → «Создать адрес» укажите домен (например, `example.ru`) и селектор DKIM. Добавьте в DNS домена выданную TXT-запись и дождитесь статуса «Подтверждён».
2. **Сервисный аккаунт** с правом отправки писем:

   ```bash
   yc iam service-account create --name candles-mailer
   yc resource-manager folder add-access-binding <id каталога> \
     --role postbox.sender \
     --subject serviceAccount:<id сервисного аккаунта>
   ```

3. **Функция:**

   ```bash
   yc serverless function create --name send-email
   yc serverless function allow-unauthenticated-invoke send-email
   yc serverless function version create \
     --function-name send-email \
     --runtime nodejs22 \
     --entrypoint index.handler \
     --memory 128m \
     --execution-timeout 10s \
     --source-path functions/send-email \
     --service-account-id <id сервисного аккаунта> \
     --environment FROM_EMAIL=hello@example.ru,OWNER_EMAIL=<ваша почта>,PROMO_CODE=CANDLE10 \
     --environment ALLOWED_ORIGINS="https://example.ru http://localhost:5173"
   ```

   - `FROM_EMAIL` — адрес на подтверждённом в Postbox домене;
   - `OWNER_EMAIL` — куда приходят заявки;
   - `PROMO_CODE` — промокод в письме клиенту (если не задан, клиенту придёт письмо «скоро пришлём промокод»);
   - `ALLOWED_ORIGINS` — адреса сайта через пробел, с которых разрешено отправлять форму.

4. Скопируйте `.env.example` в `.env` и впишите адрес функции `https://functions.yandexcloud.net/<id функции>` в `VITE_FORM_ENDPOINT`. Перезапустите `npm run dev`.

Ошибки отправки видны в логах функции: `yc serverless function logs send-email`.

## Сборка

```bash
npm run build
npm run preview
```

Если видите ошибку вида `crypto.getRandomValues is not a function`, обновите Node.js до версии 18+.

## Docker

Образ собирает сайт и раздаёт его через nginx от непривилегированного пользователя на порту `8080`.

```bash
docker build -t cera-landing:1.0.0 .
docker run --rm -p 8080:8080 -e FORM_ENDPOINT=https://functions.yandexcloud.net/<id функции> cera-landing:1.0.0
```

Адрес функции отправки формы передаётся при запуске контейнера через `FORM_ENDPOINT`: при старте он записывается в `/config.js`, поэтому один и тот же образ подходит для любого окружения. Пересобирать образ при смене адреса не нужно. Проверка здоровья — `GET /healthz`.

## Kubernetes

Манифесты лежат в `k8s/` и собираются через Kustomize (встроен в `kubectl`): Namespace `candles`, Deployment (2 реплики, read-only файловая система, без root), Service, Ingress с TLS через cert-manager и PodDisruptionBudget.

Перед деплоем поправьте под свой кластер:

- `k8s/kustomization.yaml` — `images` (реестр и тег образа) и `FORM_ENDPOINT` в `configMapGenerator`;
- `k8s/ingress.yaml` — домен, `ingressClassName` и имя `ClusterIssuer` cert-manager.

```bash
docker build -t <registry>/cera-landing:1.0.0 .
docker push <registry>/cera-landing:1.0.0
kubectl apply -k k8s
kubectl -n candles rollout status deployment/candles-landing
```

При изменении `FORM_ENDPOINT` в `kustomization.yaml` и повторном `kubectl apply -k k8s` поды перезапустятся сами.

## Argo CD

В `argocd/` лежат манифесты для GitOps-деплоя:

- `project.yaml` — AppProject `candles`: разрешает брать манифесты только из этого репозитория и деплоить только в namespace `candles`;
- `application.yaml` — Application `candles-landing`: следит за папкой `k8s/` в ветке `main`, автоматически синхронизирует изменения, удаляет лишние ресурсы (`prune`) и откатывает ручные правки в кластере (`selfHeal`).

Репозиторий приватный, поэтому сначала дайте Argo CD доступ к нему — fine-grained токеном GitHub с правом **Contents: Read-only** на репозиторий `candels`. Токен не коммитьте:

```bash
argocd repo add https://github.com/SamRozhkov/candels.git \
  --username SamRozhkov --password <github-токен>
```

Затем:

```bash
kubectl apply -f argocd/project.yaml -f argocd/application.yaml
argocd app get candles-landing
```

Дальше деплой идёт через git: меняете тег образа или `FORM_ENDPOINT` в `k8s/kustomization.yaml`, пушите в `main` — Argo CD применит изменения сам. Образ должен лежать в реестре, доступном кластеру (см. раздел «Kubernetes»).

## Структура

- `index.html` - HTML-шаблон
- `src/main.jsx` - точка входа React
- `src/App.jsx` - основной компонент лендинга
- `src/styles.css` - стили
- `functions/send-email/index.js` - облачная функция отправки писем
- `Dockerfile`, `docker/` - образ и конфигурация nginx
- `k8s/` - манифесты Kubernetes (Kustomize)
- `argocd/` - Application и AppProject для Argo CD
- `AGENTS.md` - правила для AI-агентов в проекте
