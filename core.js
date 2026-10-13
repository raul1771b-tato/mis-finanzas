/* Lógica pura; los importes se almacenan en centavos enteros. */
(function(root){
'use strict';
const categories=['Vivienda','Alimentos','Transporte','Salud','Servicios','Entretenimiento','Otros'];
const incomeCategories=['Sueldo','Negocio','Ventas','Bonos','Otros ingresos','Ingreso'];
const max=100000000000;
function cents(value){
 const s=String(value).trim();
 if(!/^\d{1,9}(\.\d{1,2})?$/.test(s)) throw Error('Escribe un importe positivo con máximo 2 decimales, usando punto.');
 const [a,b='']=s.split('.'); const n=Number(a)*100+Number(b.padEnd(2,'0'));
 if(n<=0||n>max) throw Error('El importe debe ser mayor a cero.'); return n;
}
function dateOK(s){ if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T12:00:00Z');return !isNaN(d)&&d.toISOString().slice(0,10)===s; }
function fresh(){return {version:1,currency:'USD',transactions:[],budgets:{},goal:0,initialBalance:0};}
function validate(s){
 if(!s||s.version!==1||!['USD','MXN'].includes(s.currency)||!Array.isArray(s.transactions)||s.transactions.length>50000)throw Error('Respaldo incompatible.');
 if(!s.budgets||typeof s.budgets!=='object'||Array.isArray(s.budgets)||!Number.isSafeInteger(s.goal)||s.goal<0||s.goal>max)throw Error('Configuración inválida.');
 const initialBalance=s.initialBalance===undefined?0:s.initialBalance;
 if(!Number.isSafeInteger(initialBalance)||Math.abs(initialBalance)>max)throw Error('Saldo inicial inválido.');
 const ids=new Set();
 const transactions=s.transactions.map(t=>{
 if(!t||typeof t.id!=='string'||!t.id||t.id.length>100||ids.has(t.id)||!dateOK(t.date)||!['income','expense'].includes(t.type)||!Number.isSafeInteger(t.amount)||t.amount<=0||t.amount>max||!(t.type==='income'?incomeCategories.includes(t.category):categories.includes(t.category))||typeof t.note!=='string'||t.note.length>120)throw Error('Movimiento inválido en el respaldo.');
 ids.add(t.id);return {id:t.id,date:t.date,type:t.type,amount:t.amount,category:t.category,note:t.note};});
 const budgets={};for(const [k,v] of Object.entries(s.budgets)){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(k)||!Number.isSafeInteger(v)||v<0||v>max)throw Error('Presupuesto inválido.');budgets[k]=v;}
 return {version:1,currency:s.currency,transactions,budgets,goal:s.goal,initialBalance};
}
function range(mode,date){
 if(!dateOK(date))throw Error('Fecha inválida.');
 const d=new Date(date+'T12:00:00Z');let start=date,end=date;
 if(mode==='week'){const offset=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-offset);start=d.toISOString().slice(0,10);d.setUTCDate(d.getUTCDate()+6);end=d.toISOString().slice(0,10);}
 else if(mode==='month'){start=date.slice(0,7)+'-01';d.setUTCMonth(d.getUTCMonth()+1,0);end=d.toISOString().slice(0,10);}
 else if(mode!=='day')throw Error('Periodo inválido.');
 return {start,end};
}
function shift(mode,date,step){const d=new Date(date+'T12:00:00Z');if(mode==='month'){d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+step);}else d.setUTCDate(d.getUTCDate()+step*(mode==='week'?7:1));return d.toISOString().slice(0,10);}
function summary(s,period,end){
 const start=end?period:period+'-01';end=end||range('month',start).end;
 const list=s.transactions.filter(t=>t.date>=start&&t.date<=end);
 const income=list.filter(t=>t.type==='income').reduce((a,t)=>a+t.amount,0),expense=list.filter(t=>t.type==='expense').reduce((a,t)=>a+t.amount,0);
 const byCategory=categories.map(category=>({category,amount:list.filter(t=>t.type==='expense'&&t.category===category).reduce((a,t)=>a+t.amount,0)})).filter(x=>x.amount>0).sort((a,b)=>b.amount-a.amount);
 const byIncomeCategory=incomeCategories.map(category=>({category,amount:list.filter(t=>t.type==='income'&&t.category===category).reduce((a,t)=>a+t.amount,0)})).filter(x=>x.amount>0).sort((a,b)=>b.amount-a.amount);
 const opening=(s.initialBalance||0)+s.transactions.filter(t=>t.date<start).reduce((a,t)=>a+(t.type==='income'?t.amount:-t.amount),0);
 const grouped={};for(const t of list){if(!grouped[t.date])grouped[t.date]={date:t.date,income:0,expense:0};grouped[t.date][t.type==='income'?'income':'expense']+=t.amount;}
 let balance=opening;const days=[];for(const day of Object.values(grouped).sort((a,b)=>a.date.localeCompare(b.date))){balance+=day.income-day.expense;days.push({...day,net:day.income-day.expense,closing:balance});}
 return {list,income,expense,balance:income-expense,opening,closing:opening+income-expense,byCategory,byIncomeCategory,days};
}
const api={categories,incomeCategories,cents,dateOK,fresh,validate,summary,range,shift};if(typeof module!=='undefined')module.exports=api;else root.Finance=api;
})(globalThis);
