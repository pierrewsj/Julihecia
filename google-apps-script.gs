/**
 * Julih & Cia — Backend Google Sheets
 * 1) Crie uma Planilha Google.
 * 2) Extensões > Apps Script.
 * 3) Cole este arquivo e salve.
 * 4) Execute setupJulihCia() uma vez.
 * 5) Implantar > Nova implantação > Aplicativo da Web.
 *    Executar como: você
 *    Quem pode acessar: qualquer pessoa com o link
 * 6) Copie a URL /exec e informe no aplicativo.
 */

const SHEETS = {
  PRODUCTS: 'Produtos',
  STOCK: 'Estoque',
  ORDERS: 'Pedidos',
  EXPENSES: 'Despesas'
};

const HEADERS = {
  Produtos: ['id','name','category','price','emoji','active','description','updatedAt'],
  Estoque: ['id','name','unit','qty','min','cost','updatedAt'],
  Pedidos: ['id','createdAt','customerName','phone','items','deliveryDate','deliveryTime','deliveryMode','address','notes','paymentMethod','total','paid','status','internalNotes','updatedAt'],
  Despesas: ['id','date','category','description','amount','paymentMethod','createdAt','updatedAt']
};

function setupJulihCia(){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(HEADERS).forEach(name => {
    let sh = ss.getSheetByName(name);
    if(!sh) sh = ss.insertSheet(name);
    const headers = HEADERS[name];
    if(sh.getLastRow() === 0){
      sh.getRange(1,1,1,headers.length).setValues([headers]);
      sh.setFrozenRows(1);
      sh.getRange(1,1,1,headers.length).setFontWeight('bold').setBackground('#f9dce3');
      sh.autoResizeColumns(1, headers.length);
    }
  });

  // Catálogo e estoque inicial. Você pode alterar tudo depois pelo aplicativo.
  const prod = ss.getSheetByName(SHEETS.PRODUCTS);
  if(prod.getLastRow() < 2){
    [
      {id:'P1',name:'Bolo de Chocolate',category:'Bolos',price:90,emoji:'🎂',active:true,description:'Bolo artesanal com opções de recheio.'},
      {id:'P2',name:'Bolo Personalizado',category:'Bolos',price:150,emoji:'🎂',active:true,description:'Personalize tema, tamanho e acabamento.'},
      {id:'P3',name:'Brigadeiro Gourmet',category:'Doces',price:3.5,emoji:'🍫',active:true,description:'Unidade. Consulte sabores disponíveis.'},
      {id:'P4',name:'Cupcake Decorado',category:'Doces',price:8,emoji:'🧁',active:true,description:'Cupcake artesanal decorado.'},
      {id:'P5',name:'Kit Festa P',category:'Kits',price:120,emoji:'🎁',active:true,description:'Kit compacto para comemorações.'},
      {id:'P6',name:'Caixinha Presente',category:'Kits',price:45,emoji:'🎀',active:true,description:'Seleção de doces em embalagem presenteável.'},
      {id:'P7',name:'Fatia Especial',category:'Pronta entrega',price:14,emoji:'🍰',active:true,description:'Sabores do dia, enquanto durar o estoque.'},
      {id:'P8',name:'Pedido Personalizado',category:'Personalizados',price:0,emoji:'✨',active:true,description:'Envie os detalhes para receber orçamento.'}
    ].forEach(x => upsert_(SHEETS.PRODUCTS, x));
  }

  const stock = ss.getSheetByName(SHEETS.STOCK);
  if(stock.getLastRow() < 2){
    [
      {id:'S1',name:'Leite condensado',unit:'un',qty:18,min:10,cost:6.99},
      {id:'S2',name:'Creme de leite',unit:'un',qty:14,min:8,cost:3.69},
      {id:'S3',name:'Chocolate',unit:'kg',qty:3.2,min:2,cost:38.9},
      {id:'S4',name:'Farinha de trigo',unit:'kg',qty:5,min:3,cost:5.8},
      {id:'S5',name:'Açúcar',unit:'kg',qty:2.2,min:3,cost:4.5},
      {id:'S6',name:'Caixa para bolo',unit:'un',qty:9,min:10,cost:4.2}
    ].forEach(x => upsert_(SHEETS.STOCK, x));
  }

  return 'Estrutura criada com sucesso.';
}

function doGet(e){
  return json_({ok:true, message:'Julih & Cia API online', action:(e && e.parameter && e.parameter.action) || 'ping'});
}

function doPost(e){
  try{
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const action = body.action || 'ping';
    const data = body.data || {};
    switch(action){
      case 'ping': return json_({ok:true, message:'pong'});
      case 'bootstrap': return json_({ok:true, products:readAll_(SHEETS.PRODUCTS), stock:readAll_(SHEETS.STOCK), orders:readAll_(SHEETS.ORDERS), expenses:readAll_(SHEETS.EXPENSES)});
      case 'createOrder': upsert_(SHEETS.ORDERS, normalizeOrder_(data)); return json_({ok:true});
      case 'updateOrder': upsert_(SHEETS.ORDERS, normalizeOrder_(data)); return json_({ok:true});
      case 'createExpense': upsert_(SHEETS.EXPENSES, data); return json_({ok:true});
      case 'upsertStock': upsert_(SHEETS.STOCK, data); return json_({ok:true});
      case 'upsertProduct': upsert_(SHEETS.PRODUCTS, data); return json_({ok:true});
      default: return json_({ok:false,error:'Ação desconhecida: '+action});
    }
  }catch(err){
    return json_({ok:false,error:String(err && err.message || err)});
  }
}

function normalizeOrder_(o){
  const copy = Object.assign({}, o);
  copy.items = typeof copy.items === 'string' ? copy.items : JSON.stringify(copy.items || []);
  return copy;
}

function readAll_(sheetName){
  const sh = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if(!sh || sh.getLastRow() < 2) return [];
  const values = sh.getDataRange().getValues();
  const headers = values.shift().map(String);
  return values.filter(row => row.some(v => v !== '')).map(row => {
    const obj = {};
    headers.forEach((h,i)=> obj[h] = row[i]);
    return obj;
  });
}

function upsert_(sheetName, data){
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(sheetName);
  if(!sh) throw new Error('Aba não encontrada: '+sheetName+'. Execute setupJulihCia().');
  const headers = HEADERS[sheetName];
  if(!headers) throw new Error('Cabeçalhos não configurados para '+sheetName);
  const record = Object.assign({}, data, {updatedAt:new Date().toISOString()});
  const id = String(record.id || '').trim();
  if(!id) throw new Error('Registro sem id.');

  let targetRow = -1;
  if(sh.getLastRow() >= 2){
    const ids = sh.getRange(2,1,sh.getLastRow()-1,1).getValues().flat().map(String);
    const idx = ids.indexOf(id);
    if(idx >= 0) targetRow = idx + 2;
  }
  const row = headers.map(h => record[h] === undefined ? '' : record[h]);
  if(targetRow > 0) sh.getRange(targetRow,1,1,headers.length).setValues([row]);
  else sh.appendRow(row);
}

function json_(obj){
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
