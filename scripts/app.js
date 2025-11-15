// Minimal shared Helpdesk logic (uses localStorage); mobile-first friendly
(function(){
  if(window.Helpdesk) return; // avoid reinit
  const STORAGE_KEY = 'helpdesk_data_v1';
  // Inisialisasi data default jika kosong
  const defaultData = {
      tickets:[
          // Contoh data awal
          {id:'t1', title:'Printer Lt. 5 Rusak', category:'Hardware', description:'Kertas macet', status:'open', ownerId:'user-1', ownerName:'User', assignee:null, comments:[], createdAt:'2025-11-10T10:00:00Z'},
          {id:'t2', title:'Tidak bisa akses WiFi', category:'Network', description:'Koneksi terbatas', status:'in_progress', ownerId:'user-1', ownerName:'User', assignee:'IT Support #1', comments:[], createdAt:'2025-11-11T11:00:00Z'}
      ], 
      users:[], 
      nextId:3
  };

  function load(){
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw){ 
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData)); 
        return JSON.parse(localStorage.getItem(STORAGE_KEY)); 
    }
    return JSON.parse(raw);
  }
  function save(data){ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

  const api = {
    _data: load(),
    getCurrentUserId(){
      // Untuk demo: gunakan id tetap per peran
      const role = localStorage.getItem('helpdesk_role');
      return role==='support' ? 'support-1' : (localStorage.getItem('demo_user_id') || 'user-1');
    },
    createTicket({title,category,description}){
      const d = load();
      const ticket = {
        id: 't'+d.nextId++,
        title, category, description, status: 'open', ownerId: api.getCurrentUserId(), ownerName: 'User', assignee: null,
        comments: [], createdAt: new Date().toISOString()
      };
      d.tickets.unshift(ticket); save(d); api._data = d; return ticket;
    },
    getTickets(filter){
      const d = load();
      let out = d.tickets.slice();
      if(filter && filter.owner) out = out.filter(t=>t.ownerId===filter.owner);
      return out;
    },
    getTicketById(id){ const d = load(); return d.tickets.find(t=>t.id===id) || null; },
    assignTicket(id,{assignee}){
      const d = load(); const t = d.tickets.find(x=>x.id===id); if(t){ t.assignee=assignee; t.status='in_progress'; save(d); }
    },
    updateTicket(id,patch){ const d=load(); const t=d.tickets.find(x=>x.id===id); if(!t) return; Object.assign(t,patch); save(d); },
    addComment(id,{text,author}){ const d=load(); const t=d.tickets.find(x=>x.id===id); if(!t) return; if(!t.comments) t.comments = []; t.comments.push({text,author,createdAt:new Date().toISOString()}); save(d); },
    searchTickets(q, status){ 
        const d=load(); 
        let s=d.tickets.slice(); 
        if(q) s = s.filter(t=> (t.title||'').toLowerCase().includes(q.toLowerCase()) || (t.ownerName||'').toLowerCase().includes(q.toLowerCase())); 
        if(status && status!=='all') s = s.filter(t=>t.status===status); 
        return s; 
    },
    generateReport({type='monthly', year=(new Date()).getFullYear()}){
      const d=load(); const tickets = d.tickets.filter(t=> new Date(t.createdAt).getFullYear()===year);
      if(type==='monthly'){
        const months = {}; for(let m=0;m<12;m++){ months[new Date(year,m,1).toLocaleString('id',{month:'long'})] = {total:0,open:0,in_progress:0,closed:0}; }
        tickets.forEach(t=>{ const name = new Date(t.createdAt).toLocaleString('id',{month:'long'}); months[name].total++; months[name][t.status] = (months[name][t.status]||0)+1; });
        return months;
      } else { // yearly
        const out = {total:0,open:0,in_progress:0,closed:0}; tickets.forEach(t=>{ out.total++; out[t.status]= (out[t.status]||0)+1; }); return out;
      }
    },
    exportCSV({year=(new Date()).getFullYear()}){
      const d = load(); const tickets = d.tickets.filter(t=> new Date(t.createdAt).getFullYear()===year);
      const rows = [['id','title','category','status','assignee','owner','createdAt']];
      tickets.forEach(t=> rows.push([t.id,escapeCSV(t.title),t.category,t.status,t.assignee||'',t.ownerName||'',t.createdAt]));
      return rows.map(r=>r.join(',')).join('\n');
    }
  };

  function escapeCSV(s){ if(!s) return ''; return '"'+String(s).replace(/"/g,'""')+'"'; }

  window.Helpdesk = api;
})();