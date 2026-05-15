/**
 * Localization (l10n) file for the Rehabilitation Center "New Life"
 * Provides context-aware Ukrainian translations for all system UI elements.
 */

export const l10n = {
  auth: {
    title: 'ЦЕНТР',
    subtitle: 'Система управління духовним центром «Нове Життя»',
    loginGoogle: 'Увійти через Google',
    onlyAuthorized: 'Лише для авторизованого персоналу',
    accessDenied: 'ДОСТУП ЗАБОРОНЕНО',
    staffOnlyRequired: 'Для доступу до цієї системи ви повинні мати роль «Співробітник». Будь ласка, зверніться до адміністратора.',
    logout: 'Вийти з облікового запису',
    loading: 'Перевірка авторизації...',
  },
  common: {
    loading: 'Завантаження...',
    save: 'Зберегти',
    cancel: 'Скасувати',
    delete: 'Видалити',
    error: 'Сталася помилка',
    success: 'Виконано успішно',
    search: 'Пошук...',
    noData: 'Даних не знайдено',
    all: 'Всі',
    today: 'Сьогодні',
    now: 'Зараз',
  },
  dashboard: {
    welcome: 'Вітаємо,',
    verseTitle: 'СЛОВО НА СЬОГОДНІ',
    activeTasks: 'Активні завдання',
    recentReports: 'Останні звіти',
    notifications: 'Сповіщення',
    noNotifications: 'Немає нових сповіщень',
    nextDuty: 'Наступне чергування',
  },
  patients: {
    listTitle: 'Підопічні центру',
    addPatient: 'Додати підопічного',
    status: {
      stable: 'Стабільний',
      critical: 'Критичний',
      improving: 'Покращення',
    },
    progress: 'Прогрес',
    admissionDate: 'Зараховано',
    stage: 'Етап',
    details: {
      profile: 'Профіль підопічного',
      about: 'Про підопічного',
      contacts: 'Контакти',
      address: 'Адреса',
      records: 'Записи та історія',
      addReport: 'Створити звіт',
    },
    labels: {
      name: 'ПІБ підопічного',
      status: 'Поточний стан',
      phone: 'Телефон',
      address: 'Місто / Адреса',
      about: 'Коротка історія або примітки',
    }
  },
  reports: {
    title: 'Звіт про стан підопічного',
    type: 'Тип взаємодії',
    types: {
      conversation: 'Розмова',
      prayer: 'Молитва',
      lesson: 'Урок',
      visit: 'Візит',
    },
    fields: {
      topics: 'Теми обговорення',
      spiritualState: 'Духовний та емоційний стан',
      changes: 'Зміни в поведінці / реакціях',
      prayerNeeds: 'Молитовні потреби',
      statusLabel: 'Оцінка стану після зустрічі',
    },
    history: 'Історія звітів',
    noReports: 'Звітів поки немає',
  },
  chat: {
    channels: 'Чат',
    placeholder: 'Напишіть повідомлення...',
    systemMessage: 'Система',
    roles: {
      staff: 'Співробітник',
      admin: 'Адміністратор',
      mentor: 'Ментор',
    }
  },
  schedule: {
    title: 'Графік служінь',
    mySchedule: 'Мій розклад',
    dutySchedule: 'Чергування',
    editDuty: 'Редагувати чергових',
    ministers: 'Чергові служителі',
    tasksForDate: 'Завдання на',
  },
  finance: {
    title: 'Фінансова звітність',
    balance: 'Поточний баланс',
    income: 'Надходження',
    expense: 'Витрати',
    donations: 'Благодійні внески',
    operations: 'Останні операції',
  },
  sermons: {
    title: 'Бібліотека',
    preacher: 'Проповідник',
    theme: 'Тема проповіді',
    categories: {
      all: 'Всі',
      spirituality: 'Духовність',
      psychology: 'Психологія',
      addiction: 'Залежність',
      video: 'Відео',
    },
    actions: {
      open: 'Відкрити',
    }
  },
  profile: {
    title: 'Мій профіль',
    vision: 'Моє служіння та бачення',
    mentorGoal: 'Духовна мета',
    menu: {
      users: 'Управління учасниками',
      prayers: 'Мої замітки та молитви',
      schedule: 'Налаштування графіку',
      security: 'Сповіщення та безпека',
      support: 'Служба підтримки',
    }
  }
};
