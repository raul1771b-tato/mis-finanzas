/* Cada opción abre una pantalla propia dentro de la app; Atrás conserva la navegación. */
'use strict';
const screenRoot=$('overview'),screenNames=['balance','capture','movements','accounts','patrimony','charts'],screens={};
const intro=screenRoot.querySelector('.intro'),filters=intro.querySelector('.period-controls');
const filterBar=node('section',undefined,'panel shared-filters');filterBar.id='filter-bar';filterBar.append(filters,$('range-label'));screenRoot.prepend($('status'),$('storage-alert'),filterBar);
for(const name of screenNames){const s=node('section',undefined,'app-screen');s.dataset.screen=name;s.id='screen-'+name;s.hidden=true;screens[name]=s;screenRoot.append(s);}
const balanceScreen=screens.balance;intro.querySelector('h1').textContent='Balance de tus cuentas';balanceScreen.append(intro);for(const e of [...screenRoot.querySelectorAll('.currency-totals,.stats,.carry'),$('plan-panel'),$('daily-panel')])balanceScreen.append(e);
screens.capture.append($('capture'));screens.movements.append($('category-panel'),$('history'));screens.accounts.append($('accounts'));screens.patrimony.append($('wealth'));screens.charts.append($('charts'));
const footer=screenRoot.querySelector('footer');screenRoot.append(footer);
// Quitar únicamente contenedores estructurales vacíos, nunca formularios o datos.
for(const e of [...screenRoot.children])if(!e.classList.contains('app-screen')&&![filterBar,footer,$('status'),$('storage-alert')].includes(e))e.remove();
const nav=document.querySelector('.mobile-nav');nav.setAttribute('aria-label','Pantallas de la aplicación');
function showScreen(name){if(!screenNames.includes(name))name='balance';for(const [key,s] of Object.entries(screens))s.hidden=key!==name;filterBar.hidden=!['balance','movements'].includes(name);for(const link of nav.querySelectorAll('a')){const active=link.hash==='#'+name;link.classList.toggle('active',active);if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');}document.title='Mis Finanzas · '+({balance:'Balance',capture:'Captura',movements:'Movimientos',accounts:'Cuentas',patrimony:'Patrimonio',charts:'Gráficos'}[name]);if(name==='charts'&&window.renderCharts)window.renderCharts();window.scrollTo(0,0);const heading=screens[name].querySelector('h1,h2');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}}
function navigate(name){if(!screenNames.includes(name))return;if(location.hash==='#'+name)showScreen(name);else location.hash=name;}
window.navigate=navigate;nav.addEventListener('click',e=>{const link=e.target.closest('a');if(link){e.preventDefault();navigate(link.hash.slice(1));}});window.addEventListener('hashchange',()=>showScreen(location.hash.slice(1)));showScreen(location.hash.slice(1));
