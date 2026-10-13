/* Lógica pura; los importes se almacenan en centavos enteros. */
(function(root){
'use strict';
const categories=['Vivienda','Alimentos','Transporte','Salud','Servicios','Entretenimiento','Otros'];
const max=100000000000;
function cents(value){
 const s=String(value).trim();
 if(!/^\d{1,9}(\.\d{1,2})?$/.test(s)) throw Error('Escribe un importe positivo con máximo 2 decimales, usando punto.');
 const [a,b='']=s.split('.'); const n=Number(a)*100+Number(b.padEnd(2,'0'));
 if(n<=0||n>max) throw Error('El importe debe ser mayor a cero.'); return n;
}
function dateOK(s){ if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T12:00:00Z');return !isNaN(d)&&d.toISOString().slice(0,10)===s; }
function fresh(){return {version:1,currency:'USD',transactions:[],budgets:{},goal:0};}
function validate(s){
 if(!s||s.version!==1||!['USD','MXN'].includes(s.currency)||!Array.isArray(s.transactions)||s.transactions.length>50000)throw Error('Respaldo incompatible.');
 if(!s.budgets||typeof s.budgets!=='object'||Array.isArray(s.budgets)||!Number.isSafeInteger(s.goal)||s.goal<0||s.goal>max)throw Error('Configuración inválida.');
 const ids=new Set();
 const transactions=s.transactions.map(t=>{
 if(!t||typeof t.id!=='string'||!t.id||t.id.length>100||ids.has(t.id)||!dateOK(t.date)||!['income','expense'].includes(t.type)||!Number.isSafeInteger(t.amount)||t.amount<=0||t.amount>max||!(t.type==='income'?t.category==='Ingreso':categories.includes(t.category))||typeof t.note!=='string'||t.note.length>120)throw Error('Movimiento inválido en el respaldo.');
 ids.add(t.id);return {id:t.id,date:t.date,type:t.type,amount:t.amount,category:t.category,note:t.note};});
 const budgets={};for(const [k,v] of Object.entries(s.budgets)){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(k)||!Number.isSafeInteger(v)||v<0||v>max)throw Error('Presupuesto inválido.');budgets[k]=v;}
 return {version:1,currency:s.currency,transactions,budgets,goal:s.goal};
}
function summary(s,month){const list=s.transactions.filter(t=>t.date.startsWith(month));const income=list.filter(t=>t.type==='income').reduce((a,t)=>a+t.amount,0);const expense=list.filter(t=>t.type==='expense').reduce((a,t)=>a+t.amount,0);const byCategory=categories.map(category=>({category,amount:list.filter(t=>t.type==='expense'&&t.category===category).reduce((a,t)=>a+t.amount,0)})).filter(x=>x.amount>0).sort((a,b)=>b.amount-a.amount);return {list,income,expense,balance:income-expense,byCategory};}
const api={categories,cents,dateOK,fresh,validate,summary};if(typeof module!=='undefined')module.exports=api;else root.Finance=api;
})(globalThis);
