// ══════════════════════════════════════════════
// OLYMPIAN BRIDGE v1.0
// Shared module for all Olympian gods
// Connects to KairosDB for telos, tasks, and workflow
// ══════════════════════════════════════════════
// Live at: /nexus/olympian-bridge.js
// Include in every god's index.html:
//   <script src="/nexus/olympian-bridge.js"></script>
// Then init:
//   OlympianBridge.init('Artemis', '🏹');
// ══════════════════════════════════════════════

var OlympianBridge = (function() {
  'use strict';

  // ── CONFIG ──
  var KAIROS_URL = 'https://kzcucjcyxybypncbdbws.supabase.co';
  var KAIROS_KEY = 'sb_publishable_saeUHGocDah-T2_709M6Fg_g26JtLXw';
  var GAIA_URL = 'https://nbdvavzqvxrlxhsbrluz.supabase.co';
  var GAIA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5iZHZhdnpxdnhxbHhoc2JybHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxMjcyNDQsImV4cCI6MjA2MDcwMzI0NH0.8aw3sD2nXJFmSXJB_GrRhgjCpybKzycYNpTk0iLyYr4';

  var godName = '';
  var godGlyph = '';
  var supabase = null;
  var gaiaClient = null;
  var isReady = false;
  var activeTelos = null;
  var activeTasks = [];

  // ── CACHE ──
  var cacheExpiry = 30000; // 30 seconds before refetching telos
  var lastTelosFetch = 0;
  var lastTasksFetch = 0;

  // ── DOMAIN KEYWORDS ──
  // Each god has domain keywords for matching relevant tasks
  var domainKeywords = {
    'Artemis':    ['hunt', 'search', 'find', 'track', 'card', 'data', 'memory', 'retrieval'],
    'Demeter':    ['garden', 'plant', 'grow', 'harvest', 'seed', 'soil', 'nature', 'green'],
    'Hephaestus': ['build', 'forge', 'code', 'tool', 'fix', 'make', 'craft', 'html', 'script'],
    'Poseidon':   ['research', 'deep', 'knowledge', 'retrieve', 'ocean', 'data', 'search'],
    'Hermes':     ['cache', 'speed', 'message', 'route', 'quick', 'fast', 'deliver'],
    'Apollo':     ['image', 'generate', 'art', 'light', 'synthesis', 'create', 'visual'],
    'Athena':     ['wisdom', 'strategy', 'think', 'analyze', 'learn', 'memory', 'knowledge'],
    'Zeus':       ['rule', 'judge', 'command', 'authority', 'law', 'order', 'king'],
    'Aphrodite':  ['beauty', 'love', 'charm', 'inspire', 'attract', 'desire', 'create'],
    'Hera':       ['organize', 'task', 'workflow', 'telos', 'system', 'structure'],
    'Persephone': ['underworld', 'shadow', 'memory', 'past', 'return', 'depth', 'hidden']
  };

  // ══════════════════════════════════════
  // INITIALIZATION
  // ══════════════════════════════════════
  function init(name, glyph) {
    godName = name;
    godGlyph = glyph;

    // Init Supabase for KairosDB
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
      supabase = window.supabase.createClient(KAIROS_URL, KAIROS_KEY);
    }

    // Init Supabase for GaiaDB
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
      gaiaClient = window.supabase.createClient(GAIA_URL, GAIA_KEY);
    }

    isReady = !!supabase;
    console.log('🔗 ' + glyph + ' ' + name + ' connected to KairosDB via Olympian Bridge');

    // Fetch initial state
    refreshTelos();
    refreshTasks();

    return isReady;
  }

  // ══════════════════════════════════════
  // TELOS — Read active focus
  // ══════════════════════════════════════
  async function refreshTelos() {
    if (!supabase) return null;

    try {
      var now = Date.now();
      if (activeTelos && (now - lastTelosFetch) < cacheExpiry) {
        return activeTelos;
      }

      var result = await supabase
        .from('telos')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (result.data && result.data.length > 0) {
        activeTelos = result.data[0];
        lastTelosFetch = now;
        console.log('🎯 Active Telos:', activeTelos.statement);
        return activeTelos;
      }
      return null;
    } catch (err) {
      console.warn('⚠ Telos fetch failed:', err.message);
      return activeTelos; // Return cached if fetch fails
    }
  }

  function getActiveTelos() {
    return activeTelos;
  }

  async function getActiveTelosAsync() {
    return await refreshTelos();
  }

  // ══════════════════════════════════════
  // TASKS — Read and contribute
  // ══════════════════════════════════════
  async function refreshTasks() {
    if (!supabase) return [];

    try {
      var now = Date.now();
      if (activeTasks.length > 0 && (now - lastTasksFetch) < cacheExpiry) {
        return activeTasks;
      }

      var result = await supabase
        .from('tasks')
        .select('*')
        .eq('done', false)
        .order('created_at', { ascending: false })
        .limit(20);

      if (result.data) {
        activeTasks = result.data;
        lastTasksFetch = now;
        console.log('📋 ' + activeTasks.length + ' active tasks loaded');
        return activeTasks;
      }
      return [];
    } catch (err) {
      console.warn('⚠ Tasks fetch failed:', err.message);
      return activeTasks;
    }
  }

  function getTasks() {
    return activeTasks;
  }

  async function getTasksAsync() {
    return await refreshTasks();
  }

  // Find tasks relevant to this god based on domain keywords
  function getRelevantTasks() {
    var keywords = domainKeywords[godName] || [];
    if (keywords.length === 0) return activeTasks;

    return activeTasks.filter(function(task) {
      var body = (task.body || '').toLowerCase();
      for (var i = 0; i < keywords.length; i++) {
        if (body.indexOf(keywords[i]) > -1) return true;
      }
      return false;
    });
  }

  // Add a new task to KairosDB
  async function addTask(taskText) {
    if (!supabase) return null;

    try {
      var result = await supabase
        .from('tasks')
        .insert({
          body: taskText,
          done: false,
          created_at: new Date().toISOString()
        })
        .select();

      if (result.data && result.data.length > 0) {
        var newTask = result.data[0];
        activeTasks.unshift(newTask);
        console.log('✅ Task added:', taskText);
        return newTask;
      }
      return null;
    } catch (err) {
      console.warn('⚠ Add task failed:', err.message);
      return null;
    }
  }

  // Complete a task
  async function completeTask(taskId) {
    if (!supabase) return false;

    try {
      await supabase
        .from('tasks')
        .update({ done: true })
        .eq('id', taskId);

      activeTasks = activeTasks.filter(function(t) { return t.id !== taskId; });
      console.log('✅ Task completed:', taskId);
      return true;
    } catch (err) {
      console.warn('⚠ Complete task failed:', err.message);
      return false;
    }
  }

  // ══════════════════════════════════════
  // TOKENS — Contribute knowledge
  // ══════════════════════════════════════
  async function addToken(body, wordType, domain, telosId, extra) {
    if (!supabase) return null;

    try {
      var tokenData = {
        body: body,
        word_type: wordType || 'S',
        domain: domain || godName.toLowerCase() + '_domain',
        source: godName.toLowerCase(),
        score: 50,
        metadata: extra || {},
        created_at: new Date().toISOString()
      };

      if (telosId) tokenData.telos_id = telosId;

      var result = await supabase
        .from('tokens')
        .insert(tokenData)
        .select();

      if (result.data && result.data.length > 0) {
        console.log('🪙 Token added:', body);
        return result.data[0];
      }
      return null;
    } catch (err) {
      console.warn('⚠ Add token failed:', err.message);
      return null;
    }
  }

  // ══════════════════════════════════════
  // PAIRS — Connect concepts
  // ══════════════════════════════════════
  async function addPair(tokenAId, tokenBId, tokenABody, tokenBBody, domainA, domainB, affinity, tension) {
    if (!supabase) return null;

    try {
      var result = await supabase
        .from('pairs')
        .insert({
          token_a_id: tokenAId,
          token_b_id: tokenBId,
          token_a_body: tokenABody,
          token_b_body: tokenBBody,
          affinity_score: affinity || 0.5,
          tension_score: tension || 0.3,
          domain_a: domainA || godName.toLowerCase(),
          domain_b: domainB || 'unknown',
          state: 'raw',
          consumed: false,
          created_at: new Date().toISOString()
        })
        .select();

      if (result.data && result.data.length > 0) {
        console.log('🔗 Pair created:', tokenABody, '↔', tokenBBody);
        return result.data[0];
      }
      return null;
    } catch (err) {
      console.warn('⚠ Add pair failed:', err.message);
      return null;
    }
  }

  // ══════════════════════════════════════
  // IMAGES — Contribute generated art
  // ══════════════════════════════════════
  async function addImage(promptText, imageUrl, god, name, style, aspectRatio) {
    if (!supabase) return null;

    try {
      var result = await supabase
        .from('images')
        .insert({
          prompt_text: promptText,
          image_url: imageUrl,
          god: god || godName,
          name: name || (godName + '_generation'),
          type: 'pollinations',
          style: style || 'oracle',
          aspect_ratio: aspectRatio || '1:1',
          score: 50,
          crowned: false,
          status: 'raw',
          created_at: new Date().toISOString()
        })
        .select();

      if (result.data && result.data.length > 0) {
        console.log('🖼️ Image added:', name);
        return result.data[0];
      }
      return null;
    } catch (err) {
      console.warn('⚠ Add image failed:', err.message);
      return null;
    }
  }

  // ══════════════════════════════════════
  // SVO TRIPLETS — Extract patterns
  // ══════════════════════════════════════
  async function addTriplet(subject, verb, object, domain, sourceOrigin, fertilityScore, mythogenicScore) {
    if (!supabase) return null;

    try {
      var body = subject + ' ' + verb + ' ' + object;

      var result = await supabase
        .from('svo_triplets')
        .insert({
          subject: subject,
          verb: verb,
          object: object,
          body: body,
          source: godName.toLowerCase(),
          source_origin: sourceOrigin || 'bridge',
          fertility_score: fertilityScore || 50,
          coherence_score: 50,
          mythogenic_score: mythogenicScore || 50,
          cultivation_score: 50,
          domain: domain || godName.toLowerCase() + '_domain',
          state: 'raw',
          metadata: {},
          created_at: new Date().toISOString()
        })
        .select();

      if (result.data && result.data.length > 0) {
        console.log('📐 Triplet added:', body);
        return result.data[0];
      }
      return null;
    } catch (err) {
      console.warn('⚠ Add triplet failed:', err.message);
      return null;
    }
  }

  // ══════════════════════════════════════
  // PROMPTS — Contribute generation prompts
  // ══════════════════════════════════════
  async function addPrompt(promptText, telosStatement, domainTags, confidence) {
    if (!supabase) return null;

    try {
      var result = await supabase
        .from('prompts')
        .insert({
          prompt_text: promptText,
          telos: telosStatement || (activeTelos ? activeTelos.statement : ''),
          domain_tags: domainTags || [],
          source_tokens: [],
          confidence: confidence || 0.5,
          status: 'raw',
          created_at: new Date().toISOString()
        })
        .select();

      if (result.data && result.data.length > 0) {
        console.log('💬 Prompt added');
        return result.data[0];
      }
      return null;
    } catch (err) {
      console.warn('⚠ Add prompt failed:', err.message);
      return null;
    }
  }

  // ══════════════════════════════════════
  // TEMPLATES — Store reusable HTML/snippets
  // ══════════════════════════════════════
  async function addTemplate(label, type, content, tags, vibeScore) {
    if (!supabase) return null;

    try {
      var hash = simpleHash(content);

      var result = await supabase
        .from('templates')
        .insert({
          label: label,
          type: type || 'snippet',
          content: content,
          hash: hash,
          tags: tags || [],
          source_god: godName,
          vibe_score: vibeScore || 0.5,
          created_at: new Date().toISOString()
        })
        .select();

      if (result.data && result.data.length > 0) {
        console.log('📄 Template added:', label);
        return result.data[0];
      }
      return null;
    } catch (err) {
      console.warn('⚠ Add template failed:', err.message);
      return null;
    }
  }

  // ══════════════════════════════════════
  // HTML — Store full page artifacts
  // ══════════════════════════════════════
  async function addHTML(filename, content, version) {
    if (!supabase) return null;

    try {
      var result = await supabase
        .from('html')
        .insert({
          filename: filename,
          god: godName,
          content: content,
          version: version || '1.0',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();

      if (result.data && result.data.length > 0) {
        console.log('📄 HTML artifact stored:', filename);
        return result.data[0];
      }
      return null;
    } catch (err) {
      console.warn('⚠ Add HTML failed:', err.message);
      return null;
    }
  }

  // ══════════════════════════════════════
  // UTILITY — Generate telos-aligned prompt
  // ══════════════════════════════════════
  function generateTelosPrompt(prefix, suffix) {
    var telosStatement = activeTelos ? activeTelos.statement : '';
    var domains = activeTelos && activeTelos.dominant_domains ? activeTelos.dominant_domains.join(', ') : '';
    var motifs = activeTelos && activeTelos.active_motifs ? activeTelos.active_motifs.join(', ') : '';

    var parts = [];
    if (prefix) parts.push(prefix);
    if (domains) parts.push(domains);
    if (motifs) parts.push(motifs);
    parts.push(telosStatement);
    if (suffix) parts.push(suffix);

    return parts.filter(function(p) { return p && p.length > 0; }).join('. ');
  }

  // Simple hash for template deduplication
  function simpleHash(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      var char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  // ══════════════════════════════════════
  // STATUS — Get bridge state
  // ══════════════════════════════════════
  function getStatus() {
    return {
      god: godName,
      glyph: godGlyph,
      ready: isReady,
      activeTelos: activeTelos ? activeTelos.statement : null,
      taskCount: activeTasks.length,
      relevantTaskCount: getRelevantTasks().length
    };
  }

  // Log bridge status to console
  function logStatus() {
    var status = getStatus();
    console.log('🔗 ' + godGlyph + ' ' + godName + ' Bridge Status:');
    console.log('  Telos:', status.activeTelos || 'none');
    console.log('  Tasks:', status.taskCount, 'total,', status.relevantTaskCount, 'relevant');
    console.log('  Ready:', status.ready);
  }

  // ══════════════════════════════════════
  // PUBLIC API
  // ══════════════════════════════════════
  return {
    init: init,
    isReady: function() { return isReady; },
    getGodName: function() { return godName; },
    getGodGlyph: function() { return godGlyph; },

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
    addPrompt: addPrompt,
    addTemplate: addTemplate,
    addHTML: addHTML,

    // Utility
    generateTelosPrompt: generateTelosPrompt,
    getDomainKeywords: function() { return domainKeywords[godName] || []; },
    getStatus: getStatus,
    logStatus: logStatus
  };

})();

// Auto-log on load
console.log('🔗 Olympian Bridge v1.0 loaded — awaiting init()');
