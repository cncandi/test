
(function(){
  const KEY='soccer.app.user';
  const VALID_PASSWORDS = [
    "F101mill55","F102mill55","F103mill55","F104mill55","F105mill55",
    "F106mill55","F107mill55","F108mill55","F109mill55","F110mill55",
    "F111mill55","F112mill55","F113mill55","F114mill55","F115mill55",
    "F116mill55","F117mill55","F118mill55","F119mill55","F120mill55"
  ];

  function getUser(){ try{ return JSON.parse(localStorage.getItem(KEY)||'null'); }catch(e){ return null; } }
  function setUser(u){ localStorage.setItem(KEY, JSON.stringify(u||{})); }
  function clearUser(){ localStorage.removeItem(KEY); }
  function isLoggedIn(){ const u=getUser(); return !!(u && u.name && u.ok===true); }
  function logout(){ clearUser(); location.href='index.html'; }

  // Public API for login page
  window.AppShell = {
    getUser, setUser, isLoggedIn, logout,
    tryLogin: function(name, pwd){
      if (!VALID_PASSWORDS.includes((pwd||"").trim())) return {ok:false};
      setUser({ name, ok:true });
      return {ok:true};
    }
  };

  function renderHeader(){
    if(!isLoggedIn()) return; // Header nur nach Login anzeigen
    if(document.querySelector('#appTopbar')) return;
    const el = document.createElement('header');
    el.id='appTopbar';
    el.className='app-header app-gradient text-white';
    el.innerHTML = `
      <div class="container-narrow flex items-center justify-between py-3 gap-3">
        <div class="flex items-center gap-3">
          <div class="text-sm opacity-90 leading-none">Angemeldet als <span data-user-name>Coach</span></div>
        </div>
        <nav class="link-bar flex items-center gap-1">
          <a href="index.html">🏠 Start</a>
          <a href="https://cnc-technik.de/soccer/training.html" target="_blank" rel="noopener">🏋️ Trainingbereich</a>
          <a href="https://cnc-technik.de/soccer/spieltag.html" target="_blank" rel="noopener">📅 Spieltag organisieren</a>
          <button id="btnLogout" class="ml-2 app-btn bg-white/20 hover:bg-white/30 text-white">Abmelden</button>
        </nav>
      </div>`;
    document.body.prepend(el);
    const u=getUser();
    if(u){ document.querySelectorAll('[data-user-name]').forEach(n=>n.textContent=u.name); }
    document.getElementById('btnLogout').addEventListener('click', logout);
  }

  function guard(){
    const page = document.body.dataset.page || '';
    if(page==='index'){ return; } // Login-Seite frei
    if(!isLoggedIn()){ location.href='index.html'; }
  }

  document.addEventListener('DOMContentLoaded', ()=>{ renderHeader(); guard(); });
})();
