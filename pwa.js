(() => {
  'use strict';
  let deferredPrompt = null;
  let registration = null;
  let reloading = false;

  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const installButtons = () => [...document.querySelectorAll('[data-pwa-install]')];
  const setInstallVisibility = () => installButtons().forEach(btn => btn.hidden = isStandalone() || !deferredPrompt);

  async function installApp(){
    if(isStandalone()) return;
    if(!deferredPrompt){
      window.dispatchEvent(new CustomEvent('julih-toast',{detail:'No Chrome, abra o menu ⋮ e escolha “Adicionar à tela inicial” ou “Instalar app”.'}));
      return;
    }
    const prompt = deferredPrompt;
    await prompt.prompt();
    await prompt.userChoice.catch(()=>null);
    deferredPrompt = null;
    setInstallVisibility();
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    setInstallVisibility();
  });
  window.addEventListener('appinstalled', () => { deferredPrompt = null; setInstallVisibility(); });
  document.addEventListener('click', e => {
    if(e.target.closest('[data-pwa-install]')) installApp();
    const update = e.target.closest('[data-pwa-update]');
    if(update && registration?.waiting) registration.waiting.postMessage({type:'SKIP_WAITING'});
    if(e.target.closest('[data-pwa-later]')) document.querySelector('#pwa-update-banner')?.classList.add('hidden');
  });

  async function register(){
    if(!('serviceWorker' in navigator) || !location.protocol.startsWith('http')) return;
    try{
      registration = await navigator.serviceWorker.register('./service-worker.js');
      const showUpdate = () => {
        if(registration?.waiting && navigator.serviceWorker.controller){
          document.querySelector('#pwa-update-banner')?.classList.remove('hidden');
        }
      };
      showUpdate();
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if(!worker) return;
        worker.addEventListener('statechange', () => {
          if(worker.state === 'installed') showUpdate();
        });
      });
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if(reloading) return;
        reloading = true;
        location.reload();
      });
      setTimeout(() => registration.update().catch(()=>{}), 1800);
      setInterval(() => registration.update().catch(()=>{}), 15*60*1000);
    }catch(err){ console.warn('PWA não registrado', err); }
  }
  window.addEventListener('load', () => { setInstallVisibility(); register(); });
  new MutationObserver(setInstallVisibility).observe(document.documentElement,{childList:true,subtree:true});
})();