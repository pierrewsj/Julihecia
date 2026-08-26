(()=>{
'use strict';
const V='14.0.0', LS='julih_cliente_v14';
const CFG=window.JULIH_CONFIG||{};
const BRL=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const $=s=>document.querySelector(s);
const esc=(s='')=>String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const uid=(p='ID')=>`${p}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
const money=v=>BRL.format(Number(v||0));
const today=()=>new Date().toISOString().slice(0,10);
const fmtDate=s=>s?new Date(`${s}T12:00:00`).toLocaleDateString('pt-BR'):'—';
const demoProducts=[
{id:'P1',name:'Bolo de Chocolate',category:'Bolos',price:90,emoji:'🎂',active:true,description:'Bolo artesanal com opções de recheio.',imageUrl:'',readyStockEnabled:false,readyStock:0,featured:true},
{id:'P2',name:'Bolo Personalizado',category:'Bolos',price:150,emoji:'🎂',active:true,description:'Personalize tema, tamanho e acabamento.',imageUrl:'',readyStockEnabled:false,readyStock:0,featured:false},
{id:'P3',name:'Brigadeiro Gourmet',category:'Doces',price:3.5,emoji:'🍫',active:true,description:'Unidade. Consulte sabores disponíveis.',imageUrl:'',readyStockEnabled:true,readyStock:30,featured:true},
{id:'P4',name:'Cupcake Decorado',category:'Doces',price:8,emoji:'🧁',active:true,description:'Cupcake artesanal decorado.',imageUrl:'',readyStockEnabled:true,readyStock:12,featured:false},
{id:'P5',name:'Kit Festa P',category:'Kits',price:120,emoji:'🎁',active:true,description:'Kit compacto para comemorações.',imageUrl:'',readyStockEnabled:false,readyStock:0,featured:true},
{id:'P7',name:'Fatia Especial',category:'Pronta entrega',price:14,emoji:'🍰',active:true,description:'Sabores do dia, enquanto durar o estoque.',imageUrl:'',readyStockEnabled:true,readyStock:8,featured:false},
{id:'P8',name:'Pedido Personalizado',category:'Personalizados',price:0,emoji:'✨',active:true,description:'Conte sua ideia e receba um orçamento.',imageUrl:'',readyStockEnabled:false,readyStock:0,featured:false}
];
let state={
  products:demoProducts,cart:[],orderIds:[],orders:[],
  publicSettings:{storeName:'Julih & Cia',whatsapp:CFG.whatsapp||'',deliveryFee:0,pixKey:''},
  category:'Todos',tab:'home',search:'',lastSync:null,entry:'intro'
};
try{state={...state,...JSON.parse(localStorage.getItem(LS)||'{}')}}catch{}
state.entry='intro';
function save(){localStorage.setItem(LS,JSON.stringify(state))}
function toast(msg,type=''){const h=$('#toastHost'),d=document.createElement('div');d.className='toast '+type;d.textContent=msg;h.appendChild(d);setTimeout(()=>d.remove(),3200)}
function statusLabel(s){return ({recebido:'Recebido',confirmado:'Confirmado',producao:'Em produção',pronto:'Pronto',entregue:'Entregue',cancelado:'Cancelado'})[s]||s}
function statusStep(s){return ({recebido:1,confirmado:2,producao:3,pronto:4,entregue:5,cancelado:0})[s]||1}
function progressHtml(s){const n=statusStep(s),labels=['Recebido','Confirmado','Produção','Pronto','Entregue'];return `<div class="order-progress">${labels.map((_,i)=>`<span class="${i<n?'on':''}"></span>`).join('')}</div><div class="order-progress-labels">${labels.map((x,i)=>`<b class="${i<n?'on':''}">${x}</b>`).join('')}</div>`}
function featuredCount(){return state.products.filter(p=>String(p.featured)==='true'||p.featured===true).length}
function appbar(){return `<header class="app-header"><div class="app-header-in"><div class="brand"><span class="brand-mark">J</span><div><strong>${esc(state.publicSettings.storeName||'Julih & Cia')}</strong><small>Feito com amor em cada detalhe</small></div></div><div class="header-tools"><button class="install-button" data-pwa-install hidden aria-label="Instalar aplicativo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v11m0 0 4-4m-4 4-4-4M5 20h14"/></svg><span>Instalar</span></button><button class="icon-button" data-action="sync" aria-label="Atualizar catálogo"><svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v6h-6"/></svg></button></div></div></header>`}
function nav(){return `<nav class="bottom-nav" aria-label="Navegação principal"><button class="${state.tab==='home'?'active':''}" data-tab="home"><svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5V21h-6v-6H9v6H3z"/></svg><span>Início</span></button><button class="${state.tab==='orders'?'active':''}" data-tab="orders"><svg viewBox="0 0 24 24"><path d="M6 3h12v18H6zM9 7h6M9 11h6M9 15h4"/></svg><span>Pedidos</span></button><button data-action="cart"><svg viewBox="0 0 24 24"><path d="M3 4h2l2.3 10.3h10.8L21 7H6M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM18 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"/></svg><span>Carrinho</span></button><button class="${state.tab==='contact'?'active':''}" data-tab="contact"><svg viewBox="0 0 24 24"><path d="M21 11.5a8.5 8.5 0 0 1-9 8.5 9.8 9.8 0 0 1-4-.9L3 21l1.7-4.2A8.1 8.1 0 0 1 3.5 12 8.5 8.5 0 1 1 21 11.5Z"/><path d="M8 10h8M8 14h5"/></svg><span>Contato</span></button></nav>`}
function intro(){return `<main class="intro-page"><img class="intro-art" src="${window.JULIH_ART}" alt="Julih & Cia"><div class="intro-atmosphere"></div><div class="intro-bottom"><button class="cta-main" data-action="enter-store"><span>Fazer pedido</span><b>›</b></button><button class="intro-install" data-pwa-install hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v11m0 0 4-4m-4 4-4-4M5 20h14"/></svg>Instalar aplicativo</button><small>Julih & Cia • confeitaria artesanal</small></div></main>`}
function render(){
  document.body.className = state.entry==='intro' ? 'intro-mode' : 'store-mode';
  if(state.entry==='intro'){ $('#app').innerHTML=intro(); return; }
  const content=state.tab==='home'?home():state.tab==='orders'?ordersView():state.tab==='contact'?contact():home();
  $('#app').innerHTML=`<div class="watermark-art" aria-hidden="true"><img src="${window.JULIH_ART}" alt=""></div>`+appbar()+content+nav()+(state.cart.length?`<button class="cart-fab" data-action="cart">🛒 ${state.cart.reduce((a,b)=>a+Number(b.qty||0),0)}</button>`:'');
}
function home(){
  const cats=['Todos','Bolos','Doces','Kits','Pronta entrega','Personalizados'];
  let products=state.products.filter(p=>p.active!==false);
  if(state.category!=='Todos') products=products.filter(p=>p.category===state.category);
  if(state.search) products=products.filter(p=>`${p.name} ${p.description} ${p.category}`.toLowerCase().includes(state.search.toLowerCase()));
  return `<main class="shell store-shell">
    <section class="future-hero glass-panel">
      <div class="hud-chip"><i></i> JULIH EXPERIENCE</div>
      <h1>Escolha a sua próxima <em>delícia.</em></h1>
      <p>Bolos, doces, kits e encomendas personalizadas em uma experiência criada para encantar.</p>
      <div class="hero-actions"><button class="primary-action" data-action="scroll-catalog">Explorar catálogo <b>›</b></button><button class="ghost-action" data-category="Personalizados">Criar encomenda</button></div>
      <div class="hero-orbit" aria-hidden="true"><span></span><span></span><span></span></div>
    </section>
    <section class="feature-grid">
      <button class="feature-card" data-category="Pronta entrega"><span class="feature-icon"><svg viewBox="0 0 24 24"><path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></svg></span><div><small>Disponível agora</small><strong>Pronta entrega</strong><p>Veja doces e bolos que podem sair hoje.</p></div><b>›</b></button>
      <button class="feature-card" data-category="Personalizados"><span class="feature-icon"><svg viewBox="0 0 24 24"><path d="m12 3 1.4 4.2L18 9l-4.6 1.8L12 15l-1.4-4.2L6 9l4.6-1.8L12 3Z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/></svg></span><div><small>Feito para você</small><strong>Personalizados</strong><p>Conte sua ideia e monte uma encomenda exclusiva.</p></div><b>›</b></button>
    </section>
    <section id="catalogSection" class="catalog-panel glass-panel">
      <div class="section-heading"><div><span class="hud-chip"><i></i> CATÁLOGO</span><h2>Feito para encantar</h2><p>${state.lastSync?'Atualizado '+new Date(state.lastSync).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'Escolha uma categoria ou pesquise seu produto.'}</p></div></div>
      <div class="search"><input class="input" id="searchInput" placeholder="Buscar bolo, doce, kit..." value="${esc(state.search)}"><button class="btn btn-soft" data-action="clear-search">Limpar</button></div>
      <div class="categories">${cats.map(c=>`<button class="${state.category===c?'active':''}" data-category="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      <div class="product-grid">${products.length?products.map(productCard).join(''):'<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">◇</div><h3>Nenhum produto encontrado</h3><p>Tente outra categoria ou busca.</p></div>'}</div>
    </section>
  </main>`;
}
function productCard(p){
  const ready=String(p.readyStockEnabled)==='true'||p.readyStockEnabled===true, qty=Number(p.readyStock||0), out=ready&&qty<=0, price=Number(p.price||0)>0?`A partir de ${money(p.price)}`:'Solicite orçamento';
  return `<article class="product-card ${p.featured===true||String(p.featured)==='true'?'featured':''}"><div class="product-visual">${p.imageUrl?`<img src="${esc(p.imageUrl)}" alt="${esc(p.name)}" onerror="this.remove();this.parentElement.insertAdjacentHTML('beforeend','<span>${esc(p.emoji||'🍰')}</span>')">`:`<span>${esc(p.emoji||'🍰')}</span>`}${ready?`<span class="ready-badge ${out?'out':''}">${out?'Esgotado':`${qty} disponíveis`}</span>`:''}</div><div class="product-content"><span class="badge">${esc(p.category)}</span><h3>${esc(p.name)}</h3><p>${esc(p.description||'')}</p><span class="price">${price}</span><div class="product-actions"><button class="btn ${out?'btn-soft':'btn-primary'} btn-sm" ${out?'disabled':''} data-add="${esc(p.id)}">${out?'Esgotado':Number(p.price||0)>0?'Adicionar':'Orçamento'}</button></div></div></article>`
}
function ordersView(){const arr=[...state.orders].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));return `<main class="shell"><section class="glass orders-hero"><span class="eyebrow">Acompanhamento em tempo real</span><h1>Seus pedidos</h1><p>Veja cada etapa da sua encomenda com um visual mais moderno e elegante.</p><button class="btn btn-soft btn-sm" data-action="sync-orders">↻ Atualizar status</button></section><div class="orders-stack">${arr.length?arr.map(o=>`<article class="order-card"><div class="order-tech">Pedido conectado</div><div class="order-top"><div><span class="order-id">${esc(o.id)}</span><h3>${esc(o.items?.[0]?.name||'Pedido')}</h3></div><span class="status status-pill st-${esc(o.status)}">${statusLabel(o.status)}</span></div><div class="order-meta"><span>📅 ${fmtDate(o.deliveryDate)}</span><span>⏰ ${esc(o.deliveryTime||'A combinar')}</span><span>🧁 ${esc(o.items?.[0]?.name||'Pedido')}</span></div>${progressHtml(o.status)}<div class="order-line"><span>Valor</span><strong>${Number(o.total||0)>0?money(o.total):'Orçamento'}</strong></div><div class="order-line"><span>Etapa atual</span><strong>${statusLabel(o.status)}</strong></div></article>`).join(''):`<div class="card empty"><div class="emoji">📋</div><h3>Nenhum pedido ainda</h3><p>Quando você finalizar uma encomenda, ela aparecerá aqui.</p><button class="btn btn-primary" data-tab="home">Ver catálogo</button></div>`}</div></main>`}
function contact(){const w=state.publicSettings.whatsapp||CFG.whatsapp||'';return `<main class="shell"><section class="contact-hero card"><span class="eyebrow">Contato direto</span><h1>Fale com a Julih & Cia</h1><p>Dúvidas, alterações e pedidos especiais com atendimento rápido.</p><button class="btn btn-primary" data-action="whatsapp" ${w?'':'disabled'}>Abrir WhatsApp</button></section>${state.publicSettings.pixKey?`<div class="card" style="margin-top:14px"><h3>💠 Pix</h3><p style="color:var(--muted)">Chave informada pela confeitaria:</p><strong>${esc(state.publicSettings.pixKey)}</strong></div>`:''}</main>`}
function modal(title,body){const d=document.createElement('div');d.className='modal-bg';d.innerHTML=`<div class="modal"><div class="modal-head"><h2>${title}</h2><button class="icon-btn" data-action="close">✕</button></div><div class="modal-body">${body}</div></div>`;document.body.appendChild(d)}
function close(){document.querySelector('.modal-bg')?.remove()}
function openProduct(id){const p=state.products.find(x=>String(x.id)===String(id));if(!p)return;const isQuote=Number(p.price||0)<=0;const ready=String(p.readyStockEnabled)==='true'||p.readyStockEnabled===true;const max=ready?Math.max(0,Number(p.readyStock||0)):99;modal(isQuote?'Solicitar orçamento':esc(p.name),`<form id="addForm"><input type="hidden" name="productId" value="${esc(p.id)}"><div class="form-grid"><div class="field"><label>Quantidade</label><input class="input" type="number" name="qty" min="1" ${ready?`max="${max}"`:''} value="1" required></div>${isQuote?`<div class="field"><label>Quantidade de pessoas</label><input class="input" name="people" placeholder="Ex.: 30"></div><div class="field full"><label>Tema / ocasião</label><input class="input" name="theme" placeholder="Ex.: aniversário infantil"></div>`:''}<div class="field full"><label>Detalhes</label><textarea class="textarea" name="notes" placeholder="Sabor, recheio, decoração, cores e outros detalhes."></textarea></div></div><div class="form-actions"><button type="button" class="btn btn-soft" data-action="close">Cancelar</button><button class="btn btn-primary">Adicionar</button></div></form>`)}
function cart(){state.tab='home';save();const sub=state.cart.reduce((s,i)=>s+Number(i.price||0)*Number(i.qty||0),0);modal('Seu carrinho',`<div class="list">${state.cart.length?state.cart.map((i,idx)=>`<div class="row"><div class="row-main"><div class="avatar">${esc(i.emoji||'🍰')}</div><div><strong>${i.qty}x ${esc(i.name)}</strong><small>${esc(i.notes||'')}</small></div></div><div class="row-right"><strong>${Number(i.price)>0?money(i.price*i.qty):'Orçamento'}</strong><button class="btn btn-danger btn-sm" data-remove="${idx}" style="margin-top:5px">Remover</button></div></div>`).join(''):'<div class="empty"><div class="emoji">🛒</div><h3>Carrinho vazio</h3></div>'}</div>${state.cart.length?`<div class="card" style="margin-top:12px"><div class="row"><strong>Subtotal</strong><strong>${money(sub)}</strong></div><button class="btn btn-primary btn-block" style="margin-top:12px" data-action="checkout">Continuar</button></div>`:''}`)}
function checkout(){if(!state.cart.length)return toast('Carrinho vazio.','error');const hasQuote=state.cart.some(i=>Number(i.price||0)<=0);modal(hasQuote?'Finalizar solicitação':'Finalizar pedido',`<form id="checkoutForm"><div class="form-grid"><div class="field"><label>Nome</label><input class="input" name="customerName" required></div><div class="field"><label>WhatsApp</label><input class="input" name="phone" inputmode="tel" required placeholder="31999999999"></div><div class="field"><label>Data desejada</label><input class="input" type="date" name="deliveryDate" min="${today()}" required></div><div class="field"><label>Horário</label><input class="input" type="time" name="deliveryTime" required></div><div class="field"><label>Recebimento</label><select class="select" name="deliveryMode"><option>Retirada</option><option>Entrega</option></select></div><div class="field"><label>Pagamento</label><select class="select" name="paymentMethod"><option>Pix</option><option>Dinheiro</option><option>Débito</option><option>Crédito</option><option>A combinar</option></select></div><div class="field full"><label>Endereço (se entrega)</label><input class="input" name="address" placeholder="Rua, número, bairro, cidade"></div><div class="field full"><label>Observações gerais</label><textarea class="textarea" name="notes"></textarea></div></div>${hasQuote?'<div class="note">✨ Existe item personalizado. O valor final será confirmado pela confeitaria antes da produção.</div>':''}<div class="form-actions"><button type="button" class="btn btn-soft" data-action="close">Voltar</button><button class="btn btn-primary">Enviar pedido</button></div></form>`)}
async function api(action,data={}){const url=(CFG.scriptUrl||'').trim();if(!url)throw new Error('Aplicativo ainda não conectado à confeitaria.');const r=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,data})});const j=await r.json();if(j.ok===false)throw new Error(j.error||'Falha na conexão');return j}
function normProduct(p){return {...p,price:Number(p.price||0),readyStock:Number(p.readyStock||0),active:String(p.active)!=='false',readyStockEnabled:String(p.readyStockEnabled)==='true'||p.readyStockEnabled===true,featured:String(p.featured)==='true'||p.featured===true}}
const safe=(s,f)=>{try{return JSON.parse(s)}catch{return f}};
async function sync(silent=false){if(!CFG.scriptUrl){if(!silent)toast('O app ainda precisa da URL do Google Apps Script.','error');return}try{const d=await api('publicBootstrap');if(Array.isArray(d.products))state.products=d.products.map(normProduct);state.publicSettings={...state.publicSettings,...(d.settings||{})};state.lastSync=new Date().toISOString();save();render();await syncOrders(true);if(!silent)toast('Catálogo atualizado.','success')}catch(e){if(!silent)toast(e.message,'error')}}
async function syncOrders(silent=false){if(!state.orderIds.length)return;if(!CFG.scriptUrl)return;try{const d=await api('lookupOrders',{ids:state.orderIds});state.orders=(d.orders||[]).map(o=>({...o,total:Number(o.total||0),paid:Number(o.paid||0),items:typeof o.items==='string'?safe(o.items,[]):o.items||[]}));save();if(state.tab==='orders')render();if(!silent)toast('Status atualizado.','success')}catch(e){if(!silent)toast(e.message,'error')}}
document.addEventListener('click',e=>{const t=e.target.closest('[data-action],[data-tab],[data-category],[data-add],[data-remove]');if(!t)return;
  if(t.dataset.tab){state.tab=t.dataset.tab;state.entry='store';save();render();return}
  if(t.dataset.category){state.category=t.dataset.category;state.tab='home';state.entry='store';save();render();setTimeout(()=>document.getElementById('catalogSection')?.scrollIntoView({behavior:'smooth',block:'start'}),20);return}
  if(t.dataset.add){openProduct(t.dataset.add);return}
  if(t.dataset.remove!==undefined){state.cart.splice(Number(t.dataset.remove),1);save();close();cart();return}
  switch(t.dataset.action){
    case 'enter-store': state.entry='store'; state.tab='home'; save(); render(); break;
    case 'scroll-catalog': state.entry='store'; state.tab='home'; save(); render(); setTimeout(()=>document.getElementById('catalogSection')?.scrollIntoView({behavior:'smooth',block:'start'}),40); break;
    case 'sync': sync(); break;
    case 'sync-orders': syncOrders(); break;
    case 'clear-search': state.search=''; save(); render(); break;
    case 'close': close(); break;
    case 'cart': cart(); break;
    case 'checkout': close(); checkout(); break;
    case 'whatsapp': {const n=(state.publicSettings.whatsapp||CFG.whatsapp||'').replace(/\\D/g,'');if(n)window.open(`https://wa.me/${n}`,'_blank'); break;}
  }
});
document.addEventListener('input',e=>{if(e.target.id==='searchInput'){state.search=e.target.value;save();clearTimeout(window.__st);window.__st=setTimeout(render,180)}});
document.addEventListener('submit',async e=>{e.preventDefault();const f=e.target,fd=Object.fromEntries(new FormData(f).entries());
  if(f.id==='addForm'){
    const p=state.products.find(x=>String(x.id)===String(fd.productId)); if(!p)return;
    const qty=Math.max(1,Number(fd.qty||1));
    if(p.readyStockEnabled&&qty>Number(p.readyStock||0))return toast('Quantidade maior que a pronta entrega disponível.','error');
    state.cart.push({productId:p.id,name:p.name,emoji:p.emoji,price:Number(p.price||0),qty,notes:[fd.theme&&`Tema: ${fd.theme}`,fd.people&&`Pessoas: ${fd.people}`,fd.notes].filter(Boolean).join(' · ')});
    save(); close(); render(); toast('Adicionado ao carrinho.','success'); return;
  }
  if(f.id==='checkoutForm'){
    const order={id:uid('JC'),createdAt:new Date().toISOString(),customerName:fd.customerName.trim(),phone:fd.phone.trim(),items:state.cart,deliveryDate:fd.deliveryDate,deliveryTime:fd.deliveryTime,deliveryMode:fd.deliveryMode,address:fd.address||'',notes:fd.notes||'',paymentMethod:fd.paymentMethod,total:state.cart.reduce((s,i)=>s+Number(i.price||0)*Number(i.qty||0),0),paid:0,status:'recebido',internalNotes:''};
    const btn=f.querySelector('button[type="submit"]'); if(btn){btn.disabled=true;btn.textContent='Enviando...'}
    try{ await api('createOrder',order); state.orderIds=[...new Set([...state.orderIds,order.id])]; state.orders.push(order); state.cart=[]; state.tab='orders'; save(); close(); render(); toast('Pedido enviado para a confeitaria!','success'); setTimeout(()=>sync(true),500)}
    catch(err){ toast(err.message,'error'); if(btn){btn.disabled=false;btn.textContent='Enviar pedido'} }
  }
});
render(); sync(true); setInterval(()=>{sync(true)},60000);
})();
window.addEventListener('julih-toast',e=>toast(e.detail||'Informação'));
