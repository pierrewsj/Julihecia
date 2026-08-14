(() => {
  'use strict';

  const APP_VERSION = '2.0.0';
  const STORAGE_KEY = 'julih_cia_state_v1';
  const CONFIG_KEY = 'julih_cia_config_v1';

  const BRL = new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'});
  const fmtDate = (iso) => {
    if(!iso) return '—';
    const d = new Date(`${iso}T12:00:00`);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('pt-BR');
  };
  const todayISO = () => new Date().toISOString().slice(0,10);
  const uid = (prefix='ID') => `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
  const money = (v) => BRL.format(Number(v || 0));
  const esc = (s='') => String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  const seedProducts = [
    {id:'P1',name:'Bolo de Chocolate',category:'Bolos',price:90,emoji:'🎂',active:true,description:'Bolo artesanal com opções de recheio.',imageUrl:''},
    {id:'P2',name:'Bolo Personalizado',category:'Bolos',price:150,emoji:'🎂',active:true,description:'Personalize tema, tamanho e acabamento.',imageUrl:''},
    {id:'P3',name:'Brigadeiro Gourmet',category:'Doces',price:3.5,emoji:'🍫',active:true,description:'Unidade. Consulte sabores disponíveis.',imageUrl:''},
    {id:'P4',name:'Cupcake Decorado',category:'Doces',price:8,emoji:'🧁',active:true,description:'Cupcake artesanal decorado.',imageUrl:''},
    {id:'P5',name:'Kit Festa P',category:'Kits',price:120,emoji:'🎁',active:true,description:'Kit compacto para comemorações.',imageUrl:''},
    {id:'P6',name:'Caixinha Presente',category:'Kits',price:45,emoji:'🎀',active:true,description:'Seleção de doces em embalagem presenteável.',imageUrl:''},
    {id:'P7',name:'Fatia Especial',category:'Pronta entrega',price:14,emoji:'🍰',active:true,description:'Sabores do dia, enquanto durar o estoque.',imageUrl:''},
    {id:'P8',name:'Pedido Personalizado',category:'Personalizados',price:0,emoji:'✨',active:true,description:'Envie os detalhes para receber orçamento.',imageUrl:''}
  ];
  const seedStock = [
    {id:'S1',name:'Leite condensado',unit:'un',qty:18,min:10,cost:6.99},
    {id:'S2',name:'Creme de leite',unit:'un',qty:14,min:8,cost:3.69},
    {id:'S3',name:'Chocolate',unit:'kg',qty:3.2,min:2,cost:38.9},
    {id:'S4',name:'Farinha de trigo',unit:'kg',qty:5,min:3,cost:5.8},
    {id:'S5',name:'Açúcar',unit:'kg',qty:2.2,min:3,cost:4.5},
    {id:'S6',name:'Caixa para bolo',unit:'un',qty:9,min:10,cost:4.2}
  ];
  const seedOrders = [];
  const defaultState = () => ({
    products: seedProducts,
    stock: seedStock,
    orders: seedOrders,
    expenses: [],
    customers: [],
    cart: [],
    clientOrders: []
  });
  const defaultConfig = () => ({
    scriptUrl:'',
    whatsapp:'',
    adminPin:'2026',
    storeName:'Julih & Cia',
    deliveryFee:0,
    lastSync:null
  });

  const loadJSON = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) || fallback(); } catch { return fallback(); }
  };
  let state = loadJSON(STORAGE_KEY, defaultState);
  let config = loadJSON(CONFIG_KEY, defaultConfig);
  let view = {area:'landing', clientTab:'home', adminTab:'dashboard', category:'Todos', adminUnlocked:false};
  let productImageDraft = {url:'', dataUrl:'', removed:false};

  const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  const saveConfig = () => localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  const app = document.getElementById('app');

  function productVisual(p, compact=false){
    const url = String(p?.imageUrl || '').trim();
    if(url) return `<div class="product-visual has-image ${compact?'compact':''}"><img src="${esc(url)}" alt="${esc(p?.name||'Produto Julih & Cia')}" loading="lazy" onerror="this.parentElement.classList.remove('has-image');this.remove();this.parentElement.innerHTML='<span class=\'fallback-emoji\'>${esc(p?.emoji||'🍰')}</span>'"></div>`;
    return `<div class="product-visual ${compact?'compact':''}"><span class="fallback-emoji">${esc(p?.emoji||'🍰')}</span></div>`;
  }

  function resizeImageFile(file, maxSide=1200, quality=.84){
    return new Promise((resolve,reject)=>{
      if(!file || !file.type.startsWith('image/')) return reject(new Error('Selecione um arquivo de imagem.'));
      const reader = new FileReader();
      reader.onerror=()=>reject(new Error('Não foi possível ler a imagem.'));
      reader.onload=()=>{
        const image = new Image();
        image.onerror=()=>reject(new Error('Formato de imagem não suportado.'));
        image.onload=()=>{
          const scale=Math.min(1,maxSide/Math.max(image.width,image.height));
          const canvas=document.createElement('canvas');
          canvas.width=Math.max(1,Math.round(image.width*scale));
          canvas.height=Math.max(1,Math.round(image.height*scale));
          const ctx=canvas.getContext('2d');
          ctx.drawImage(image,0,0,canvas.width,canvas.height);
          resolve(canvas.toDataURL('image/jpeg',quality));
        };
        image.src=reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function updateProductImagePreview(){
    const box=document.getElementById('productImagePreview');
    if(!box) return;
    const src=productImageDraft.removed?'':(productImageDraft.dataUrl||productImageDraft.url||'');
    box.innerHTML=src?`<img src="${esc(src)}" alt="Prévia do produto">`:`<div class="image-placeholder"><span>📷</span><b>Foto do produto</b><small>Adicione uma foto real para aparecer no catálogo.</small></div>`;
    const remove=document.querySelector('[data-action="remove-product-image"]');
    if(remove) remove.hidden=!src;
  }

  async function uploadProductImage(dataUrl, productId, productName){
    if(!config.scriptUrl) return {imageUrl:dataUrl, local:true};
    const result=await api({action:'uploadProductImage',data:{dataUrl,productId,productName}});
    return result;
  }

  function toast(message, type=''){
    const host = document.getElementById('toastHost');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    host.appendChild(el);
    setTimeout(()=>el.remove(), 3200);
  }

  function statusLabel(status){
    return ({recebido:'Recebido',confirmado:'Confirmado',producao:'Em produção',pronto:'Pronto',entregue:'Entregue',cancelado:'Cancelado'})[status] || status;
  }
  function statusClass(status){ return `status st-${status}`; }

  function appbar(title, subtitle, onBack){
    return `<header class="appbar"><div class="appbar-inner">
      <div class="brand-mini"><img src="assets/icon-192.png" alt="Julih & Cia"><div><strong>${esc(title)}</strong><small>${esc(subtitle||'Confeitaria')}</small></div></div>
      ${onBack ? `<button class="icon-btn" data-action="${onBack}" aria-label="Voltar">←</button>` : `<button class="icon-btn" data-action="go-landing" aria-label="Início">⌂</button>`}
    </div></header>`;
  }

  function render(){
    if(view.area === 'landing') return renderLanding();
    if(view.area === 'client') return renderClient();
    if(view.area === 'admin-login') return renderAdminLogin();
    if(view.area === 'admin') return renderAdmin();
  }

  function renderLanding(){
    app.innerHTML = `<main class="shell landing-shell">
      <section class="landing-hero">
        <div class="brand-stage">
          <img src="assets/logo-banner.png" alt="Julih & Cia — Feito com amor em cada detalhe">
          <div class="brand-glow glow-a"></div><div class="brand-glow glow-b"></div>
        </div>
        <div class="welcome-panel glass-panel">
          <div class="welcome-copy">
            <span class="eyebrow">Bem-vindo(a) à Julih & Cia ♡</span>
            <h1>Um aplicativo para o cliente e para a confeitaria.</h1>
            <p>Faça encomendas, acompanhe pedidos e centralize estoque, despesas, produção e financeiro em um único lugar.</p>
          </div>
          <div class="entry-stack">
            <button class="entry-card futuristic-card" data-action="open-client">
              <span class="entry-orb">🛍️</span><span class="entry-copy"><b>Quero fazer um pedido</b><small>Catálogo, carrinho, encomendas e acompanhamento.</small></span><span class="entry-arrow">›</span>
            </button>
            <button class="entry-card futuristic-card admin-entry" data-action="open-admin-login">
              <span class="entry-orb">👩‍🍳</span><span class="entry-copy"><b>Área da Confeitaria</b><small>Pedidos, produção, estoque, financeiro e relatórios.</small></span><span class="entry-arrow">›</span>
            </button>
          </div>
          <div class="landing-feature"><span>✦</span><div><b>Catálogo com fotos reais</b><small>Cadastre ou edite produtos e adicione fotos pela galeria ou câmera.</small></div><button class="btn btn-soft btn-sm" data-action="open-admin-login">Acessar</button></div>
          <div class="tiny-note futuristic-note">☁️ <b>Modo local ativo.</b> A conexão com Google Sheets e Google Drive pode ser ativada em Configurações na área administrativa.</div>
        </div>
      </section>
      <p class="footer-note">Julih & Cia • versão ${APP_VERSION}</p>
    </main>`;
  }

  function renderClient(){
    const content = view.clientTab === 'home' ? clientHome() : view.clientTab === 'orders' ? clientOrders() : clientProfile();
    app.innerHTML = `${appbar('Julih & Cia','Área do cliente','go-landing')}${content}${clientNav()}${state.cart.length ? `<button class="cart-fab" data-action="open-cart">🛒 Carrinho <span class="cart-count">${state.cart.reduce((a,b)=>a+b.qty,0)}</span></button>`:''}`;
  }

  function clientHome(){
    const categories = ['Todos','Bolos','Doces','Kits','Pronta entrega','Personalizados'];
    const products = state.products.filter(p => p.active !== false && (view.category==='Todos' || p.category===view.category));
    return `<main class="shell">
      <div class="page-title"><div><span class="eyebrow">Feito com amor</span><h1>O que vamos preparar para você? ❤️</h1><p>Escolha seus produtos e monte o pedido.</p></div><button class="btn btn-soft" data-action="client-sync">↻ Atualizar</button></div>
      <div class="category-grid">${categories.map(c=>`<button class="category ${view.category===c?'active':''}" data-category="${esc(c)}"><span class="emoji">${({Todos:'🍰',Bolos:'🎂',Doces:'🧁',Kits:'🎁','Pronta entrega':'🛍️',Personalizados:'✨'})[c]}</span><b>${esc(c)}</b></button>`).join('')}</div>
      <div class="section-gap product-grid">${products.map(productCard).join('')}</div>
    </main>`;
  }
  function productCard(p){
    const price = Number(p.price||0) > 0 ? `A partir de ${money(p.price)}` : 'Solicite orçamento';
    return `<article class="product-card">${productVisual(p)}<div class="product-content"><span class="badge">${esc(p.category)}</span><h3>${esc(p.name)}</h3><p class="muted">${esc(p.description||'')}</p><span class="price">${price}</span><div class="product-actions"><button class="btn btn-primary btn-sm" data-add-product="${esc(p.id)}">${Number(p.price||0)>0?'Adicionar':'Solicitar'}</button></div></div></article>`;
  }
  function clientOrders(){
    const orders = state.clientOrders.map(id => state.orders.find(o=>o.id===id)).filter(Boolean).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
    return `<main class="shell"><div class="page-title"><div><h1>Meus pedidos</h1><p>Acompanhe as encomendas feitas neste aparelho.</p></div></div><div class="list">${orders.length?orders.map(orderRow).join(''):`<div class="card empty"><div class="emoji">📋</div><h3>Nenhum pedido ainda</h3><p>Seus pedidos aparecerão aqui após finalizar uma compra.</p><button class="btn btn-primary" data-client-tab="home">Ver catálogo</button></div>`}</div></main>`;
  }
  function clientProfile(){
    return `<main class="shell"><div class="page-title"><div><h1>Atendimento</h1><p>Entre em contato com a Julih & Cia.</p></div></div><div class="grid grid-2"><div class="card"><h3>💬 WhatsApp</h3><p class="muted">Fale conosco para dúvidas, personalizações e alterações no pedido.</p><button class="btn btn-primary" data-action="open-whatsapp">Abrir WhatsApp</button></div><div class="card"><h3>📱 Instalar aplicativo</h3><p class="muted">No Android/Chrome, use a opção “Instalar app” ou “Adicionar à tela inicial”.</p></div></div></main>`;
  }
  function clientNav(){
    return `<nav class="bottom-nav"><button data-client-tab="home" class="${view.clientTab==='home'?'active':''}"><span>⌂</span>Início</button><button data-client-tab="orders" class="${view.clientTab==='orders'?'active':''}"><span>📋</span>Pedidos</button><button data-action="open-cart"><span>🛒</span>Carrinho</button><button data-client-tab="profile" class="${view.clientTab==='profile'?'active':''}"><span>💬</span>Contato</button></nav>`;
  }

  function orderRow(o){
    const first = o.items?.[0]?.name || 'Pedido';
    return `<div class="list-row"><div class="row-main"><div class="avatar">🎂</div><div><strong>${esc(o.customerName||'Cliente')} · ${esc(first)}</strong><small>${fmtDate(o.deliveryDate)} ${esc(o.deliveryTime||'')} · ${esc(o.deliveryMode||'Retirada')}</small></div></div><div class="row-right"><strong>${money(o.total)}</strong><span class="${statusClass(o.status)}">${statusLabel(o.status)}</span></div></div>`;
  }

  function renderAdminLogin(){
    app.innerHTML = `${appbar('Julih & Cia','Acesso administrativo','go-landing')}<main class="shell"><div class="grid grid-2" style="align-items:center;max-width:900px;margin:28px auto"><div class="card"><img src="assets/brandmark.png" alt="Julih & Cia" style="width:100%;border-radius:18px"><p class="muted">Gestão de pedidos, produção, estoque, despesas e resultados.</p></div><form class="card" id="adminLoginForm"><span class="eyebrow">Área da Confeitaria</span><h2 style="color:var(--cocoa)">Entrar</h2><p class="muted">Informe o PIN administrativo.</p><div class="field"><label>PIN</label><input class="input" type="password" inputmode="numeric" name="pin" required maxlength="12" placeholder="••••"></div><button class="btn btn-cocoa btn-block" style="margin-top:14px">Entrar</button><p class="settings-note">PIN inicial desta versão: <b>2026</b>. Altere em Configurações após entrar.</p></form></div></main>`;
  }

  function renderAdmin(){
    if(!view.adminUnlocked){ view.area='admin-login'; return render(); }
    const body = ({dashboard:adminDashboard,orders:adminOrders,production:adminProduction,stock:adminStock,expenses:adminExpenses,finance:adminFinance,products:adminProducts,settings:adminSettings})[view.adminTab]?.() || adminDashboard();
    const navItems = [
      ['dashboard','🏠','Início'],['orders','📋','Pedidos'],['production','📅','Produção'],['products','🍰','Produtos'],['stock','📦','Estoque'],['expenses','💸','Despesas'],['finance','💰','Financeiro'],['settings','⚙️','Configurações']
    ];
    app.innerHTML = `${appbar('Julih & Cia','Área da confeitaria','logout-admin')}<main class="shell"><div class="mobile-admin-nav">${navItems.map(i=>`<button class="${view.adminTab===i[0]?'active':''}" data-admin-tab="${i[0]}">${i[1]} ${i[2]}</button>`).join('')}</div><div class="admin-layout"><aside class="side-nav">${navItems.map(i=>`<button class="${view.adminTab===i[0]?'active':''}" data-admin-tab="${i[0]}"><span>${i[1]}</span>${i[2]}</button>`).join('')}<hr><button data-action="logout-admin">↩ Sair</button></aside><section>${connectionBanner()}${body}</section></div></main>`;
  }

  function connectionBanner(){
    const on = !!config.scriptUrl;
    return `<div class="banner"><div><span class="sync-dot ${on?'on':''}"></span><strong>${on?'Google Sheets configurado':'Modo local'}</strong> <span class="muted">${on?(config.lastSync?'• última sincronização '+new Date(config.lastSync).toLocaleString('pt-BR'):'• pronto para sincronizar'):'• os dados estão salvos neste navegador'}</span></div>${on?`<button class="btn btn-soft btn-sm" data-action="admin-sync">Sincronizar</button>`:`<button class="btn btn-soft btn-sm" data-admin-tab="settings">Conectar</button>`}</div>`;
  }

  function adminDashboard(){
    const liveOrders = state.orders.filter(o=>o.status!=='cancelado');
    const revenue = liveOrders.reduce((s,o)=>s+Number(o.total||0),0);
    const expenses = state.expenses.reduce((s,e)=>s+Number(e.amount||0),0);
    const result = revenue-expenses;
    const pending = state.orders.filter(o=>['recebido','confirmado','producao'].includes(o.status)).length;
    const today = todayISO();
    const todayOrders = state.orders.filter(o=>o.deliveryDate===today).sort((a,b)=>String(a.deliveryTime).localeCompare(String(b.deliveryTime)));
    const low = state.stock.filter(s=>Number(s.qty)<=Number(s.min));
    return `<div class="page-title"><div><span class="eyebrow">Resumo do negócio</span><h1>Olá, Julih! 👋</h1><p>Veja o que precisa da sua atenção agora.</p></div><button class="btn btn-primary" data-action="new-manual-order">+ Novo pedido</button></div>
      <div class="kpi-row"><div class="card metric"><span class="label">Vendas</span><div class="value">${money(revenue)}</div></div><div class="card metric"><span class="label">Despesas</span><div class="value">${money(expenses)}</div></div><div class="card metric good"><span class="label">Resultado estimado</span><div class="value">${money(result)}</div></div><div class="card metric warn"><span class="label">Pedidos pendentes</span><div class="value">${pending}</div></div></div>
      <div class="section-gap quick-actions"><button data-action="new-manual-order"><span>➕</span>Novo pedido</button><button data-admin-tab="production"><span>📅</span>Produção</button><button data-admin-tab="stock"><span>📦</span>${low.length} estoque baixo</button><button data-action="new-expense"><span>💸</span>Lançar despesa</button></div>
      <div class="section-gap grid grid-2"><div class="card"><div class="page-title" style="margin:0 0 12px"><div><h3>Pedidos de hoje</h3><p>${fmtDate(today)}</p></div><button class="btn btn-soft btn-sm" data-admin-tab="orders">Ver todos</button></div><div class="list">${todayOrders.length?todayOrders.map(adminOrderCompact).join(''):'<div class="empty"><div class="emoji">🍰</div><h3>Nenhuma entrega hoje</h3><p>A agenda do dia está livre.</p></div>'}</div></div><div class="card"><h3>Estoque em atenção</h3><p class="muted">Itens no mínimo ou abaixo do mínimo.</p><div class="list">${low.length?low.slice(0,6).map(s=>`<div class="list-row"><div class="row-main"><div class="avatar">📦</div><div><strong>${esc(s.name)}</strong><small>Mínimo: ${s.min} ${esc(s.unit)}</small></div></div><div class="row-right"><strong class="stock-low">${s.qty} ${esc(s.unit)}</strong></div></div>`).join(''):'<div class="empty"><div class="emoji">✅</div><h3>Estoque saudável</h3><p>Nenhum item abaixo do mínimo.</p></div>'}</div></div></div>`;
  }
  function adminOrderCompact(o){
    const first = o.items?.[0]?.name || 'Pedido';
    return `<button class="list-row" style="width:100%;text-align:left" data-order-detail="${esc(o.id)}"><div class="row-main"><div class="avatar">${esc(o.items?.[0]?.emoji||'🎂')}</div><div><strong>${esc(o.deliveryTime||'--:--')} · ${esc(o.customerName)}</strong><small>${esc(first)}</small></div></div><div class="row-right"><strong>${money(o.total)}</strong><span class="${statusClass(o.status)}">${statusLabel(o.status)}</span></div></button>`;
  }

  function adminOrders(){
    const orders = [...state.orders].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
    return `<div class="page-title"><div><h1>Pedidos</h1><p>${orders.length} pedido(s) registrado(s).</p></div><button class="btn btn-primary" data-action="new-manual-order">+ Novo pedido</button></div><div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Pedido</th><th>Cliente</th><th>Entrega</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>${orders.length?orders.map(o=>`<tr><td><strong>${esc(o.id)}</strong><br><small class="muted">${esc(o.items?.[0]?.name||'Pedido')}</small></td><td>${esc(o.customerName)}<br><small class="muted">${esc(o.phone||'')}</small></td><td>${fmtDate(o.deliveryDate)}<br><small class="muted">${esc(o.deliveryTime||'')}</small></td><td>${money(o.total)}</td><td><span class="${statusClass(o.status)}">${statusLabel(o.status)}</span></td><td><button class="btn btn-soft btn-sm" data-order-detail="${esc(o.id)}">Abrir</button></td></tr>`).join(''):'<tr><td colspan="6" class="empty">Nenhum pedido registrado.</td></tr>'}</tbody></table></div></div>`;
  }

  function adminProduction(){
    const production = state.orders.filter(o=>['confirmado','producao','pronto'].includes(o.status)).sort((a,b)=>(a.deliveryDate+a.deliveryTime).localeCompare(b.deliveryDate+b.deliveryTime));
    return `<div class="page-title"><div><h1>Agenda de produção</h1><p>Pedidos confirmados, em produção ou prontos.</p></div></div><div class="list">${production.length?production.map(o=>`<div class="list-row"><div class="row-main"><div class="avatar">${esc(o.items?.[0]?.emoji||'🎂')}</div><div><strong>${fmtDate(o.deliveryDate)} • ${esc(o.deliveryTime||'')}</strong><small>${esc(o.customerName)} · ${esc(o.items?.map(i=>`${i.qty}x ${i.name}`).join(', ')||'Pedido')}</small></div></div><div class="row-right"><span class="${statusClass(o.status)}">${statusLabel(o.status)}</span><button class="btn btn-soft btn-sm" style="margin-top:5px" data-order-detail="${esc(o.id)}">Atualizar</button></div></div>`).join(''):'<div class="card empty"><div class="emoji">📅</div><h3>Nada na produção</h3><p>Quando pedidos forem confirmados, aparecerão aqui.</p></div>'}</div>`;
  }

  function adminStock(){
    return `<div class="page-title"><div><h1>Estoque</h1><p>Ingredientes, embalagens e materiais.</p></div><button class="btn btn-primary" data-action="new-stock-item">+ Novo item</button></div><div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Item</th><th>Saldo</th><th>Mínimo</th><th>Custo</th><th>Situação</th><th></th></tr></thead><tbody>${state.stock.map(s=>`<tr><td><strong>${esc(s.name)}</strong><br><small class="muted">${esc(s.unit)}</small></td><td>${s.qty} ${esc(s.unit)}</td><td>${s.min} ${esc(s.unit)}</td><td>${money(s.cost)}</td><td>${Number(s.qty)<=Number(s.min)?'<span class="stock-low">⚠ Baixo</span>':'<span class="stock-ok">✓ OK</span>'}</td><td><button class="btn btn-soft btn-sm" data-stock-adjust="${esc(s.id)}">Ajustar</button></td></tr>`).join('')}</tbody></table></div></div>`;
  }

  function adminExpenses(){
    const expenses = [...state.expenses].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    return `<div class="page-title"><div><h1>Despesas</h1><p>Registre compras e gastos da confeitaria.</p></div><button class="btn btn-primary" data-action="new-expense">+ Nova despesa</button></div><div class="grid grid-3"><div class="card metric"><span class="label">Total lançado</span><div class="value">${money(expenses.reduce((s,e)=>s+Number(e.amount||0),0))}</div></div><div class="card metric"><span class="label">Lançamentos</span><div class="value">${expenses.length}</div></div><div class="card metric"><span class="label">Maior gasto</span><div class="value">${money(Math.max(0,...expenses.map(e=>Number(e.amount||0))))}</div></div></div><div class="section-gap card"><div class="table-wrap"><table class="table"><thead><tr><th>Data</th><th>Categoria</th><th>Descrição</th><th>Valor</th></tr></thead><tbody>${expenses.length?expenses.map(e=>`<tr><td>${fmtDate(e.date)}</td><td>${esc(e.category)}</td><td>${esc(e.description)}</td><td class="money-neg">-${money(e.amount)}</td></tr>`).join(''):'<tr><td colspan="4" class="empty">Nenhuma despesa lançada.</td></tr>'}</tbody></table></div></div>`;
  }

  function adminFinance(){
    const orders = state.orders.filter(o=>o.status!=='cancelado');
    const revenue = orders.reduce((s,o)=>s+Number(o.total||0),0);
    const expenses = state.expenses.reduce((s,e)=>s+Number(e.amount||0),0);
    const result = revenue-expenses;
    const paid = orders.reduce((s,o)=>s+Number(o.paid||0),0);
    const receivable = Math.max(0,revenue-paid);
    const max = Math.max(revenue,expenses,1);
    return `<div class="page-title"><div><h1>Financeiro</h1><p>Visão simples de entradas, saídas e valores a receber.</p></div></div><div class="grid grid-4"><div class="card metric"><span class="label">Vendas</span><div class="value money-pos">${money(revenue)}</div></div><div class="card metric"><span class="label">Recebido</span><div class="value">${money(paid)}</div></div><div class="card metric warn"><span class="label">A receber</span><div class="value">${money(receivable)}</div></div><div class="card metric good"><span class="label">Resultado</span><div class="value">${money(result)}</div></div></div><div class="section-gap grid grid-2"><div class="card"><h3>Vendas x despesas</h3><p class="muted">Comparação dos lançamentos atuais.</p><p><b>Vendas</b> <span style="float:right">${money(revenue)}</span></p><div class="progress"><span style="width:${(revenue/max)*100}%"></span></div><p><b>Despesas</b> <span style="float:right">${money(expenses)}</span></p><div class="progress"><span style="width:${(expenses/max)*100}%"></span></div></div><div class="card"><h3>Indicadores</h3><p class="muted">Baseados nos pedidos registrados.</p><div class="list"><div class="list-row"><span>Ticket médio</span><strong>${money(orders.length?revenue/orders.length:0)}</strong></div><div class="list-row"><span>Pedidos válidos</span><strong>${orders.length}</strong></div><div class="list-row"><span>Margem após despesas</span><strong>${revenue?((result/revenue)*100).toFixed(1):0}%</strong></div></div></div></div>`;
  }

  function adminProducts(){
    return `<div class="page-title"><div><span class="eyebrow">Catálogo visual</span><h1>Produtos</h1><p>Cadastre preços, descrições e fotos reais dos seus produtos.</p></div><button class="btn btn-primary" data-action="new-product">+ Novo produto</button></div><div class="product-grid admin-product-grid">${state.products.map(p=>`<article class="product-card">${productVisual(p)}<div class="product-content"><div class="product-topline"><span class="badge">${esc(p.category)}</span><span class="status ${p.active!==false?'st-pronto':'st-cancelado'}">${p.active!==false?'Ativo':'Inativo'}</span></div><h3>${esc(p.name)}</h3><p class="muted">${esc(p.description||'')}</p><span class="price">${Number(p.price)>0?money(p.price):'Orçamento'}</span><div class="product-actions"><button class="btn btn-soft btn-sm" data-product-edit="${esc(p.id)}">✎ Editar produto</button></div></div></article>`).join('')}</div>`;
  }

  function adminSettings(){
    return `<div class="page-title"><div><h1>Configurações</h1><p>Conecte o aplicativo à sua planilha Google.</p></div></div><form class="card" id="settingsForm"><div class="form-grid"><div class="field full"><label>URL do Google Apps Script</label><input class="input" name="scriptUrl" value="${esc(config.scriptUrl)}" placeholder="https://script.google.com/macros/s/.../exec"><small class="settings-note">Deixe vazio para continuar usando somente o armazenamento local.</small></div><div class="field"><label>WhatsApp da confeitaria</label><input class="input" name="whatsapp" value="${esc(config.whatsapp)}" placeholder="5531999999999"><small class="settings-note">Use DDI + DDD + número, somente dígitos.</small></div><div class="field"><label>PIN administrativo</label><input class="input" name="adminPin" value="${esc(config.adminPin)}" inputmode="numeric"></div><div class="field"><label>Taxa padrão de entrega</label><input class="input" name="deliveryFee" type="number" step="0.01" min="0" value="${Number(config.deliveryFee||0)}"></div></div><div class="form-actions"><button type="button" class="btn btn-soft" data-action="test-connection">Testar conexão</button><button class="btn btn-primary">Salvar</button></div></form><div class="section-gap card"><h3>Como conectar</h3><ol class="settings-note"><li>Crie uma planilha Google vazia.</li><li>Abra <b>Extensões → Apps Script</b>.</li><li>Cole o arquivo <b>google-apps-script.gs</b> que acompanha este aplicativo.</li><li>Execute uma vez a função <b>setupJulihCia()</b>.</li><li>Implante como <b>Aplicativo da Web</b>, execute como você e permita acesso a qualquer pessoa com o link.</li><li>Cole a URL terminada em <b>/exec</b> no campo acima.</li></ol><p class="settings-note">Para uma operação maior ou com dados sensíveis, recomendamos migrar futuramente para um backend com autenticação própria. Esta integração foi pensada para uma pequena confeitaria.</p></div>`;
  }

  function openModal(title, body, id='genericModal'){
    const wrap = document.createElement('div');
    wrap.className='modal-backdrop';wrap.id=id;
    wrap.innerHTML=`<div class="modal"><div class="modal-head"><h2>${title}</h2><button class="icon-btn" data-action="close-modal">✕</button></div><div class="modal-body">${body}</div></div>`;
    document.body.appendChild(wrap);
  }
  function closeModal(){ document.querySelector('.modal-backdrop')?.remove(); }

  function openProduct(p){
    const isQuote = Number(p.price||0)<=0;
    openModal(isQuote?'Solicitar orçamento':esc(p.name),`<form id="addProductForm"><input type="hidden" name="productId" value="${esc(p.id)}"><div class="form-grid"><div class="field"><label>Quantidade</label><input class="input" type="number" name="qty" min="1" value="1" required></div>${isQuote?`<div class="field"><label>Quantidade de pessoas</label><input class="input" name="people" placeholder="Ex.: 30"></div><div class="field full"><label>Tema / ocasião</label><input class="input" name="theme" placeholder="Ex.: aniversário infantil"></div>`:''}<div class="field full"><label>Observações</label><textarea class="textarea" name="notes" placeholder="Sabor, recheio, decoração, cores ou outros detalhes."></textarea></div></div><div class="form-actions"><button type="button" class="btn btn-soft" data-action="close-modal">Cancelar</button><button class="btn btn-primary">${isQuote?'Adicionar solicitação':'Adicionar ao carrinho'}</button></div></form>`);
  }

  function openCart(){
    const subtotal = state.cart.reduce((s,i)=>s+Number(i.price||0)*Number(i.qty||0),0);
    openModal('Seu pedido',`<div class="list">${state.cart.length?state.cart.map((i,idx)=>`<div class="list-row"><div class="row-main"><div class="avatar">${esc(i.emoji||'🍰')}</div><div><strong>${i.qty}x ${esc(i.name)}</strong><small>${esc(i.notes||'')}</small></div></div><div class="row-right"><strong>${Number(i.price)>0?money(i.price*i.qty):'Orçamento'}</strong><button class="btn btn-danger btn-sm" data-cart-remove="${idx}">Remover</button></div></div>`).join(''):'<div class="empty"><div class="emoji">🛒</div><h3>Carrinho vazio</h3><p>Adicione produtos do catálogo.</p></div>'}</div>${state.cart.length?`<div class="card" style="margin-top:12px"><div class="list-row"><strong>Subtotal</strong><strong>${money(subtotal)}</strong></div><button class="btn btn-primary btn-block" style="margin-top:12px" data-action="checkout">Continuar</button></div>`:''}`,'cartModal');
  }

  function openCheckout(prefill={}){
    if(!state.cart.length) return toast('Seu carrinho está vazio.','error');
    const hasQuote = state.cart.some(i=>Number(i.price||0)<=0);
    openModal(hasQuote?'Finalizar solicitação':'Finalizar pedido',`<form id="checkoutForm"><div class="form-grid"><div class="field"><label>Nome</label><input class="input" name="customerName" required value="${esc(prefill.customerName||'')}"></div><div class="field"><label>WhatsApp</label><input class="input" name="phone" inputmode="tel" required value="${esc(prefill.phone||'')}"></div><div class="field"><label>Data desejada</label><input class="input" type="date" name="deliveryDate" min="${todayISO()}" required value="${esc(prefill.deliveryDate||'')}"></div><div class="field"><label>Horário</label><input class="input" type="time" name="deliveryTime" required value="${esc(prefill.deliveryTime||'')}"></div><div class="field"><label>Recebimento</label><select class="select" name="deliveryMode"><option>Retirada</option><option>Entrega</option></select></div><div class="field"><label>Forma de pagamento</label><select class="select" name="paymentMethod"><option>Pix</option><option>Dinheiro</option><option>Débito</option><option>Crédito</option><option>A combinar</option></select></div><div class="field full"><label>Endereço (se for entrega)</label><input class="input" name="address" placeholder="Rua, número, bairro, cidade"></div><div class="field full"><label>Observações gerais</label><textarea class="textarea" name="notes" placeholder="Informações importantes para a confeitaria."></textarea></div></div>${hasQuote?'<div class="tiny-note">✨ Como há item personalizado, o valor final será confirmado pela confeitaria antes da produção.</div>':''}<div class="form-actions"><button type="button" class="btn btn-soft" data-action="close-modal">Voltar</button><button class="btn btn-primary">Enviar pedido</button></div></form>`,'checkoutModal');
  }

  function openOrderDetail(id){
    const o=state.orders.find(x=>x.id===id); if(!o) return;
    openModal(`Pedido ${esc(o.id)}`,`<div class="grid grid-2"><div class="card"><h3>${esc(o.customerName)}</h3><p class="muted">${esc(o.phone||'')}</p><p><b>Entrega:</b> ${fmtDate(o.deliveryDate)} ${esc(o.deliveryTime||'')}</p><p><b>Modalidade:</b> ${esc(o.deliveryMode||'')}</p><p><b>Endereço:</b> ${esc(o.address||'—')}</p></div><div class="card"><h3>${money(o.total)}</h3><p><b>Recebido:</b> ${money(o.paid||0)}</p><p><b>Pagamento:</b> ${esc(o.paymentMethod||'')}</p><p><span class="${statusClass(o.status)}">${statusLabel(o.status)}</span></p></div></div><div class="section-gap card"><h3>Itens</h3><div class="list">${o.items.map(i=>`<div class="list-row"><div><strong>${i.qty}x ${esc(i.name)}</strong><small>${esc(i.notes||'')}</small></div><strong>${Number(i.price)>0?money(i.price*i.qty):'Orçamento'}</strong></div>`).join('')}</div></div><form id="orderUpdateForm" class="section-gap card"><input type="hidden" name="id" value="${esc(o.id)}"><div class="form-grid"><div class="field"><label>Status</label><select class="select" name="status">${['recebido','confirmado','producao','pronto','entregue','cancelado'].map(s=>`<option value="${s}" ${o.status===s?'selected':''}>${statusLabel(s)}</option>`).join('')}</select></div><div class="field"><label>Valor recebido</label><input class="input" name="paid" type="number" min="0" step="0.01" value="${Number(o.paid||0)}"></div><div class="field full"><label>Observação interna</label><textarea class="textarea" name="internalNotes">${esc(o.internalNotes||'')}</textarea></div></div><div class="form-actions"><button type="button" class="btn btn-soft" data-action="open-order-whatsapp" data-id="${esc(o.id)}">WhatsApp</button><button class="btn btn-primary">Salvar</button></div></form>`,'orderModal');
  }

  function newManualOrder(){
    openModal('Novo pedido manual',`<form id="manualOrderForm"><div class="form-grid"><div class="field"><label>Cliente</label><input class="input" name="customerName" required></div><div class="field"><label>WhatsApp</label><input class="input" name="phone"></div><div class="field full"><label>Descrição do pedido</label><input class="input" name="itemName" required placeholder="Ex.: Bolo de aniversário 2 kg"></div><div class="field"><label>Valor total</label><input class="input" name="total" type="number" min="0" step="0.01" required></div><div class="field"><label>Valor recebido</label><input class="input" name="paid" type="number" min="0" step="0.01" value="0"></div><div class="field"><label>Data</label><input class="input" name="deliveryDate" type="date" min="${todayISO()}" required></div><div class="field"><label>Horário</label><input class="input" name="deliveryTime" type="time" required></div><div class="field"><label>Modalidade</label><select class="select" name="deliveryMode"><option>Retirada</option><option>Entrega</option></select></div><div class="field"><label>Pagamento</label><select class="select" name="paymentMethod"><option>Pix</option><option>Dinheiro</option><option>Débito</option><option>Crédito</option><option>A combinar</option></select></div><div class="field full"><label>Observações</label><textarea class="textarea" name="notes"></textarea></div></div><div class="form-actions"><button type="button" class="btn btn-soft" data-action="close-modal">Cancelar</button><button class="btn btn-primary">Salvar pedido</button></div></form>`);
  }
  function newExpense(){
    openModal('Nova despesa',`<form id="expenseForm"><div class="form-grid"><div class="field"><label>Data</label><input class="input" type="date" name="date" value="${todayISO()}" required></div><div class="field"><label>Categoria</label><select class="select" name="category"><option>Ingredientes</option><option>Embalagens</option><option>Energia</option><option>Água</option><option>Gás</option><option>Entrega</option><option>Marketing</option><option>Equipamentos</option><option>Outros</option></select></div><div class="field full"><label>Descrição</label><input class="input" name="description" required></div><div class="field"><label>Valor</label><input class="input" type="number" step="0.01" min="0" name="amount" required></div><div class="field"><label>Pagamento</label><select class="select" name="paymentMethod"><option>Pix</option><option>Dinheiro</option><option>Débito</option><option>Crédito</option><option>Boleto</option></select></div></div><div class="form-actions"><button type="button" class="btn btn-soft" data-action="close-modal">Cancelar</button><button class="btn btn-primary">Salvar</button></div></form>`);
  }
  function newStockItem(){
    openModal('Novo item de estoque',`<form id="stockItemForm"><div class="form-grid"><div class="field full"><label>Item</label><input class="input" name="name" required></div><div class="field"><label>Unidade</label><select class="select" name="unit"><option>un</option><option>kg</option><option>g</option><option>L</option><option>ml</option><option>cx</option><option>pct</option></select></div><div class="field"><label>Saldo inicial</label><input class="input" type="number" step="0.001" name="qty" value="0" required></div><div class="field"><label>Estoque mínimo</label><input class="input" type="number" step="0.001" name="min" value="0" required></div><div class="field"><label>Custo unitário</label><input class="input" type="number" step="0.01" name="cost" value="0"></div></div><div class="form-actions"><button type="button" class="btn btn-soft" data-action="close-modal">Cancelar</button><button class="btn btn-primary">Salvar</button></div></form>`);
  }
  function adjustStock(id){
    const s=state.stock.find(x=>x.id===id); if(!s) return;
    openModal(`Ajustar ${esc(s.name)}`,`<form id="stockAdjustForm"><input type="hidden" name="id" value="${esc(s.id)}"><p>Saldo atual: <b>${s.qty} ${esc(s.unit)}</b></p><div class="form-grid"><div class="field"><label>Operação</label><select class="select" name="operation"><option value="add">Entrada (+)</option><option value="remove">Saída (-)</option><option value="set">Definir saldo</option></select></div><div class="field"><label>Quantidade</label><input class="input" name="qty" type="number" step="0.001" min="0" required></div><div class="field full"><label>Motivo</label><input class="input" name="reason" placeholder="Compra, produção, ajuste, perda..."></div></div><div class="form-actions"><button type="button" class="btn btn-soft" data-action="close-modal">Cancelar</button><button class="btn btn-primary">Aplicar</button></div></form>`);
  }
  function editProduct(id=null){
    const p=id?state.products.find(x=>x.id===id):null;
    productImageDraft={url:p?.imageUrl||'',dataUrl:'',removed:false};
    openModal(p?'Editar produto':'Novo produto',`<form id="productForm"><input type="hidden" name="id" value="${esc(p?.id||'')}"><div class="product-editor-layout"><div class="product-photo-editor"><label>Imagem do produto</label><div id="productImagePreview" class="product-image-preview"></div><div class="photo-actions"><label class="btn btn-soft btn-sm upload-btn">🖼️ Galeria<input id="productGalleryInput" type="file" accept="image/*" hidden></label><label class="btn btn-soft btn-sm upload-btn">📷 Câmera<input id="productCameraInput" type="file" accept="image/*" capture="environment" hidden></label><button type="button" class="btn btn-danger btn-sm" data-action="remove-product-image" hidden>Remover</button></div><p class="settings-note">A foto é reduzida automaticamente para deixar o aplicativo mais leve. Com Google Sheets conectado, ela é enviada ao Google Drive.</p></div><div class="form-grid product-fields"><div class="field full"><label>Nome</label><input class="input" name="name" value="${esc(p?.name||'')}" required></div><div class="field"><label>Categoria</label><select class="select" name="category">${['Bolos','Doces','Kits','Pronta entrega','Personalizados'].map(c=>`<option ${p?.category===c?'selected':''}>${c}</option>`).join('')}</select></div><div class="field"><label>Ícone de apoio</label><input class="input" name="emoji" value="${esc(p?.emoji||'🍰')}" maxlength="4"></div><div class="field"><label>Preço</label><input class="input" name="price" type="number" min="0" step="0.01" value="${Number(p?.price||0)}"></div><div class="field"><label>Ativo</label><select class="select" name="active"><option value="true" ${p?.active!==false?'selected':''}>Sim</option><option value="false" ${p?.active===false?'selected':''}>Não</option></select></div><div class="field full"><label>Descrição</label><textarea class="textarea" name="description">${esc(p?.description||'')}</textarea></div></div></div><div class="form-actions"><button type="button" class="btn btn-soft" data-action="close-modal">Cancelar</button><button class="btn btn-primary">Salvar produto</button></div></form>`);
    requestAnimationFrame(updateProductImagePreview);
  }


  async function api(payload){
    if(!config.scriptUrl) throw new Error('Google Sheets não configurado.');
    const res = await fetch(config.scriptUrl, {method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify(payload)});
    if(!res.ok) throw new Error(`Falha HTTP ${res.status}`);
    const data = await res.json();
    if(data.ok===false) throw new Error(data.error||'Erro no Apps Script');
    return data;
  }
  async function syncFromSheets(silent=false){
    if(!config.scriptUrl){ if(!silent) toast('Configure a URL do Google Apps Script.','error'); return; }
    try{
      const data = await api({action:'bootstrap'});
      if(Array.isArray(data.products) && data.products.length){const localImages=new Map(state.products.map(x=>[String(x.id),String(x.imageUrl||'')]));state.products=data.products.map(p=>({...p,price:Number(p.price||0),active:String(p.active)!=='false',imageUrl:String(p.imageUrl||localImages.get(String(p.id))||'')}));}
      if(Array.isArray(data.stock)) state.stock=data.stock.map(s=>({...s,qty:Number(s.qty||0),min:Number(s.min||0),cost:Number(s.cost||0)}));
      if(Array.isArray(data.orders)) state.orders=data.orders.map(o=>({...o,total:Number(o.total||0),paid:Number(o.paid||0),items:typeof o.items==='string'?safeParse(o.items,[]):o.items||[]}));
      if(Array.isArray(data.expenses)) state.expenses=data.expenses.map(e=>({...e,amount:Number(e.amount||0)}));
      config.lastSync=new Date().toISOString(); save(); saveConfig(); render(); if(!silent) toast('Dados sincronizados com o Google Sheets.','success');
    }catch(err){ if(!silent) toast(`Não foi possível sincronizar: ${err.message}`,'error'); }
  }
  function safeParse(s,fallback){try{return JSON.parse(s)}catch{return fallback}}
  async function sendMutation(action, data){
    if(!config.scriptUrl) return;
    try{ await api({action,data}); config.lastSync=new Date().toISOString(); saveConfig(); }
    catch(err){ toast(`Salvo localmente. Falha ao enviar ao Sheets: ${err.message}`,'error'); }
  }

  document.addEventListener('click', async (e)=>{
    const t=e.target.closest('[data-action],[data-client-tab],[data-admin-tab],[data-category],[data-add-product],[data-cart-remove],[data-order-detail],[data-stock-adjust],[data-product-edit]');
    if(!t) return;
    if(t.dataset.clientTab){view.clientTab=t.dataset.clientTab;render();return;}
    if(t.dataset.adminTab){view.adminTab=t.dataset.adminTab;render();return;}
    if(t.dataset.category){view.category=t.dataset.category;render();return;}
    if(t.dataset.addProduct){const p=state.products.find(x=>x.id===t.dataset.addProduct);if(p)openProduct(p);return;}
    if(t.dataset.cartRemove!==undefined){state.cart.splice(Number(t.dataset.cartRemove),1);save();closeModal();openCart();render();return;}
    if(t.dataset.orderDetail){openOrderDetail(t.dataset.orderDetail);return;}
    if(t.dataset.stockAdjust){adjustStock(t.dataset.stockAdjust);return;}
    if(t.dataset.productEdit){editProduct(t.dataset.productEdit);return;}
    switch(t.dataset.action){
      case 'go-landing': view.area='landing';render();break;
      case 'open-client': view.area='client';view.clientTab='home';render();break;
      case 'open-admin-login': view.area='admin-login';render();break;
      case 'logout-admin': view.adminUnlocked=false;view.area='landing';render();break;
      case 'close-modal': closeModal();break;
      case 'open-cart': openCart();break;
      case 'checkout': closeModal();openCheckout();break;
      case 'new-manual-order': newManualOrder();break;
      case 'new-expense': newExpense();break;
      case 'new-stock-item': newStockItem();break;
      case 'new-product': editProduct();break;
      case 'remove-product-image': productImageDraft={url:'',dataUrl:'',removed:true};updateProductImagePreview();break;
      case 'admin-sync': await syncFromSheets();break;
      case 'client-sync': await syncFromSheets();break;
      case 'test-connection':
        if(!document.querySelector('#settingsForm [name=scriptUrl]')?.value.trim()) return toast('Informe a URL primeiro.','error');
        try{const old=config.scriptUrl;config.scriptUrl=document.querySelector('#settingsForm [name=scriptUrl]').value.trim();await api({action:'ping'});toast('Conexão realizada com sucesso.','success');config.scriptUrl=old;}catch(err){toast(`Falha na conexão: ${err.message}`,'error');}break;
      case 'open-whatsapp':
        if(!config.whatsapp) return toast('WhatsApp ainda não configurado.','error');
        window.open(`https://wa.me/${String(config.whatsapp).replace(/\D/g,'')}`,'_blank');break;
      case 'open-order-whatsapp':{
        const o=state.orders.find(x=>x.id===t.dataset.id); if(!o)break;
        const phone=String(o.phone||'').replace(/\D/g,''); if(!phone)return toast('Este pedido não possui WhatsApp.','error');
        const msg=`Olá, ${o.customerName}! ❤️%0ASeu pedido ${o.id} está com status: ${statusLabel(o.status)}.%0AEntrega: ${fmtDate(o.deliveryDate)} às ${o.deliveryTime}.%0AJulih & Cia`;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(decodeURIComponent(msg))}`,'_blank');break;
      }
    }
  });

  document.addEventListener('change', async (e)=>{
    if(!['productGalleryInput','productCameraInput'].includes(e.target.id)) return;
    const file=e.target.files?.[0]; if(!file) return;
    try{
      toast('Preparando a foto...');
      productImageDraft.dataUrl=await resizeImageFile(file);
      productImageDraft.removed=false;
      updateProductImagePreview();
      toast('Foto pronta para salvar.','success');
    }catch(err){ toast(err.message||'Não foi possível carregar a foto.','error'); }
  });

  document.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const form=e.target;
    const fd=Object.fromEntries(new FormData(form).entries());
    if(form.id==='adminLoginForm'){
      if(fd.pin===config.adminPin){view.adminUnlocked=true;view.area='admin';view.adminTab='dashboard';render(); if(config.scriptUrl) syncFromSheets(true);} else toast('PIN incorreto.','error');
      return;
    }
    if(form.id==='addProductForm'){
      const p=state.products.find(x=>x.id===fd.productId);if(!p)return;
      state.cart.push({productId:p.id,name:p.name,price:Number(p.price||0),emoji:p.emoji,qty:Number(fd.qty||1),notes:[fd.theme&&`Tema: ${fd.theme}`,fd.people&&`${fd.people} pessoas`,fd.notes].filter(Boolean).join(' • ')});save();closeModal();render();toast('Item adicionado ao carrinho.','success');return;
    }
    if(form.id==='checkoutForm'){
      const items=state.cart.map(x=>({...x}));
      const subtotal=items.reduce((s,i)=>s+Number(i.price||0)*Number(i.qty||0),0);
      const deliveryFee=fd.deliveryMode==='Entrega'?Number(config.deliveryFee||0):0;
      const order={id:uid('JC'),createdAt:new Date().toISOString(),customerName:fd.customerName,phone:fd.phone,items,deliveryDate:fd.deliveryDate,deliveryTime:fd.deliveryTime,deliveryMode:fd.deliveryMode,address:fd.address,notes:fd.notes,paymentMethod:fd.paymentMethod,total:subtotal+deliveryFee,paid:0,status:'recebido',internalNotes:''};
      state.orders.push(order);state.clientOrders.push(order.id);state.cart=[];save();closeModal();render();toast('Pedido enviado para a confeitaria! ❤️','success');await sendMutation('createOrder',order);return;
    }
    if(form.id==='manualOrderForm'){
      const order={id:uid('JC'),createdAt:new Date().toISOString(),customerName:fd.customerName,phone:fd.phone,items:[{name:fd.itemName,qty:1,price:Number(fd.total||0),emoji:'🎂',notes:fd.notes}],deliveryDate:fd.deliveryDate,deliveryTime:fd.deliveryTime,deliveryMode:fd.deliveryMode,address:'',notes:fd.notes,paymentMethod:fd.paymentMethod,total:Number(fd.total||0),paid:Number(fd.paid||0),status:'confirmado',internalNotes:''};
      state.orders.push(order);save();closeModal();render();toast('Pedido cadastrado.','success');await sendMutation('createOrder',order);return;
    }
    if(form.id==='orderUpdateForm'){
      const o=state.orders.find(x=>x.id===fd.id);if(!o)return;o.status=fd.status;o.paid=Number(fd.paid||0);o.internalNotes=fd.internalNotes;save();closeModal();render();toast('Pedido atualizado.','success');await sendMutation('updateOrder',o);return;
    }
    if(form.id==='expenseForm'){
      const ex={id:uid('DESP'),date:fd.date,category:fd.category,description:fd.description,amount:Number(fd.amount||0),paymentMethod:fd.paymentMethod,createdAt:new Date().toISOString()};state.expenses.push(ex);save();closeModal();render();toast('Despesa registrada.','success');await sendMutation('createExpense',ex);return;
    }
    if(form.id==='stockItemForm'){
      const s={id:uid('EST'),name:fd.name,unit:fd.unit,qty:Number(fd.qty||0),min:Number(fd.min||0),cost:Number(fd.cost||0)};state.stock.push(s);save();closeModal();render();toast('Item adicionado ao estoque.','success');await sendMutation('upsertStock',s);return;
    }
    if(form.id==='stockAdjustForm'){
      const s=state.stock.find(x=>x.id===fd.id);if(!s)return;const q=Number(fd.qty||0);if(fd.operation==='add')s.qty=Number(s.qty)+q;else if(fd.operation==='remove')s.qty=Math.max(0,Number(s.qty)-q);else s.qty=q;save();closeModal();render();toast('Estoque atualizado.','success');await sendMutation('upsertStock',s);return;
    }
    if(form.id==='productForm'){
      let p=fd.id?state.products.find(x=>x.id===fd.id):null;
      if(!p){p={id:uid('PROD'),imageUrl:''};state.products.push(p);}
      let imageUrl=productImageDraft.removed?'':(productImageDraft.url||p.imageUrl||'');
      if(productImageDraft.dataUrl){
        try{
          const upload=await uploadProductImage(productImageDraft.dataUrl,p.id,fd.name);
          imageUrl=upload.imageUrl||productImageDraft.dataUrl;
        }catch(err){
          imageUrl=productImageDraft.dataUrl;
          toast(`Foto salva somente neste aparelho: ${err.message}`,'error');
        }
      }
      Object.assign(p,{name:fd.name,category:fd.category,emoji:fd.emoji||'🍰',price:Number(fd.price||0),active:fd.active==='true',description:fd.description,imageUrl});
      try{save();}catch(err){toast('A foto ficou grande demais para o armazenamento local. Conecte o Google Sheets/Drive ou use uma foto menor.','error');return;}
      closeModal();render();toast('Produto salvo com foto e informações atualizadas.','success');const remoteProduct={...p};if(config.scriptUrl && String(remoteProduct.imageUrl||'').startsWith('data:'))remoteProduct.imageUrl=productImageDraft.url||'';await sendMutation('upsertProduct',remoteProduct);return;
    }
    if(form.id==='settingsForm'){
      config.scriptUrl=fd.scriptUrl.trim();config.whatsapp=fd.whatsapp.trim();config.adminPin=fd.adminPin.trim()||'2026';config.deliveryFee=Number(fd.deliveryFee||0);saveConfig();render();toast('Configurações salvas.','success');return;
    }
  });

  if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(()=>{});
  render();
})();
