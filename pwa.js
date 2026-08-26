(() => {
  'use strict';
  let installPrompt = null;
  let registration = null;
  let reloading = false;
  let updateCheckTimer = null;

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }
  function installButtons() { return [...document.querySelectorAll('[data-pwa-install]')]; }
  function updateInstallButtons() {
    const canInstall = Boolean(installPrompt) && !isStandalone();
    installButtons().forEach(button => {
      button.hidden = !canInstall;
      button.disabled = !canInstall;
      button.setAttribute('aria-hidden', canInstall ? 'false' : 'true');
      button.dataset.installState = canInstall ? 'ready' : 'unavailable';
    });
  }
  function dispatchUpdate(reg = registration) {
    if (!reg?.waiting) return false;
    window.dispatchEvent(new CustomEvent('julih-pwa-update', { detail: reg }));
    const banner = document.querySelector('#pwa-update-banner');
    if (banner && navigator.serviceWorker.controller) banner.classList.remove('hidden');
    return true;
  }
  async function checkForUpdate() {
    if (!registration) return false;
    try { await registration.update(); return dispatchUpdate(registration); }
    catch (error) { console.warn('Não foi possível verificar atualização do PWA.', error); return false; }
  }
  const api = {
    get canInstall() { return Boolean(installPrompt) && !isStandalone(); },
    get registration() { return registration; },
    get hasUpdate() { return Boolean(registration?.waiting); },
    isStandalone,
    async install() {
      if (isStandalone()) return { outcome: 'already-installed' };
      if (!installPrompt) return { outcome: 'unavailable' };
      const prompt = installPrompt;
      await prompt.prompt();
      const choice = await prompt.userChoice;
      installPrompt = null;
      updateInstallButtons();
      window.dispatchEvent(new CustomEvent('julih-pwa-statechange'));
      return choice;
    },
    checkForUpdate,
    async applyUpdate(reg = registration) {
      const target = reg || registration;
      if (!target?.waiting) return false;
      target.waiting.postMessage({ tipo: 'SKIP_WAITING' });
      return true;
    }
  };
  window.JULIH_PWA = api;

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    updateInstallButtons();
    window.dispatchEvent(new CustomEvent('julih-pwa-statechange'));
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    updateInstallButtons();
    window.dispatchEvent(new CustomEvent('julih-pwa-installed'));
    window.dispatchEvent(new CustomEvent('julih-pwa-statechange'));
  });
  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-pwa-install]');
    if (button) {
      event.preventDefault();
      if (!api.canInstall) return;
      try { await api.install(); } catch (error) { console.warn('Não foi possível abrir o instalador nativo.', error); }
      return;
    }
    if (event.target.closest('[data-pwa-update]')) { await api.applyUpdate(); return; }
    if (event.target.closest('[data-pwa-later]')) document.querySelector('#pwa-update-banner')?.classList.add('hidden');
  });
  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    try {
      registration = await navigator.serviceWorker.register('./service-worker.js');
      dispatchUpdate(registration);
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) dispatchUpdate(registration);
        });
      });
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloading) return; reloading = true; location.reload();
      });
      setTimeout(checkForUpdate, 1800);
      clearInterval(updateCheckTimer);
      updateCheckTimer = setInterval(checkForUpdate, 15 * 60 * 1000);
    } catch (error) { console.warn('Service Worker não registrado.', error); }
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkForUpdate(); });
  new MutationObserver(updateInstallButtons).observe(document.documentElement, { childList: true, subtree: true });
  updateInstallButtons();
  window.addEventListener('load', registerServiceWorker);
})();
