import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme, type TextStyle } from 'react-native';
import { tokens, type ColorRole } from './tokens';

export type Colors = Record<ColorRole, string>;
export type TypeRole = keyof typeof tokens.type;

type Theme = {
  scheme: 'light' | 'dark';
  c: Colors;
  space: typeof tokens.space;
  radius: typeof tokens.radius;
  layout: typeof tokens.layout;
  type: (role: TypeRole) => TextStyle;
};

const ThemeContext = createContext<Theme | null>(null);

export function ThemeRoot({ children }: { children: ReactNode }) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const value = useMemo<Theme>(
    () => ({
      scheme,
      c: tokens.color[scheme] as Colors,
      space: tokens.space,
      radius: tokens.radius,
      layout: tokens.layout,
      type: (role) => {
        const t = tokens.type[role];
        return {
          fontSize: t.size,
          lineHeight: t.line,
          fontWeight: String(t.weight) as TextStyle['fontWeight'],
        };
      },
    }),
    [scheme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const t = useContext(ThemeContext);
  if (!t) throw new Error('useTheme must be used inside <ThemeRoot>');
  return t;
}

/** 4px-grid spacing by index: s(4) = 16. */
export const s = (i: number) => tokens.space[i];
