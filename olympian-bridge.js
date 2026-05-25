// ══════════════════════════════════════════════
// OLYMPIAN BRIDGE v1.1
// Shared module for all Olympian gods
// Connects to KairosDB + GaiaDB for workflow
// Added: queryGaiaDB(), queryKairosDB()
// ══════════════════════════════════════════════

var OlympianBridge = (function() {
  'use strict';

  var KAIROS_URL = 'https://kzcucjcyxybypncbdbws.supabase.co';
  var KAIROS_KEY = 'sb_publishable_saeUHGocDah-T2_709M6Fg_g26JtLXw';
  var GAIA_URL = 'https://nbdvavzqvxrlxhsbrluz.supabase.co';
  var GAIA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5iZHZhdnpxdnhxbHhoc2JybHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxMjcyNDQsImV4cCI6MjA2MDcwMzI0NH0.8aw3sD2nXJFmSXJB_GrRhgjCpybKzycYNpTk0iLyYr4';

  var godName = '', godGlyph = '';
  var supabase = null, gaiaClient = null, isReady = false;
  var activeTelos = null, activeTasks = [];
  var cacheExpiry = 30000, lastTelosFetch = 0, lastTasksFetch = 0;

  var domainKeywords = {
    'Artemis':    ['hunt','search','find','track','card','data','memory','retrieval'],
    'Demeter':    ['garden','plant','grow','harvest','seed','soil','nature','green'],
    'Hephaestus': ['build','forge','code','tool','fix','make','craft','html','script'],
    'Poseidon':   ['research','deep','knowledge','retrieve','ocean','data','search'],
    'Hermes':     ['cache','speed','message','route','quick','fast','deliver'],
    'Apollo':     ['image','generate','art','light','synthesis','create','visual'],
    'Athena':     ['wisdom','strategy','think','analyze','learn','memory','knowledge'],
    'Zeus':       ['rule','judge','command','authority','law','order','king'],
    'Aphrodite':  ['beauty','love','charm','inspire','attract','desire','create'],
    'Hera':       ['organize','task','workflow','telos','system','structure'],
    'Persephone': ['underworld','shadow','memory','past','return','depth','hidden']
  };

  function init(name, glyph) {
    godName = name; godGlyph = glyph;
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
      supabase = window.supabase.createClient(KAIROS_URL, KAIROS_KEY);
      gaiaClient = window.supabase.createClient(GAIA_URL, GAIA_KEY);
    }
    isReady = !!supabase;
    console.log('🔗 ' + glyph + ' ' + name + ' connected to KairosDB via Olympian Bridge');
    refreshTelos(); refreshTasks();
    return isReady;
  }

  // ══════════════════════════════════════
  // DATABASE QUERY METHODS (NEW in v1.1)
  // ══════════════════════════════════════

  function getGaiaClient() { return gaiaClient; }
  function getKairosClient() { return supabase; }

  async function queryGaiaDB(table, query) {
    if (!gaiaClient) return { data: null, error: 'GaiaDB not connected' };
    try {
      var q = gaiaClient.from(table).select(query.select || '*');
      if (query.eq) { for (var k in query.eq) { q = q.eq(k, query.eq[k]); } }
      if (query.ilike) { for (var k2 in query.ilike) { q = q.ilike(k2, query.ilike[k2]); } }
      if (query.order) { q = q.order(query.order, { ascending: query.ascending !== false }); }
      if (query.limit) { q = q.limit(query.limit); }
      return await q;
    } catch(err) {
      console.warn('[Bridge] GaiaDB query failed:', err.message);
      return { data: null, error: err.message };
    }
  }

  async function queryKairosDB(table, query) {
    if (!supabase) return { data: null, error: 'KairosDB not connected' };
    try {
      var q = supabase.from(table).select(query.select || '*');
      if (query.eq) { for (var k in query.eq) { q = q.eq(k, query.eq[k]); } }
      if (query.ilike) { for (var k2 in query.ilike) { q = q.ilike(k2, query.ilike[k2]); } }
      if (query.order) { q = q.order(query.order, { ascending: query.ascending !== false }); }
      if (query.limit) { q = q.limit(query.limit); }
      return await q;
    } catch(err) {
      console.warn('[Bridge] KairosDB query failed:', err.message);
      return { data: null, error: err.message };
    }
  }

  // ══════════════════════════════════════
  // TELOS
  // ══════════════════════════════════════
  async function refreshTelos() {
    if (!supabase) return null;
    try {
      var now = Date.now();
      if (activeTelos && (now - lastTelosFetch) < cacheExpiry) return activeTelos;
      var result = await supabase.from('telos').select('*').eq('is_active', true).order('created_at',{ascending:false}).limit(1);
      if (result.data && result.data.length > 0) { activeTelos = result.data[0]; lastTelosFetch = now; console.log('🎯 Active Telos:', activeTelos.statement); return activeTelos; }
      return null;
    } catch(err) { console.warn('⚠ Telos fetch failed:', err.message); return activeTelos; }
  }
  function getActiveTelos() { return activeTelos; }
  async function getActiveTelosAsync() { return await refreshTelos(); }

  // ══════════════════════════════════════
  // TASKS
  // ══════════════════════════════════════
  async function refreshTasks() {
    if (!supabase) return [];
    try {
      var now = Date.now();
      if (activeTasks.length > 0 && (now - lastTasksFetch) < cacheExpiry) return activeTasks;
      var result = await supabase.from('tasks').select('*').eq('done',false).order('created_at',{ascending:false}).limit(20);
      if (result.data) { activeTasks = result.data; lastTasksFetch = now; console.log('📋 ' + activeTasks.length + ' active tasks loaded'); return activeTasks; }
      return [];
    } catch(err) { console.warn('⚠ Tasks fetch failed:', err.message); return activeTasks; }
  }
  function getTasks() { return activeTasks; }
  async function getTasksAsync() { return await refreshTasks(); }
  function getRelevantTasks() {
    var keywords = domainKeywords[godName] || [];
    if (keywords.length === 0) return activeTasks;
    return activeTasks.filter(function(task) {
      var body = (task.body||'').toLowerCase();
      for (var i = 0; i < keywords.length; i++) { if (body.indexOf(keywords[i]) > -1) return true; }
      return false;
    });
  }
  async function addTask(taskText) {
    if (!supabase) return null;
    try {
      var result = await supabase.from('tasks').insert({body:taskText,done:false,created_at:new Date().toISOString()}).select();
      if (result.data && result.data.length > 0) { var nt = result.data[0]; activeTasks.unshift(nt); console.log('✅ Task added:', taskText); return nt; }
      return null;
    } catch(err) { console.warn('⚠ Add task failed:', err.message); return null; }
  }
  async function completeTask(taskId) {
    if (!supabase) return false;
    try { await supabase.from('tasks').update({done:true}).eq('id',taskId); activeTasks = activeTasks.filter(function(t){return t.id!==taskId;}); return true; }
    catch(err) { return false; }
  }

  // ══════════════════════════════════════
  // TOKENS
  // ══════════════════════════════════════
  async function addToken(body, wordType, domain, telosId, extra) {
    if (!supabase) return null;
    try {
      var td = {body:body,word_type:wordType||'S',domain:domain||godName.toLowerCase()+'_domain',source:godName.toLowerCase(),score:50,metadata:extra||{},created_at:new Date().toISOString()};
      if (telosId) td.telos_id = telosId;
      var result = await supabase.from('tokens').insert(td).select();
      if (result.data && result.data.length > 0) { console.log('🪙 Token added:', body); return result.data[0]; }
      return null;
    } catch(err) { console.warn('⚠ Add token failed:', err.message); return null; }
  }

  // ══════════════════════════════════════
  // PAIRS
  // ══════════════════════════════════════
  async function addPair(tokenAId, tokenBId, tokenABody, tokenBBody, domainA, domainB, affinity, tension) {
    if (!supabase) return null;
    try {
      var result = await supabase.from('pairs').insert({token_a_id:tokenAId,token_b_id:tokenBId,token_a_body:tokenABody,token_b_body:tokenBBody,affinity_score:affinity||0.5,tension_score:tension||0.3,domain_a:domainA||godName.toLowerCase(),domain_b:domainB||'unknown',state:'raw',consumed:false,created_at:new Date().toISOString()}).select();
      if (result.data && result.data.length > 0) return result.data[0];
      return null;
    } catch(err) { return null; }
  }

  // ══════════════════════════════════════
  // IMAGES
  // ══════════════════════════════════════
  async function addImage(promptText, imageUrl, god, name, style, aspectRatio) {
    if (!supabase) return null;
    try {
      var result = await supabase.from('images').insert({prompt_text:promptText,image_url:imageUrl,god:god||godName,name:name||(godName+'_generation'),type:'pollinations',style:style||'oracle',aspect_ratio:aspectRatio||'1:1',score:50,crowned:false,status:'raw',created_at:new Date().toISOString()}).select();
      if (result.data && result.data.length > 0) return result.data[0];
      return null;
    } catch(err) { return null; }
  }

  // ══════════════════════════════════════
  // TRIPLETS
  // ══════════════════════════════════════
  async function addTriplet(subject, verb, object, domain, sourceOrigin, fertilityScore, mythogenicScore) {
    if (!supabase) return null;
    try {
      var body = subject+' '+verb+' '+object;
      var result = await supabase.from('svo_triplets').insert({subject:subject,verb:verb,object:object,body:body,source:godName.toLowerCase(),source_origin:sourceOrigin||'bridge',fertility_score:fertilityScore||50,coherence_score:50,mythogenic_score:mythogenicScore||50,cultivation_score:50,domain:domain||godName.toLowerCase()+'_domain',state:'raw',metadata:{},created_at:new Date().toISOString()}).select();
      if (result.data && result.data.length > 0) return result.data[0];
      return null;
    } catch(err) { return null; }
  }

  // ══════════════════════════════════════
  // UTILITY
  // ══════════════════════════════════════
  function generateTelosPrompt(prefix, suffix) {
    var telosStatement = activeTelos ? activeTelos.statement : '';
    var domains = activeTelos && activeTelos.dominant_domains ? activeTelos.dominant_domains.join(', ') : '';
    var motifs = activeTelos && activeTelos.active_motifs ? activeTelos.active_motifs.join(', ') : '';
    var parts = []; if (prefix) parts.push(prefix); if (domains) parts.push(domains); if (motifs) parts.push(motifs); parts.push(telosStatement); if (suffix) parts.push(suffix);
    return parts.filter(function(p){return p&&p.length>0;}).join('. ');
  }

  function getStatus() {
    return {god:godName,glyph:godGlyph,ready:isReady,activeTelos:activeTelos?activeTelos.statement:null,taskCount:activeTasks.length,relevantTaskCount:getRelevantTasks().length};
  }
  function logStatus() {
    var s = getStatus();
    console.log('🔗 '+godGlyph+' '+godName+' Bridge Status:');
    console.log('  Telos:', s.activeTelos||'none');
    console.log('  Tasks:', s.taskCount+' total,', s.relevantTaskCount+' relevant');
    console.log('  Ready:', s.ready);
  }

  return {
    init: init,
    isReady: function(){return isReady;},
    getGodName: function(){return godName;},
    getGodGlyph: function(){return godGlyph;},

    // Database access (NEW v1.1)
    getGaiaClient: getGaiaClient,
    getKairosClient: getKairosClient,
    queryGaiaDB: queryGaiaDB,
    queryKairosDB: queryKairosDB,

    // Telos
    getActiveTelos: getActiveTelos,
    getActiveTelosAsync: getActiveTelosAsync,
    refreshTelos: refreshTelos,

    // Tasks
    getTasks: getTasks,
    getTasksAsync: getTasksAsync,
    getRelevantTasks: getRelevantTasks,
    addTask: addTask,
    completeTask: completeTask,
    refreshTasks: refreshTasks,

    // Artifacts
    addToken: addToken,
    addPair: addPair,
    addImage: addImage,
    addTriplet: addTriplet,

    // Utility
    generateTelosPrompt: generateTelosPrompt,
    getDomainKeywords: function(){return domainKeywords[godName]||[];},
    getStatus: getStatus,
    logStatus: logStatus
  };
})();

console.log('🔗 Olympian Bridge v1.1 loaded — with queryGaiaDB + queryKairosDB');
