/* Lógica pura; los importes se almacenan en centavos enteros. */
(function(root){
'use strict';
const W=typeof module!=='undefined'?require('./wealth-core'):root.Wealth;
const categories=['Pago de deuda','Vivienda','Alimentos','Transporte','Salud','Servicios','Entretenimiento','Otros'];
const incomeCategories=['Sueldo','Negocio','Ventas','Bonos','Otros ingresos','Ingreso'];
const max=100000000000;
function cents(value){
 const s=String(value).trim();
 if(!/^\d{1,9}(\.\d{1,2})?$/.test(s)) throw Error('Escribe un importe positivo con máximo 2 decimales, usando punto.');
 const [a,b='']=s.split('.'); const n=Number(a)*100+Number(b.padEnd(2,'0'));
 if(n<=0||n>max) throw Error('El importe debe ser mayor a cero.'); return n;
}
function dateOK(s){ if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T12:00:00Z');return !isNaN(d)&&d.toISOString().slice(0,10)===s; }
function fresh(){return {version:3,accounts:[{id:'usd',name:'Cuenta USD',currency:'USD',initialBalance:0},{id:'mxn',name:'Cuenta MXN',currency:'MXN',initialBalance:0}],transactions:[],plans:{USD:{budgets:{},goal:0},MXN:{budgets:{},goal:0}},wealth:W.fresh()};}
function amountOK(n,negative=false){return Number.isSafeInteger(n)&&Math.abs(n)<=max&&(negative||n>=0);}
function validate(s){
 if(s&&s.version===1){
  if(!['USD','MXN'].includes(s.currency))throw Error('Moneda inválida.');
  const plans={USD:{budgets:{},goal:0},MXN:{budgets:{},goal:0}};plans[s.currency]={budgets:s.budgets,goal:s.goal};
  s={version:3,accounts:[{id:'legacy',name:'Cuenta principal '+s.currency,currency:s.currency,initialBalance:s.initialBalance===undefined?0:s.initialBalance}],transactions:Array.isArray(s.transactions)?s.transactions.map(t=>({...t,accountId:'legacy'})):s.transactions,plans};
 }
 if(s&&s.version===2)s={...s,version:3};
 if(!s||s.version!==3||!Array.isArray(s.accounts)||!s.accounts.length||s.accounts.length>100||!Array.isArray(s.transactions)||s.transactions.length>50000)throw Error('Respaldo incompatible.');
 const ids=new Set();const accounts=s.accounts.map(x=>{if(!x||typeof x.id!=='string'||!x.id||x.id.length>100||x.id==='all'||ids.has(x.id)||typeof x.name!=='string'||!x.name.trim()||x.name.length>50||!['USD','MXN'].includes(x.currency)||!amountOK(x.initialBalance,true))throw Error('Cuenta inválida.');ids.add(x.id);return {id:x.id,name:x.name.trim(),currency:x.currency,initialBalance:x.initialBalance};});
 const txIds=new Set();const transactions=s.transactions.map(t=>{
  if(!t||typeof t.id!=='string'||!t.id||t.id.length>100||txIds.has(t.id)||!ids.has(t.accountId)||!dateOK(t.date)||!['income','expense'].includes(t.type)||!amountOK(t.amount)||t.amount===0||!(t.type==='income'?incomeCategories.includes(t.category):categories.includes(t.category))||typeof t.note!=='string'||t.note.length>120)throw Error('Movimiento inválido en el respaldo.');
  txIds.add(t.id);return {id:t.id,accountId:t.accountId,date:t.date,type:t.type,amount:t.amount,category:t.category,note:t.note,...(t.debtPaymentId?{debtPaymentId:t.debtPaymentId}:{})};
 });
 const plans={};for(const currency of ['USD','MXN']){const v=s.plans&&s.plans[currency];if(!v||!v.budgets||typeof v.budgets!=='object'||Array.isArray(v.budgets)||!amountOK(v.goal))throw Error('Plan inválido.');const budgets={};for(const [month,n] of Object.entries(v.budgets)){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||!amountOK(n))throw Error('Presupuesto inválido.');budgets[month]=n;}plans[currency]={budgets,goal:v.goal};}
 const wealth=W.validate(s.wealth===undefined?W.fresh():s.wealth,accounts);
 const linked=new Set();for(const p of wealth.payments.filter(p=>p.accountId!==null)){const match=transactions.filter(t=>t.debtPaymentId===p.id);if(match.length!==1||match[0].type!=='expense'||match[0].amount!==p.principal+p.interest+p.fees||match[0].accountId!==p.accountId||match[0].date!==p.date||match[0].category!=='Pago de deuda')throw Error('Pago y salida de cuenta no coinciden.');linked.add(p.id);}
 for(const t of transactions){if(t.debtPaymentId&&!linked.has(t.debtPaymentId))throw Error('Movimiento de deuda sin pago válido.');}
 return {version:3,accounts,transactions,plans,wealth};
}
function migrate(s){return validate(s);}
function range(mode,date){
 if(!dateOK(date))throw Error('Fecha inválida.');
 const d=new Date(date+'T12:00:00Z');let start=date,end=date;
 if(mode==='week'){const offset=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-offset);start=d.toISOString().slice(0,10);d.setUTCDate(d.getUTCDate()+6);end=d.toISOString().slice(0,10);}
 else if(mode==='month'){start=date.slice(0,7)+'-01';d.setUTCMonth(d.getUTCMonth()+1,0);end=d.toISOString().slice(0,10);}
 else if(mode!=='day')throw Error('Periodo inválido.');
 return {start,end};
}
function shift(mode,date,step){const d=new Date(date+'T12:00:00Z');if(mode==='month'){d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+step);}else d.setUTCDate(d.getUTCDate()+step*(mode==='week'?7:1));return d.toISOString().slice(0,10);}
function summary(s,period,end,currency="USD",accountId="all"){
 s=migrate(s);const accounts=s.accounts.filter(x=>x.currency===currency&&(accountId==="all"||x.id===accountId));const ids=new Set(accounts.map(x=>x.id));const transactions=s.transactions.filter(t=>ids.has(t.accountId));
 const start=end?period:period+'-01';end=end||range('month',start).end;
 const list=transactions.filter(t=>t.date>=start&&t.date<=end);
 const income=list.filter(t=>t.type==='income').reduce((a,t)=>a+t.amount,0),expense=list.filter(t=>t.type==='expense').reduce((a,t)=>a+t.amount,0);
 const byCategory=categories.map(category=>({category,amount:list.filter(t=>t.type==='expense'&&t.category===category).reduce((a,t)=>a+t.amount,0)})).filter(x=>x.amount>0).sort((a,b)=>b.amount-a.amount);
 const byIncomeCategory=incomeCategories.map(category=>({category,amount:list.filter(t=>t.type==='income'&&t.category===category).reduce((a,t)=>a+t.amount,0)})).filter(x=>x.amount>0).sort((a,b)=>b.amount-a.amount);
 const opening=accounts.reduce((a,x)=>a+x.initialBalance,0)+transactions.filter(t=>t.date<start).reduce((a,t)=>a+(t.type==='income'?t.amount:-t.amount),0);
 const grouped={};for(const t of list){if(!grouped[t.date])grouped[t.date]={date:t.date,income:0,expense:0};grouped[t.date][t.type==='income'?'income':'expense']+=t.amount;}
 let balance=opening;const days=[];for(const day of Object.values(grouped).sort((a,b)=>a.date.localeCompare(b.date))){balance+=day.income-day.expense;days.push({...day,net:day.income-day.expense,closing:balance});}
 return {list,income,expense,balance:income-expense,opening,closing:opening+income-expense,byCategory,byIncomeCategory,days};
}
const api={categories,incomeCategories,cents,dateOK,fresh,validate:migrate,summary,range,shift};if(typeof module!=='undefined')module.exports=api;else root.Finance=api;
})(globalThis);
