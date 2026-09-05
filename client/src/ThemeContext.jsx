import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const ThemeContext =
  createContext(null);

const LIGHT_COLORS = {
  mode: 'light',

  background: '#f5f8ff',
  backgroundSecondary: '#eef4ff',
  surface: '#ffffff',
  surfaceSecondary: '#f8faff',
  surfaceHover: '#eff6ff',

  text: '#172033',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',

  primary: '#2563eb',
  primaryHover: '#1d4ed8',
  primarySoft: '#eff6ff',
  primaryBorder: '#dbeafe',

  border: '#e2e8f0',
  borderSoft: '#edf2f7',

  success: '#16a34a',
  successSoft: '#f0fdf4',

  warning: '#d97706',
  warningSoft: '#fffbeb',

  danger: '#dc2626',
  dangerSoft: '#fef2f2',

  shadow:
    '0 12px 35px rgba(37, 99, 235, 0.08)',

  shadowLarge:
    '0 22px 60px rgba(37, 99, 235, 0.12)',
};

const DARK_COLORS = {
  mode: 'dark',

  background: '#07101f',
  backgroundSecondary: '#091426',
  surface: '#0f172a',
  surfaceSecondary: '#0b1526',
  surfaceHover: '#172235',

  text: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',

  primary: '#6366f1',
  primaryHover: '#818cf8',
  primarySoft:
    'rgba(99, 102, 241, 0.14)',
  primaryBorder:
    'rgba(129, 140, 248, 0.22)',

  border:
    'rgba(148, 163, 184, 0.14)',
  borderSoft:
    'rgba(148, 163, 184, 0.08)',

  success: '#22c55e',
  successSoft:
    'rgba(34, 197, 94, 0.09)',

  warning: '#f59e0b',
  warningSoft:
    'rgba(245, 158, 11, 0.09)',

  danger: '#ef4444',
  dangerSoft:
    'rgba(239, 68, 68, 0.09)',

  shadow:
    '0 12px 35px rgba(0, 0, 0, 0.20)',

  shadowLarge:
    '0 22px 60px rgba(0, 0, 0, 0.30)',
};

function getSystemTheme() {
  if (
    typeof window ===
    'undefined'
  ) {
    return 'light';
  }

  return window.matchMedia(
    '(prefers-color-scheme: dark)'
  ).matches
    ? 'dark'
    : 'light';
}

function getSavedTheme() {
  if (
    typeof window ===
    'undefined'
  ) {
    return 'light';
  }

  const saved =
    localStorage.getItem(
      'task-manager-theme'
    );

  if (
    saved === 'light' ||
    saved === 'dark' ||
    saved === 'system'
  ) {
    return saved;
  }

  // Default theme is always Light.
  return 'light';
}

export function ThemeProvider({
  children,
}) {
  const [
    themePreference,
    setThemePreferenceState,
  ] = useState(
    getSavedTheme
  );

  const [
    systemTheme,
    setSystemTheme,
  ] = useState(
    getSystemTheme
  );

  useEffect(() => {
    const media =
      window.matchMedia(
        '(prefers-color-scheme: dark)'
      );

    const handleChange = (
      event
    ) => {
      setSystemTheme(
        event.matches
          ? 'dark'
          : 'light'
      );
    };

    if (
      media.addEventListener
    ) {
      media.addEventListener(
        'change',
        handleChange
      );
    } else {
      media.addListener(
        handleChange
      );
    }

    return () => {
      if (
        media.removeEventListener
      ) {
        media.removeEventListener(
          'change',
          handleChange
        );
      } else {
        media.removeListener(
          handleChange
        );
      }
    };
  }, []);

  const resolvedTheme =
    themePreference ===
    'system'
      ? systemTheme
      : themePreference;

  const colors =
    resolvedTheme === 'dark'
      ? DARK_COLORS
      : LIGHT_COLORS;

  const setThemePreference =
    (nextTheme) => {
      if (
        nextTheme !==
          'light' &&
        nextTheme !==
          'dark' &&
        nextTheme !==
          'system'
      ) {
        return;
      }

      setThemePreferenceState(
        nextTheme
      );

      localStorage.setItem(
        'task-manager-theme',
        nextTheme
      );
    };

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-theme',
      resolvedTheme
    );

    document.documentElement.style.colorScheme =
      resolvedTheme;

    document.body.style.margin =
      '0';

    document.body.style.background =
      colors.background;

    document.body.style.color =
      colors.text;
  }, [
    resolvedTheme,
    colors,
  ]);

  const value = useMemo(
    () => ({
      themePreference,
      resolvedTheme,
      colors,
      setThemePreference,

      isDark:
        resolvedTheme ===
        'dark',
    }),
    [
      themePreference,
      resolvedTheme,
      colors,
    ]
  );

  return (
    <ThemeContext.Provider
      value={value}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context =
    useContext(
      ThemeContext
    );

  if (!context) {
    throw new Error(
      'useTheme must be used inside ThemeProvider'
    );
  }

  return context;
}

export {
  LIGHT_COLORS,
  DARK_COLORS,
};