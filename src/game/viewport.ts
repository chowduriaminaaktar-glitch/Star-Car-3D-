import { useEffect, useState } from 'react';

export type ScreenOrientationMode = 'landscape';

export interface ViewportInfo {
  width: number;
  height: number;
  orientation: ScreenOrientationMode;
  isCompactLandscape: boolean;
  isFullscreen: boolean;
  fullscreenSupported: boolean;
}

function readViewportDimensions(): { width: number; height: number } {
  const vv = window.visualViewport;
  const width = Math.max(1, Math.round(vv ? vv.width : window.innerWidth));
  const height = Math.max(1, Math.round(vv ? vv.height : window.innerHeight));
  return { width, height };
}

export function isFullscreenSupported(): boolean {
  const docEl = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
  };
  return Boolean(docEl.requestFullscreen || docEl.webkitRequestFullscreen);
}

export function isDocumentFullscreen(): boolean {
  const doc = document as Document & { webkitFullscreenElement?: Element | null };
  return Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);
}

export async function toggleAppFullscreen(preferLandscape = true): Promise<boolean> {
  const doc = document as Document & {
    webkitFullscreenElement?: Element | null;
    webkitExitFullscreen?: () => Promise<void> | void;
  };
  const docEl = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
  };

  try {
    if (isDocumentFullscreen()) {
      if (doc.exitFullscreen) {
        await doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      }
      return false;
    }

    if (docEl.requestFullscreen) {
      await docEl.requestFullscreen({ navigationUI: 'hide' } as FullscreenOptions);
    } else if (docEl.webkitRequestFullscreen) {
      await docEl.webkitRequestFullscreen();
    }

    if (preferLandscape) {
      await tryLockLandscape();
    }
    return true;
  } catch {
    return isDocumentFullscreen();
  }
}

export async function tryLockLandscape(): Promise<void> {
  try {
    const ori = screen.orientation as ScreenOrientation & {
      lock?: (orientation: 'landscape' | 'portrait' | 'any') => Promise<void>;
    };
    if (ori && typeof ori.lock === 'function') {
      await ori.lock('landscape');
    }
  } catch {
    // Gracefully ignore when browser/device or non-fullscreen context blocks orientation lock
  }
}

export function useViewportOrientation(): ViewportInfo {
  const [info, setInfo] = useState<ViewportInfo>(() => {
    const { width, height } = readViewportDimensions();
    return {
      width,
      height,
      orientation: 'landscape',
      isCompactLandscape: Math.min(width, height) < 520,
      isFullscreen: isDocumentFullscreen(),
      fullscreenSupported: isFullscreenSupported(),
    };
  });

  useEffect(() => {
    let timer1 = 0;
    let timer2 = 0;

    void tryLockLandscape();

    const sync = () => {
      const { width, height } = readViewportDimensions();
      const isCompactLandscape = Math.min(width, height) < 520;
      const isFullscreen = isDocumentFullscreen();

      setInfo((prev) => {
        if (
          prev.width === width &&
          prev.height === height &&
          prev.isCompactLandscape === isCompactLandscape &&
          prev.isFullscreen === isFullscreen
        ) {
          return prev;
        }
        return {
          width,
          height,
          orientation: 'landscape',
          isCompactLandscape,
          isFullscreen,
          fullscreenSupported: isFullscreenSupported(),
        };
      });
    };

    const handleOrientationEvent = () => {
      sync();
      clearTimeout(timer1);
      clearTimeout(timer2);
      timer1 = window.setTimeout(sync, 100);
      timer2 = window.setTimeout(sync, 280);
    };

    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', handleOrientationEvent);
    window.visualViewport?.addEventListener('resize', sync);
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    screen.orientation?.addEventListener?.('change', handleOrientationEvent);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', handleOrientationEvent);
      window.visualViewport?.removeEventListener('resize', sync);
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
      screen.orientation?.removeEventListener?.('change', handleOrientationEvent);
    };
  }, []);

  return info;
}
