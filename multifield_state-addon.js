
/*! MultiField State Add-on (non-invasive) v1.0 */
(function(){
  const FSM = window.FieldStateManager = window.FieldStateManager || {};
  const state = FSM._state = FSM._state || new Map(); // index -> plan
  let currentIndex = 0;

  function qs(sel, root=document){ return root.querySelector(sel); }
  function qsa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

  function getFieldEl(){
    return document.getElementById('soccerField') ||
           qs('[data-soccer-field="true"]') ||
           qs('#fieldCanvas, .soccer-field, .soccerField');
  }

  function snapshot(){
    const plan = { version:'addon-1.0', ts: Date.now() };
    // Field type
    plan.fieldType = qs('input[name="field"]:checked')?.value || 'full';
    // Resource counters
    plan.resources = {};
    qsa('input[type="number"]').forEach(el => { if (el.id) plan.resources[el.id] = parseInt(el.value)||0; });
    // Special equipment
    plan.specialEquipment = [];
    const max = window.specialEquipmentCount || 0;
    for (let i=1;i<=max;i++){
      const c = qs('#specialCount'+i), n = qs('#specialName'+i);
      if (c && n && n.value.trim()) plan.specialEquipment.push({count: parseInt(c.value)||0, name: n.value.trim()});
    }
    // Field layers
    const field = getFieldEl();

    // Placed items (icons)
    plan.placedItems = [];
    if (Array.isArray(window.placedItems)){
      window.placedItems.forEach(p => {
        if (!p || !p.element) return;
        plan.placedItems.push({
          type: p.type, id: p.id,
          x: parseInt(p.element.style.left)||0, y: parseInt(p.element.style.top)||0,
          rotation: p.rotation||0,
          size: p.size || {width: p.element.offsetWidth, height: p.element.offsetHeight}
        });
      });
    } else if (field){
      qsa('.absolute.cursor-move, [data-type]', field).forEach(div => {
        const t = div.getAttribute('data-type') || div.dataset.type || (div.textContent||'').trim();
        let type = 'unknown';
        if (t==='⚽' || /ball/i.test(t)) type='ball';
        else if (t==='🥅' || /goal|tor/i.test(t)) type='goal';
        else if (t==='🔶' || /cone|hütchen|huetchen/i.test(t)) type='cone';
        plan.placedItems.push({ type, id: div.getAttribute('data-id')||'', x: parseInt(div.style.left)||0, y: parseInt(div.style.top)||0,
                                rotation: 0, size: {width: div.offsetWidth||30, height: div.offsetHeight||30} });
      });
    }

    // Texts (SVG)
    plan.texts = [];
    const textLayer = qs('#textLayer, .textLayer', field||document);
    if (textLayer){
      qsa('text', textLayer).forEach(t => {
        plan.texts.push({
          text: t.textContent, x: parseFloat(t.getAttribute('x'))||0, y: parseFloat(t.getAttribute('y'))||0,
          size: parseFloat(t.getAttribute('font-size'))||16, color: t.getAttribute('fill')||'#111'
        });
      });
    }

    // Arrows (global)
    plan.arrows = Array.isArray(window.arrows) ? window.arrows.map(a => ({start:a.start, end:a.end, style:a.style, color:a.color})) : [];

    // Shapes (SVG)
    plan.shapes = [];
    const shapeLayer = qs('#shapeLayer, .shapeLayer', field||document);
    if (shapeLayer){
      qsa('line', shapeLayer).forEach(l => plan.shapes.push({kind:'line', x1:+l.getAttribute('x1'), y1:+l.getAttribute('y1'), x2:+l.getAttribute('x2'), y2:+l.getAttribute('y2')}));
      qsa('rect', shapeLayer).forEach(r => plan.shapes.push({kind:'rect', x:+r.getAttribute('x'), y:+r.getAttribute('y'), w:+r.getAttribute('width'), h:+r.getAttribute('height')}));
      qsa('path', shapeLayer).forEach(p => plan.shapes.push({kind:'path', d:p.getAttribute('d')}));
    }

    // Comment
    plan.trainingComment = qs('#trainingComment')?.value || '';
    return plan;
  }

  function clearFieldSafe(){
    if (typeof window.clearField === 'function') {
      window.clearField();
      return;
    }
    const field = getFieldEl(); if (!field) return;
    qsa('#shapeLayer, .shapeLayer, #textLayer, .textLayer', field).forEach(layer => layer.innerHTML='');
    qsa('.absolute.cursor-move, [data-type]', field).forEach(div => div.remove());
  }

  function placeIconDOM(field, d){
    const el = document.createElement('div');
    el.className = 'absolute cursor-move select-none';
    el.style.left = (d.x)+'px'; el.style.top = (d.y)+'px'; el.style.pointerEvents='auto'; el.style.zIndex='20';
    el.dataset.type = d.type;
    const icon = d.type==='ball'?'⚽':(d.type==='goal'?'🥅':'🔶');
    el.innerHTML = '<span class="icon-badge">'+icon+'</span>';
    field.appendChild(el);
  }

  function restore(plan){
    if (!plan) return;
    clearFieldSafe();

    // Field type
    if (plan.fieldType){
      const radio = qs('input[name="field"][value="'+plan.fieldType+'"]');
      if (radio){ radio.checked = true; if (typeof window.updateField==='function') window.updateField(); }
    }

    // Resources
    if (plan.resources){
      Object.entries(plan.resources).forEach(([id,val]) => { const el=document.getElementById(id); if (el) el.value = val; });
      if (typeof window.updateEquipmentSidebar==='function') window.updateEquipmentSidebar();
    }

    // Special equipment
    if (Array.isArray(plan.specialEquipment)){
      plan.specialEquipment.forEach(eq => {
        if (typeof window.addSpecialEquipment==='function') window.addSpecialEquipment();
        const idx = (window.specialEquipmentCount||1);
        const c = document.getElementById('specialCount'+idx);
        const n = document.getElementById('specialName'+idx);
        if (c) c.value = eq.count;
        if (n) n.value = eq.name;
      });
    }

    // Items
    const field = getFieldEl();
    if (Array.isArray(plan.placedItems)){
      plan.placedItems.forEach(d => {
        if (typeof window.placeItemOnField==='function' && typeof window.getItemIcon==='function'){
          const size = d.size || {width:30,height:30};
          const cx = (d.x||0) + size.width/2;
          const cy = (d.y||0) + size.height/2;
          const item = {type: d.type, id: d.id, icon: window.getItemIcon(d.type)};
          window.placeItemOnField(item, cx, cy);
        } else if (field){
          placeIconDOM(field, d);
        }
      });
    }

    // Texts
    if (Array.isArray(plan.texts)){
      plan.texts.forEach(t => {
        if (typeof window.placeTextOnField==='function'){
          window.placeTextOnField(t.text, t.x, t.y);
          const layer = document.getElementById('textLayer') || (field && qs('#textLayer, .textLayer', field));
          if (layer && layer.lastElementChild && layer.lastElementChild.nodeName.toLowerCase()==='text'){
            const node = layer.lastElementChild;
            if (t.size)  node.setAttribute('font-size', t.size);
            if (t.color) node.setAttribute('fill', t.color);
          }
        } else if (field){
          // Simple text fallback as SVG
          let layer = document.getElementById('textLayer') || qs('.textLayer', field);
          if (!layer){
            layer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            layer.setAttribute('id','textLayer'); layer.setAttribute('width', field.clientWidth||800); layer.setAttribute('height', field.clientHeight||520);
            layer.style.position='absolute'; layer.style.left='0'; layer.style.top='0'; layer.style.pointerEvents='none';
            field.appendChild(layer);
          }
          const node = document.createElementNS('http://www.w3.org/2000/svg','text');
          node.setAttribute('x', t.x); node.setAttribute('y', t.y);
          node.setAttribute('font-size', t.size||16); node.setAttribute('font-weight','600');
          node.setAttribute('fill', t.color||'#111'); node.setAttribute('text-anchor','middle'); node.setAttribute('dominant-baseline','middle');
          node.textContent = t.text; layer.appendChild(node);
        }
      });
    }

    // Arrows (best-effort)
    if (Array.isArray(plan.arrows) && typeof window.createArrow==='function'){
      plan.arrows.forEach(a => {
        const ls = document.getElementById('arrowLineStyle'); if (ls && a.style) ls.value = a.style;
        const ac = document.getElementById('arrowColor');     if (ac && a.color) ac.value = a.color;
        window.createArrow(a.start, a.end);
      });
    }

    // Comment
    const cmt = document.getElementById('trainingComment'); if (cmt) cmt.value = plan.trainingComment || '';
  }

  // Public API
  FSM.commit = function(reason){ try{ state.set(currentIndex, snapshot()); }catch(e){ console.warn('FSM.commit', reason, e); } };
  FSM.get = function(i=currentIndex){ return state.get(i); };
  FSM.set = function(i, plan){ state.set(i, plan); };
  FSM.switchTo = function(i){
    FSM.commit('switch');
    currentIndex = i;
    const plan = state.get(currentIndex) || snapshot(); // first visit -> snapshot current as baseline
    state.set(currentIndex, plan);
    restore(plan);
  };

  // Auto-wire to fieldSelect if present
  window.addEventListener('DOMContentLoaded', function(){
    const sel = document.getElementById('fieldSelect');
    if (!sel) return;
    // Initialize state with current DOM
    state.set(0, snapshot());
    currentIndex = parseInt(sel.value||'0',10) || 0;
    sel.addEventListener('change', function(e){
      const idx = parseInt(e.target.value||'0',10) || 0;
      FSM.switchTo(idx);
    });
  });

  // Optional: commit on unload
  window.addEventListener('beforeunload', function(){ FSM.commit('beforeunload'); });
})();
