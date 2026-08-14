(()=>{
'use strict';
const V='5.0.0', LS='julih_cliente_v4';
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
function featuredCount(){return state.products.filter(p=>String(p.featured)==='true'||p.featured===true).length}
function appbar(){return `<header class="appbar"><div class="appbar-in"><div class="brand brand-text"><div class="brand-monogram">J</div><div><strong>${esc(state.publicSettings.storeName||'Julih & Cia')}</strong><small>Feito com amor em cada detalhe</small></div></div><button class="icon-btn" data-action="sync" aria-label="Atualizar catálogo">↻</button></div></header>`}
function nav(){return `<nav class="bottom-nav"><button class="${state.tab==='home'?'active':''}" data-tab="home"><span>⌂</span>Início</button><button class="${state.tab==='orders'?'active':''}" data-tab="orders"><span>📋</span>Pedidos</button><button data-action="cart"><span>🛒</span>Carrinho</button><button class="${state.tab==='contact'?'active':''}" data-tab="contact"><span>💬</span>Contato</button></nav>`}
function intro(){return `<main class="intro-page"><div class="intro-brand"></div><div class="intro-shine"></div><div class="intro-bottom"><button class="cta-main" data-action="enter-store"><span>Fazer pedido</span><b>›</b></button><small>Julih & Cia • confeitaria artesanal</small></div></main>`}
function render(){
  document.body.className = state.entry==='intro' ? 'intro-mode' : 'store-mode';
  if(state.entry==='intro'){ $('#app').innerHTML=intro(); return; }
  const content=state.tab==='home'?home():state.tab==='orders'?ordersView():state.tab==='contact'?contact():home();
  $('#app').innerHTML=appbar()+content+nav()+(state.cart.length?`<button class="cart-fab" data-action="cart">🛒 ${state.cart.reduce((a,b)=>a+Number(b.qty||0),0)}</button>`:'');
}
function home(){
  const cats=['Todos','Bolos','Doces','Kits','Pronta entrega','Personalizados'];
  let products=state.products.filter(p=>p.active!==false);
  if(state.category!=='Todos') products=products.filter(p=>p.category===state.category);
  if(state.search) products=products.filter(p=>`${p.name} ${p.description} ${p.category}`.toLowerCase().includes(state.search.toLowerCase()));
  return `<main class="shell store-shell">
    <section class="glass hero-glass">
      <span class="eyebrow">♡ Bem-vinda à Julih & Cia</span>
      <h1>Escolha a sua próxima delícia.</h1>
      <p>Bolos, doces, kits e encomendas personalizadas feitos com carinho para cada momento.</p>
      <button class="cta-compact" data-action="scroll-catalog">Ver catálogo <b>›</b></button>
    </section>
    <section class="feature-grid">
      <button class="feature-card" data-category="Pronta entrega"><span class="feature-icon">🛍️</span><div><strong>Pronta entrega</strong><small>Veja o que está disponível agora.</small></div><b>›</b></button>
      <button class="feature-card" data-category="Personalizados"><span class="feature-icon">✨</span><div><strong>Personalizados</strong><small>Conte sua ideia e peça um orçamento.</small></div><b>›</b></button>
    </section>
    <section id="catalogSection" class="glass catalog-panel">
      <div class="page-title"><div><span class="eyebrow">Nosso catálogo</span><h2>Feito para encantar</h2><p>${state.lastSync?'Atualizado '+new Date(state.lastSync).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'Escolha uma categoria ou pesquise seu produto.'}</p></div></div>
      <div class="search"><input class="input" id="searchInput" placeholder="Buscar bolo, doce, kit..." value="${esc(state.search)}"><button class="btn btn-soft" data-action="clear-search">Limpar</button></div>
      <div class="categories">${cats.map(c=>`<button class="${state.category===c?'active':''}" data-category="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      <div class="product-grid">${products.length?products.map(productCard).join(''):'<div class="card empty" style="grid-column:1/-1"><div class="emoji">🍰</div><h3>Nenhum produto encontrado</h3><p>Tente outra categoria ou busca.</p></div>'}</div>
    </section>
  </main>`;
}
function productCard(p){
  const ready=String(p.readyStockEnabled)==='true'||p.readyStockEnabled===true, qty=Number(p.readyStock||0), out=ready&&qty<=0, price=Number(p.price||0)>0?`A partir de ${money(p.price)}`:'Solicite orçamento';
  return `<article class="product ${p.featured===true||String(p.featured)==='true'?'featured':''}"><div class="visual">${p.imageUrl?`<img src="${esc(p.imageUrl)}" alt="${esc(p.name)}" onerror="this.remove();this.parentElement.insertAdjacentHTML('beforeend','<span>${esc(p.emoji||'🍰')}</span>')">`:`<span>${esc(p.emoji||'🍰')}</span>`}${ready?`<span class="ready-badge ${out?'out':''}">${out?'Esgotado':`${qty} disponíveis`}</span>`:''}</div><div class="content"><span class="badge">${esc(p.category)}</span><h3>${esc(p.name)}</h3><p>${esc(p.description||'')}</p><span class="price">${price}</span><div class="product-actions"><button class="btn ${out?'btn-soft':'btn-primary'} btn-sm" ${out?'disabled':''} data-add="${esc(p.id)}">${out?'Esgotado':Number(p.price||0)>0?'Adicionar':'Orçamento'}</button></div></div></article>`
}
function ordersView(){return `<main class="shell"><div class="page-title"><div><h1>Meus pedidos</h1><p>Acompanhe o andamento das suas encomendas.</p></div><button class="btn btn-soft btn-sm" data-action="sync-orders">Atualizar</button></div><div class="list">${state.orders.length?state.orders.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).map(o=>`<div class="row"><div class="row-main"><div class="avatar">${esc(o.items?.[0]?.emoji||'🎂')}</div><div><strong>${esc(o.id)}</strong><small>${fmtDate(o.deliveryDate)} ${esc(o.deliveryTime||'')} · ${esc(o.items?.[0]?.name||'Pedido')}</small></div></div><div class="row-right"><strong>${Number(o.total||0)>0?money(o.total):'Orçamento'}</strong><span class="status st-${esc(o.status)}">${statusLabel(o.status)}</span></div></div>`).join(''):'<div class="card empty"><div class="emoji">📋</div><h3>Nenhum pedido ainda</h3><p>Quando você finalizar uma encomenda, ela aparecerá aqui.</p><button class="btn btn-primary" data-tab="home">Ver catálogo</button></div>'}</div></main>`}
function contact(){const w=state.publicSettings.whatsapp||CFG.whatsapp||'';return `<main class="shell"><section class="contact-hero card"><h1>Fale com a Julih & Cia</h1><p>Dúvidas, alterações e pedidos especiais.</p><button class="btn btn-primary" data-action="whatsapp" ${w?'':'disabled'}>Abrir WhatsApp</button></section>${state.publicSettings.pixKey?`<div class="card" style="margin-top:14px"><h3>💠 Pix</h3><p style="color:var(--muted)">Chave informada pela confeitaria:</p><strong>${esc(state.publicSettings.pixKey)}</strong></div>`:''}</main>`}
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
if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js?v=5.0').catch(()=>{});
render(); sync(true); setInterval(()=>{sync(true)},60000);
})();