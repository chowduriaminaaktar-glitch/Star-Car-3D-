export interface StarCarAndroidBridge {
  setGameplayMode?: (isGameplay: boolean) => void;
  onGameReady?: () => void;
  exitApp?: () => void;
  getCoins?: () => number;
  addCoins?: (amount: number) => number;
  spendCoins?: (amount: number) => number;
  setCoins?: (amount: number) => number;
}

declare global {
  interface Window {
    StarCarAndroid?: StarCarAndroidBridge;
  }
}

export function isAndroidWebView(): boolean {
  return typeof window !== 'undefined' && Boolean(window.StarCarAndroid);
}

export function notifyAndroidGameReady(): void {
  try {
    window.StarCarAndroid?.onGameReady?.();
  } catch {
    // Ignore outside Android WebView
  }
}

export function notifyAndroidGameplayMode(isGameplay: boolean): void {
  try {
    window.StarCarAndroid?.setGameplayMode?.(isGameplay);
  } catch {
    // Ignore outside Android WebView
  }
}

export function requestAndroidExit(): void {
  try {
    window.StarCarAndroid?.exitApp?.();
  } catch {
    // Ignore outside Android WebView
  }
}

export function getAndroidCoins(): number | null {
  try {
    const fn = window.StarCarAndroid?.getCoins;
    if (typeof fn !== 'function') return null;
    const value = fn.call(window.StarCarAndroid);
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  } catch {
    return null;
  }
}

export function addAndroidCoins(amount: number): number | null {
  try {
    const fn = window.StarCarAndroid?.addCoins;
    if (typeof fn !== 'function') return null;
    const value = fn.call(window.StarCarAndroid, Math.max(0, Math.floor(amount)));
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : null;
  } catch {
    return null;
  }
}

export function spendAndroidCoins(amount: number): number | null {
  try {
    const fn = window.StarCarAndroid?.spendCoins;
    if (typeof fn !== 'function') return null;
    const value = fn.call(window.StarCarAndroid, Math.max(0, Math.floor(amount)));
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    return value < 0 ? -1 : Math.floor(value);
  } catch {
    return null;
  }
}

export function setAndroidCoins(amount: number): number | null {
  try {
    const fn = window.StarCarAndroid?.setCoins;
    if (typeof fn !== 'function') return null;
    const value = fn.call(window.StarCarAndroid, Math.max(0, Math.floor(amount)));
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : null;
  } catch {
    return null;
  }
}
