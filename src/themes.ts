export type ThemeName = 'RETRO' | 'MODERN';

export type Palette = {
  pageBg: string;
  // Canvas / LCD area
  canvasBg: string;
  canvasFg: string;
  canvasDim: string;
  canvasAccent: string;
  // Shell / device
  shell: string;
  shellDark: string;
  shellLight: string;
  key: string;
  keyText: string;
  brand: string;
  brandLabel: string;
  // Modal
  modalBg: string;
  modalFg: string;
  modalInputBg: string;
  modalBorder: string;
};

export const palettes: Record<ThemeName, Palette> = {
  RETRO: {
    pageBg:
      'radial-gradient(circle at 50% 0%, #2a2f3a 0%, #0f1218 70%, #07090d 100%)',
    canvasBg: '#9ead86',
    canvasFg: '#1a1d14',
    canvasDim: '#8a9a74',
    canvasAccent: '#1a1d14',
    shell: '#1d2330',
    shellDark: '#11151e',
    shellLight: '#2a3344',
    key: '#23293a',
    keyText: '#e6e3d6',
    brand: '#e6e3d6',
    brandLabel: 'NOTKIA',
    modalBg: '#9ead86',
    modalFg: '#1a1d14',
    modalInputBg: '#b6c195',
    modalBorder: '#11151e',
  },
  MODERN: {
    pageBg:
      'radial-gradient(circle at 50% 0%, #1e3a8a 0%, #0b1220 65%, #050810 100%)',
    canvasBg: '#0f172a',
    canvasFg: '#10b981',
    canvasDim: '#1e293b',
    canvasAccent: '#f59e0b',
    shell: '#1f2937',
    shellDark: '#0b1220',
    shellLight: '#374151',
    key: '#111827',
    keyText: '#e5e7eb',
    brand: '#10b981',
    brandLabel: 'NEON',
    modalBg: '#1f2937',
    modalFg: '#e5e7eb',
    modalInputBg: '#0b1220',
    modalBorder: '#10b981',
  },
};
