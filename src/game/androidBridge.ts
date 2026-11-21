export interface StarCarAndroidBridge {
  setGameplayMode?: (isGameplay: boolean) => void;
  onGameReady?: () => void;
  exitApp?: () => void;
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
