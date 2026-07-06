// Mineradio Mobile Server v2 — 完整 API 路由
// 参照 Mineradio-Android 的 patch-index.js 内联适配层

(function() {
  'use strict';

  console.log('[Mineradio Mobile] API bridge loading...');

  // ── MineradioHttp 原生 HTTP 桥接（必须在 fetch 拦截前就绪） ──
  if (!window.MineradioHttp && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.MineradioHttp) {
    window.MineradioHttp = {
      request: function(opts) {
        return window.Capacitor.Plugins.MineradioHttp.request(opts);
      }
    };
    console.log('[Mineradio Mobile] MineradioHttp 桥接已就绪');
  } else if (!window.MineradioHttp && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.MinoradioHttp) {
    // 兼容拼写变体
    window.MineradioHttp = {
      request: function(opts) {
        return window.Capacitor.Plugins.MinoradioHttp.request(opts);
      }
    };
    console.log('[Mineradio Mobile] MineradioHttp 桥接已就绪 (MinoradioHttp)');
  }

  // ══════════════════════════════════════════════
  //  网易云 API
  // ══════════════════════════════════════════════
  var NC_BASE = 'https://music.163.com';
  var NC_API = NC_BASE + '/api';
  var NC_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

  var NC_COOKIE_KEY = 'mineradio-netease-cookie';
  var QQ_COOKIE_KEY = 'mineradio-qq-cookie';

  function getNcCookie() { try { return localStorage.getItem(NC_COOKIE_KEY) || ''; } catch(e) { return ''; } }
  function setNcCookie(c) { try { localStorage.setItem(NC_COOKIE_KEY, c || ''); } catch(e) {} }
  function getQqCookie() { try { return localStorage.getItem(QQ_COOKIE_KEY) || ''; } catch(e) { return ''; } }
  function setQqCookie(c) { try { localStorage.setItem(QQ_COOKIE_KEY, c || ''); } catch(e) {} }

  function safeParseJson(data) {
    if (typeof data === 'object' && data !== null) return data;
    if (typeof data === 'string') {
      try { return JSON.parse(data); } catch(e) {
        // 尝试提取第一个JSON对象（某些API返回带注释的响应）
        var m = data.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (m) { try { return JSON.parse(m[1]); } catch(e2) {} }
        throw e;
      }
    }
    return data;
  }

  async function ncApi(pathStr, params, opts) {
    opts = opts || {};
    var url = NC_API + pathStr;
    var body = new URLSearchParams(params).toString();
    if (window.MineradioHttp) {
      var result = await window.MineradioHttp.request({
        url: url,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': NC_BASE,
          'Cookie': opts.cookie || '',
          'User-Agent': NC_UA,
        },
        body: body,
      });
      return safeParseJson(result.data);
    }
    var resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': NC_BASE,
        'Cookie': opts.cookie || '',
        'User-Agent': NC_UA,
      },
      body: body,
    });
    return resp.json();
  }

  async function ncFetch(url, opts) {
    if (window.MineradioHttp) {
      var result = await window.MineradioHttp.request({
        url: url,
        method: opts && opts.method || 'GET',
        headers: opts && opts.headers || {},
        body: opts && opts.body || null,
      });
      return {
        json: function() { return safeParseJson(result.data); },
        text: function() { return typeof result.data === 'string' ? result.data : JSON.stringify(result.data); },
        ok: result.ok,
        status: result.status,
      };
    }
    return fetch(url, opts);
  }

  // ══════════════════════════════════════════════
  //  QQ 音乐 API
  // ══════════════════════════════════════════════
  var QQ_CLOUD = 'https://c.y.qq.com';
  var QQ_BASE_URL = 'https://u.y.qq.com/cgi-bin';

  async function qqSearch(keywords, limit, offset) {
    var page = Math.floor((offset || 0) / (limit || 30)) + 1;
    var params = new URLSearchParams({
      _: String(Date.now()), format: 'json', inCharset: 'utf-8', outCharset: 'utf-8',
      notice: '0', platform: 'yqq.json', needNewCode: '1',
      w: keywords, zhidaqu: '1', catZhida: '1', t: '0', flag_qc: '0',
      p: String(page), n: String(limit || 30), remoteplace: 'txt.yqq.song',
    });
    var resp = await ncFetch(QQ_CLOUD + '/soso/fcgi-bin/client_search_cp?' + params, {
      headers: { 'Referer': 'https://y.qq.com/' },
    });
    var data = await resp.json();
    if (!data || !data.data || !data.data.song) return { code: -1, data: { song: { list: [], totalnum: 0 } } };
    return { code: 0, data: { song: { list: data.data.song.list || [], totalnum: data.data.song.totalnum || 0 } } };
  }

  async function qqSongUrl(songmid, quality) {
    quality = quality || 'M800';
    var guid = String(Math.floor(Math.random() * 10000000000));
    var reqData = {
      req_0: {
        module: 'vkey.GetVkeyServer', method: 'CgiGetVkey', param: {
          guid: guid, songmid: [songmid], filename: [quality + songmid + '.m4a'],
          songtype: [0], uin: '0', loginflag: 1, platform: '20',
        },
      },
      comm: { uin: '0', format: 'json', ct: 24, cv: 0 },
    };
    var resp = await ncFetch(QQ_BASE_URL + '/musu.fcg?format=1&data=' + encodeURIComponent(JSON.stringify(reqData)), {
      headers: { 'Referer': 'https://y.qq.com/' },
    });
    var data = await resp.json();
    var sip = (data.req_0 && data.req_0.data && data.req_0.data.sip && data.req_0.data.sip[0]) || '';
    var purl = data.req_0 && data.req_0.data && data.req_0.data.midurlinfo && data.req_0.data.midurlinfo[0] && data.req_0.data.midurlinfo[0].purl;
    if (!purl) return { code: -1, message: 'no url' };
    return { code: 0, data: { url: sip + purl } };
  }

  async function qqLyric(songmid) {
    var params = new URLSearchParams({
      songmid: songmid, format: 'json', inCharset: 'utf-8', outCharset: 'utf-8', nobase64: '1',
    });
    var resp = await ncFetch(QQ_CLOUD + '/lyric/fcgi-bin/fcg_query_lyric_new.fcg?' + params, {
      headers: { 'Referer': 'https://y.qq.com/' },
    });
    var data = await resp.json();
    if (!data || data.code !== 0) return { code: -1 };
    return { code: 0, data: { lyric: data.lyric || '', trans: data.trans || '' } };
  }

  // ══════════════════════════════════════════════
  //  天气电台
  // ══════════════════════════════════════════════
  var WEATHER_MOOD = {
    0: ['晴天 快乐', 'sunny day', '阳光 正能量'], 1: ['晴朗 放松', 'mostly clear', '微风 轻快'],
    2: ['多云 思考', 'partly cloudy', '文艺 抒情'], 3: ['阴天 安静', 'overcast', 'indie folk'],
    45: ['雾 迷幻', 'fog ambient', '电子 氛围'], 48: ['雾凇 空灵', 'ethereal', '钢琴 纯音乐'],
    51: ['毛毛雨 轻柔', 'drizzle soft', 'lo-fi chill'], 53: ['细雨 慵懒', 'rain cozy', 'jazz rainy day'],
    55: ['绵绵雨 沉浸', 'steady rain', 'ambient rain'], 61: ['小雨 治愈', 'light rain healing', 'piano rain'],
    63: ['中雨 驱动', 'moderate rain energy', 'indie rock'], 65: ['大雨 爆发', 'heavy rain dramatic', 'epic cinematic'],
    71: ['小雪 浪漫', 'light snow romantic', 'winter jazz'], 73: ['中雪 梦幻', 'snow dreamy', 'dream pop'],
    75: ['大雪 壮丽', 'heavy snow epic', 'orchestral'], 80: ['阵雨 清新', 'rain showers fresh', 'acoustic'],
    95: ['雷暴 力量', 'thunderstorm power', 'rock anthems'],
  };

  var IP_LOC_URL = 'http://ip-api.com/json/';
  var OM_FORECAST = 'https://api.open-meteo.com/v1/forecast';

  async function getIpLocation() {
    try {
      var r = await ncFetch(IP_LOC_URL);
      var d = await r.json();
      if (d && d.status === 'success') return { name: d.city || '未知', latitude: d.lat || 31.23, longitude: d.lon || 121.47, timezone: d.timezone || 'Asia/Shanghai' };
    } catch (e) {}
    return { name: '上海', latitude: 31.23, longitude: 121.47, timezone: 'Asia/Shanghai' };
  }

  async function getWeatherRadio(lat, lon, tz) {
    var loc;
    if (lat != null && lon != null) { loc = { latitude: lat, longitude: lon, timezone: tz || 'auto', name: '' }; }
    else { loc = await getIpLocation(); }
    var params = new URLSearchParams({
      latitude: String(loc.latitude), longitude: String(loc.longitude),
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,wind_speed_10m',
      hourly: 'precipitation_probability,weather_code,temperature_2m', forecast_days: '1', timezone: loc.timezone,
    });
    var r = await ncFetch(OM_FORECAST + '?' + params);
    var f = await r.json();
    var code = (f && f.current && f.current.weather_code != null) ? f.current.weather_code : 2;
    return {
      location: loc,
      weather: { code: code, temperature: f && f.current && f.current.temperature_2m, humidity: f && f.current && f.current.relative_humidity_2m },
      mood: WEATHER_MOOD[code] || WEATHER_MOOD[2],
    };
  }

  // ══════════════════════════════════════════════
  //  主路由: 拦截 fetch 并分发到对应 API
  // ══════════════════════════════════════════════
  var _origFetch = window.fetch;

  window.fetch = async function(input, init) {
    var url = (typeof input === 'string') ? input : (input && input.url ? input.url : '');
    var parsed;
    try { parsed = new URL(url, 'https://localhost'); } catch (e) { return _origFetch.call(window, input, init); }

    var pn = parsed.pathname;
    var q = {};
    parsed.searchParams.forEach(function(v, k) { q[k] = v; });

    var body = {};
    if (init && init.body) {
      try { body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body; } catch (e) {}
    }

    var cookie = getNcCookie();
    var qqCookie = getQqCookie();

    // ── 拦截 /api/* ──
    if (pn.startsWith('/api/')) {
      try {
        var result = await routeApi(pn, q, body, cookie, qqCookie);
        if (result instanceof Response) return result;
        return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
      } catch (e) {
        console.error('[Mineradio Mobile] API error:', pn, e);
        return new Response(JSON.stringify({ code: -1, message: e.message }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // ── 外部请求: 优先用原生 HTTP ──
    if (window.MineradioHttp && !url.startsWith('data:') && !url.startsWith('blob:')) {
      try {
        var nativeResult = await window.MineradioHttp.request({
          url: url,
          method: init && init.method || 'GET',
          headers: init && init.headers || {},
          body: init && init.body || null,
          timeout: 15000,
        });
        return new Response(nativeResult.data, {
          status: nativeResult.status,
          headers: nativeResult.headers,
        });
      } catch (e) {
        // fallback to original fetch
      }
    }

    return _origFetch.call(window, input, init);
  };

  // 同时拦截 XMLHttpRequest
  var _origXHROpen = XMLHttpRequest.prototype.open;
  var _origXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url) {
    this._mobileUrl = url;
    this._mobileMethod = method;
    return _origXHROpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function(body) {
    if (this._mobileUrl && this._mobileUrl.startsWith('/api/')) {
      var self = this;
      var parsed;
      try { parsed = new URL(this._mobileUrl, 'https://localhost'); } catch (e) { return _origXHRSend.apply(this, arguments); }

      var pn = parsed.pathname;
      var q = {};
      parsed.searchParams.forEach(function(v, k) { q[k] = v; });
      var reqBody = {};
      if (body) { try { reqBody = typeof body === 'string' ? JSON.parse(body) : body; } catch (e) {} }

      routeApi(pn, q, reqBody, getNcCookie(), getQqCookie())
        .then(function(data) {
          var respStr = JSON.stringify(data);
          Object.defineProperty(self, 'responseText', { value: respStr, writable: true });
          Object.defineProperty(self, 'response', { value: respStr, writable: true });
          Object.defineProperty(self, 'status', { value: 200, writable: true });
          Object.defineProperty(self, 'readyState', { value: 4, writable: true });
          self.dispatchEvent(new Event('readystatechange'));
          self.dispatchEvent(new Event('load'));
          self.dispatchEvent(new Event('loadend'));
        })
        .catch(function() {
          Object.defineProperty(self, 'status', { value: 500, writable: true });
          self.dispatchEvent(new Event('error'));
          self.dispatchEvent(new Event('loadend'));
        });
      return;
    }
    return _origXHRSend.apply(this, arguments);
  };

  // ══════════════════════════════════════════════
  //  API 路由表
  // ══════════════════════════════════════════════
  async function routeApi(pn, q, body, cookie, qqCookie) {
    // 网易云 - 搜索
    if (pn === '/api/search') {
      return ncApi('/search/get', { s: q.keywords || q.s, type: 1, limit: q.limit || 30, offset: q.offset || 0, total: 'true' });
    }
    if (pn === '/api/cloudsearch') {
      return ncApi('/cloudsearch/pc', { s: q.keywords || q.s, type: 1, limit: q.limit || 30, offset: q.offset || 0, total: 'true' });
    }
    // 歌曲 URL
    if (pn === '/api/song/url') {
      return ncApi('/song/enhance/player/url', { ids: JSON.stringify([q.id]), br: q.br || 999000 }, { cookie: cookie });
    }
    if (pn === '/api/song/url/v1') {
      return ncApi('/song/enhance/player/url/v1', { ids: JSON.stringify([q.id]), level: q.level || 'exhigh', encodeType: 'flac' }, { cookie: cookie });
    }
    // 歌曲详情
    if (pn === '/api/song/detail') {
      var ids = q.ids ? JSON.parse(q.ids) : [q.id];
      return ncApi('/song/detail', { ids: JSON.stringify(ids), c: JSON.stringify(ids.map(function(id) { return { id: id }; })) }, { cookie: cookie });
    }
    // 歌词
    if (pn === '/api/lyric') {
      return ncApi('/lyric', { id: q.id }, { cookie: cookie });
    }
    // 登录
    if (pn === '/api/login/qr/key') return ncApi('/login/qr/key', { timestamp: Date.now() }, { cookie: cookie });
    if (pn === '/api/login/qr/create') return ncApi('/login/qr/create', { key: q.key, qrimg: 'true', timestamp: Date.now() }, { cookie: cookie });
    if (pn === '/api/login/qr/check') {
      var r = await ncApi('/login/qr/check', { key: q.key, timestamp: Date.now() }, { cookie: cookie });
      if (r && r.code === 803 && r.cookie) setNcCookie(r.cookie);
      return r;
    }
    if (pn === '/api/login/status') return ncApi('/login/status', { timestamp: Date.now() }, { cookie: cookie });
    if (pn === '/api/login/cookie') {
      if (body.cookie) setNcCookie(body.cookie);
      return { ok: true, cookie: getNcCookie() };
    }
    if (pn === '/api/logout') { setNcCookie(''); return ncApi('/logout', { timestamp: Date.now() }, { cookie: cookie }); }
    // 用户
    if (pn === '/api/user/playlists') return ncApi('/user/playlist', { uid: q.uid, limit: q.limit || 30, offset: q.offset || 0, timestamp: Date.now() }, { cookie: cookie });
    if (pn === '/api/user/account') return ncApi('/user/account', { timestamp: Date.now() }, { cookie: cookie });
    // 歌单
    if (pn === '/api/playlist/detail') return ncApi('/playlist/detail', { id: q.id, timestamp: Date.now() }, { cookie: cookie });
    if (pn === '/api/playlist/tracks') return ncApi('/playlist/track/all', { id: q.id, limit: q.limit || 1000, offset: q.offset || 0, timestamp: Date.now() }, { cookie: cookie });
    if (pn === '/api/playlist/create') return ncApi('/playlist/create', { name: q.name || body.name, timestamp: Date.now() }, { cookie: cookie });
    if (pn === '/api/playlist/add-song') return ncApi('/playlist/track/add', { pid: q.pid || body.pid, tracks: q.tracks || body.tracks, timestamp: Date.now() }, { cookie: cookie });
    // 推荐
    if (pn === '/api/discover/home') {
      var p1, p2, p3;
      try { p1 = await ncApi('/personalized', { limit: 8, timestamp: Date.now() }, { cookie: cookie }); } catch (e) { p1 = null; }
      try { p2 = cookie ? await ncApi('/recommend/resource', { timestamp: Date.now() }, { cookie: cookie }) : null; } catch (e) { p2 = null; }
      try { p3 = cookie ? await ncApi('/recommend/songs', { timestamp: Date.now() }, { cookie: cookie }) : null; } catch (e) { p3 = null; }
      return { personalized: p1, recommendResource: p2, recommendSongs: p3 };
    }
    // 喜欢
    if (pn === '/api/song/like') return ncApi('/like', { id: q.id, like: String(q.like !== 'false'), timestamp: Date.now() }, { cookie: cookie });
    if (pn === '/api/song/like/check') return ncApi('/song/like/check', { ids: q.ids, uid: q.uid, timestamp: Date.now() }, { cookie: cookie });
    if (pn === '/api/likelist') return ncApi('/likelist', { uid: q.uid, timestamp: Date.now() }, { cookie: cookie });
    // 歌手
    if (pn === '/api/artist/detail') return ncApi('/artist/detail', { id: q.id, timestamp: Date.now() }, { cookie: cookie });
    if (pn === '/api/artist/top/song') return ncApi('/artist/top/song', { id: q.id, timestamp: Date.now() }, { cookie: cookie });
    if (pn === '/api/artist/songs') return ncApi('/artist/songs', { id: q.id, limit: q.limit || 50, offset: q.offset || 0, timestamp: Date.now() }, { cookie: cookie });
    // 评论
    if (pn === '/api/song/comments') return ncApi('/comment/music', { id: q.id, limit: q.limit || 20, offset: q.offset || 0, timestamp: Date.now() }, { cookie: cookie });
    // 播客
    if (pn === '/api/podcast/search') return ncApi('/search', { keywords: q.keywords, type: 1009, limit: q.limit || 30, offset: q.offset || 0 }, { cookie: cookie });
    if (pn === '/api/podcast/hot') return ncApi('/dj/hot', { timestamp: Date.now() }, { cookie: cookie });
    if (pn === '/api/podcast/detail') return ncApi('/dj/detail', { rid: q.id, timestamp: Date.now() }, { cookie: cookie });
    if (pn === '/api/podcast/programs') return ncApi('/dj/program', { rid: q.id, limit: q.limit || 50, offset: q.offset || 0, timestamp: Date.now() }, { cookie: cookie });
    if (pn === '/api/podcast/my') return ncApi('/dj/sublist', { timestamp: Date.now() }, { cookie: cookie });
    // QQ 音乐
    if (pn === '/api/qq/search') return qqSearch(q.keywords, Number(q.limit) || 30, Number(q.offset) || 0);
    if (pn === '/api/qq/song/url') return qqSongUrl(q.songmid, q.quality || 'M800');
    if (pn === '/api/qq/lyric') return qqLyric(q.songmid);
    if (pn === '/api/qq/login/status') return { loggedIn: false };
    if (pn === '/api/qq/login/cookie') { if (body.cookie) setQqCookie(body.cookie); return { ok: true }; }
    if (pn === '/api/qq/logout') { setQqCookie(''); return { ok: true }; }
    if (pn === '/api/qq/user/playlists') return { playlists: [] };
    // 天气
    if (pn === '/api/weather/radio') return getWeatherRadio(q.latitude ? Number(q.latitude) : null, q.longitude ? Number(q.longitude) : null, q.timezone);
    if (pn === '/api/weather/ip-location') return getIpLocation();
    // 封面
    if (pn === '/api/cover' || pn === '/api/image-proxy') {
      var picId = q.picId || q.id || '';
      var src = q.source || 'netease';
      var size = Number(q.size) || 300;
      var imageUrl = q.url || (src === 'qq'
        ? ('https://y.qq.com/music/photo_new/T002R' + size + 'x' + size + 'M000' + picId + '.jpg')
        : ('https://p1.music.126.net/' + picId + '/' + picId + '.jpg?param=' + size + 'y' + size));
      try {
        var imgResp = await _origFetch.call(window, imageUrl);
        return imgResp;
      } catch (e) {
        return new Response('', { status: 404 });
      }
    }
    // 音频代理
    if (pn === '/api/audio') {
      var audioUrl = q.url;
      if (!audioUrl) return new Response('missing url', { status: 400 });
      try {
        var audioResp = await _origFetch.call(window, audioUrl, { headers: { 'Range': 'bytes=0-' } });
        return new Response(audioResp.body, {
          status: audioResp.status,
          headers: {
            'Content-Type': audioResp.headers.get('Content-Type') || 'audio/mpeg',
            'Accept-Ranges': 'bytes',
            'Access-Control-Allow-Origin': '*',
          },
        });
      } catch (e) {
        return new Response('audio fetch failed', { status: 502 });
      }
    }
    // ══════════════════════════════════════════════
    //  平台歌单导入
    // ══════════════════════════════════════════════
    window.platformPlaylistImport = {
      importPlaylist: async function(body) {
        var input = (body && body.input || '').trim();
        var source = (body && body.source || 'tx').toLowerCase();
        if (!input) return { ok: false, error: '请输入歌单链接或ID' };

        try {
          if (source === 'tx') return await importTxPlaylist(input);
          if (source === 'wy') return await importWyPlaylist(input);
          return { ok: false, error: '暂不支持该平台: ' + source };
        } catch (e) {
          console.warn('[PlatformPlaylistImport]', e);
          return { ok: false, error: e.message || '导入失败' };
        }
      }
    };

    function extractTxPlaylistId(input) {
      var m = input.match(/id=(\d+)/i) || input.match(/\/(\d{6,})/);
      if (m) return m[1];
      if (/^\d{6,}$/.test(input)) return input;
      return null;
    }

    async function importTxPlaylist(input) {
      var id = extractTxPlaylistId(input);
      if (!id) return { ok: false, error: '无法识别QQ音乐歌单ID，请粘贴分享链接或数字ID' };
      var url = 'https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg?type=1&json=1&utf8=1&onlysong=0&new_format=1&disstid=' + id + '&platform=yqq.json';
      var respText;
      if (window.MineradioHttp) {
        var r = await window.MineradioHttp.request({
          url: url,
          method: 'GET',
          headers: { 'Referer': 'https://y.qq.com/', 'User-Agent': NC_UA },
        });
        respText = r.data;
      } else {
        var resp = await fetch(url, { headers: { 'Referer': 'https://y.qq.com/' } });
        respText = await resp.text();
      }
      var json = JSON.parse(respText);
      var cd = json && json.cdlist && json.cdlist[0];
      if (!cd) return { ok: false, error: '未找到歌单，请检查链接是否正确' };
      var songs = (cd.songlist || []).map(function(s) {
        return {
          name: s.songname || s.name || '',
          artist: (s.singer || []).map(function(a) { return a.name; }).join('/') || '',
          album: s.albumname || '',
          duration: (s.interval || 0) * 1000,
          picUrl: s.album && s.album.mid ? 'https://y.qq.com/music/photo_new/T002R300x300M000' + s.album.mid + '.jpg' : '',
          source: 'tx',
          id: 'tx_' + (s.songmid || s.mid || s.id || ''),
          songmid: s.songmid || s.mid || '',
        };
      });
      return {
        ok: true,
        playlist: {
          id: 'tx_' + id,
          name: cd.dissname || cd.name || 'QQ音乐歌单',
          cover: cd.logo || '',
          songs: songs,
          source: 'tx',
          imported: true,
        }
      };
    }

    function extractWyPlaylistId(input) {
      var m = input.match(/playlist[\/\?#!=]*?(\d{4,})/i);
      if (m) return m[1];
      if (/^\d{4,}$/.test(input)) return input;
      return null;
    }

    async function importWyPlaylist(input) {
      var id = extractWyPlaylistId(input);
      if (!id) return { ok: false, error: '无法识别网易云歌单ID，请粘贴分享链接或数字ID' };
      var data = await ncApi('/playlist/detail', { id: id, n: 500 });
      var pl = data && data.playlist;
      if (!pl || !pl.tracks) return { ok: false, error: '未找到歌单，请检查链接是否正确' };
      var songs = pl.tracks.map(function(t) {
        var ar = (t.ar || t.artists || []).map(function(a) { return a.name; }).join('/');
        var al = t.al || t.album || {};
        return {
          name: t.name || '',
          artist: ar,
          album: al.name || '',
          duration: (t.dt || t.duration || 0),
          picUrl: al.picUrl || '',
          source: 'wy',
          id: 'wy_' + t.id,
        };
      });
      return {
        ok: true,
        playlist: {
          id: 'wy_' + id,
          name: pl.name || '网易云歌单',
          cover: pl.coverImgUrl || '',
          songs: songs,
          source: 'wy',
          imported: true,
        }
      };
    }

    // ── 加载已导入的自定义音源脚本 ──
    function loadStoredSource() {
      try {
        var script = localStorage.getItem('mineradio-lx-source-script');
        if (!script) return null;
        var m = { exports: {} };
        var fn = new Function('module', 'exports', 'require', script);
        fn(m, m.exports, function() { return {}; });
        return m.exports.default || m.exports;
      } catch(e) { return null; }
    }

    // LX Source
    if (pn === '/api/lx-source/status') {
      var storedName = '';
      var storedSources = [];
      try { storedName = localStorage.getItem('mineradio-lx-source-name') || ''; } catch(e) {}
      try { storedSources = JSON.parse(localStorage.getItem('mineradio-lx-sources') || '[]'); } catch(e) {}
      var activeSource = '';
      try { activeSource = localStorage.getItem('mineradio-lx-active-source') || ''; } catch(e) {}
      return {
        ok: true,
        name: storedName,
        activeSource: activeSource,
        customSources: storedSources.map(function(s) { return { name: s.name, fileName: s.fileName, time: s.time }; }),
        sources: {
          wy: { available: true, name: '网易云音乐' },
          tx: { available: true, name: 'QQ音乐' },
          mg: { available: true, name: '咪咕音乐' },
          kg: { available: true, name: '酷狗音乐' },
          kw: { available: true, name: '酷我音乐' },
        },
      };
    }
    if (pn === '/api/lx-source/search') {
      // 优先使用用户导入的自定义音源
      var stored = loadStoredSource();
      if (stored && stored.musicSearch && stored.musicSearch.search) {
        try { return await stored.musicSearch.search(q.q || q.keywords, { limit: Number(q.limit) || 30 }); } catch(e) {}
      }
      // 内置多平台搜索
      var query = q.q || q.keywords || '';
      var limit = Math.min(Number(q.limit) || 12, 30);
      var sources = (q.sources || 'tx,wy,kw,kg').split(',');
      var allSongs = [];
      var failures = [];

      function durText(sec) {
        sec = Math.max(0, Math.round(Number(sec) || 0));
        return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
      }

      // 网易云搜索
      async function searchWy() {
        var data = await ncApi('/search/get', { s: query, type: 1, limit: limit, offset: 0, total: 'true' });
        var list = (data && data.result && data.result.songs) || [];
        return list.map(function(s) {
          var ar = (s.artists || []).map(function(a) { return a.name; }).join('/');
          var al = s.album || {};
          return { id: s.id, songmid: s.id, name: s.name || '', singer: ar, albumName: al.name || '', albumId: al.id || '', picUrl: al.picUrl || '', interval: durText((s.duration || 0) / 1000), source: 'wy', types: ['flac', '320k', '128k'] };
        });
      }

      // QQ音乐搜索
      async function searchTx() {
        var r = await qqSearch(query, limit, 0);
        var list = (r && r.data && r.data.song && r.data.song.list) || [];
        return list.map(function(s) {
          var singer = (s.singer || []).map(function(a) { return a.name; }).join('/');
          var albumMid = s.albummid || '';
          return { id: s.songid || s.id, songmid: s.songmid || s.mid || '', name: s.songname || s.name || '', singer: singer, albumName: s.albumname || '', albumId: albumMid, albumMid: albumMid, strMediaMid: s.strMediaMid || s.songmid || '', picUrl: albumMid ? 'https://y.gtimg.cn/music/photo_new/T002R500x500M000' + albumMid + '.jpg' : '', interval: durText(s.interval), source: 'tx', types: ['flac', '320k', '128k'] };
        });
      }

      // 酷我搜索
      async function searchKw() {
        var url = 'https://search.kuwo.cn/r.s?client=kt&all=' + encodeURIComponent(query) + '&pn=0&rn=' + limit + '&uid=794762570&ver=kwplayer_ar_9.2.2.1&vipver=1&show_copyright_off=1&newver=1&ft=music&cluster=0&strategy=2012&encoding=utf8&rformat=json&vermerge=1&mobi=1&issubtitle=1';
        var resp = await ncFetch(url);
        var data = await resp.json();
        var list = (data && data.abslist) || [];
        return list.map(function(s) {
          return { id: String(s.MUSICRID || '').replace('MUSIC_', ''), songmid: String(s.MUSICRID || '').replace('MUSIC_', ''), name: s.SONGNAME || '', singer: s.ARTIST || '', albumName: s.ALBUM || '', albumId: s.ALBUMID || '', interval: durText(s.DURATION), source: 'kw', types: ['flac24bit', 'flac', '320k', '128k'] };
        });
      }

      // 酷狗搜索
      async function searchKg() {
        var url = 'https://songsearch.kugou.com/song_search_v2?keyword=' + encodeURIComponent(query) + '&page=1&pagesize=' + limit + '&userid=0&platform=WebFilter&filter=2&iscorrection=1&privilege_filter=0&area_code=1&_=' + Date.now();
        var resp = await ncFetch(url);
        var data = await resp.json();
        var list = (data && data.data && data.data.lists) || [];
        return list.map(function(s) {
          var singer = (s.Singers || []).map(function(a) { return a.name || a.singerName; }).filter(Boolean).join('、') || s.SingerName || '';
          return { id: s.Audioid || s.FileHash || '', songmid: s.Audioid || s.FileHash || '', name: s.SongName || '', singer: singer, albumName: s.AlbumName || '', albumId: s.AlbumID || '', hash: s.FileHash || '', interval: durText(s.Duration), source: 'kg', types: ['flac24bit', 'flac', '320k', '128k'] };
        });
      }

      var providers = { tx: searchTx, wy: searchWy, kw: searchKw, kg: searchKg };
      var tasks = sources.filter(function(s) { return providers[s]; }).map(function(s) {
        return providers[s]().catch(function(e) { failures.push({ source: s, error: e.message }); return []; });
      });
      var results = await Promise.all(tasks);
      results.forEach(function(songs) { allSongs = allSongs.concat(songs); });
      return { ok: true, songs: allSongs, failures: failures };
    }
    if (pn === '/api/lx-source/resolve') {
      var stored2 = loadStoredSource();
      if (stored2 && stored2.musicSearch && stored2.musicSearch.getMusicUrl) {
        try {
          var storedResult = await stored2.musicSearch.getMusicUrl(body.source, body.musicInfo, body.quality);
          // 规范化返回格式：LX音源脚本可能返回纯URL字符串或 {url:...} 对象
          if (typeof storedResult === 'string' && /^https?:\/\//i.test(storedResult)) {
            return { ok: true, url: storedResult, quality: body.quality || '320k' };
          }
          if (storedResult && typeof storedResult === 'object') {
            if (storedResult.url && !storedResult.ok) storedResult.ok = true;
            if (storedResult.url) return storedResult;
          }
        } catch(e) {
          console.warn('[Mineradio Mobile] 自定义音源解析失败，回退内置解析:', e.message);
        }
      }
      // 内置平台解析
      var src = (body.source || '').toLowerCase();
      var info = body.musicInfo || body;
      var quality = body.quality || '320k';
      try {
        if (src === 'wy') {
          var songId = info.id || info.songmid;
          // 尝试 v1 API
          try {
            var urlData1 = await ncApi('/song/enhance/player/url/v1', { ids: JSON.stringify([songId]), level: quality === 'flac' ? 'exhigh' : quality === '320k' ? 'exhigh' : 'standard', encodeType: 'flac' });
            var songUrl1 = urlData1 && urlData1.data && urlData1.data[0] && urlData1.data[0].url;
            if (songUrl1) return { ok: true, url: songUrl1, quality: quality };
          } catch(e1) {}
          // 回退旧 API
          var br = quality === 'flac' ? 999000 : quality === '320k' ? 320000 : 128000;
          var urlData = await ncApi('/song/enhance/player/url', { ids: JSON.stringify([songId]), br: br });
          var songUrl = urlData && urlData.data && urlData.data[0] && urlData.data[0].url;
          if (songUrl) return { ok: true, url: songUrl, quality: quality };
          return { ok: false, error: '无法获取播放链接（可能是VIP歌曲或地区限制）' };
        }
        if (src === 'tx') {
          var songmid = info.songmid || info.mid || info.id;
          var qUrl = await qqSongUrl(songmid, quality === 'flac' ? 'F000' : quality === '320k' ? 'M800' : 'M500');
          if (qUrl && qUrl.data && qUrl.data.url) return { ok: true, url: qUrl.data.url, quality: quality };
          return { ok: false, error: '无法获取播放链接' };
        }
        if (src === 'kw') {
          var rid = info.songmid || info.id || info.MUSICRID || '';
          rid = String(rid).replace('MUSIC_', '');
          var kwUrl = 'https://antiserver.kuwo.cn/anti.s?type=convert_url3&rid=' + rid + '&format=mp3&quality=' + (quality === 'flac' ? '2000kflac' : quality === '320k' ? '320kmp3' : '128kmp3') + '&response=url';
          var kwResp = await ncFetch(kwUrl);
          var kwText = await kwResp.text();
          if (kwText && kwText.startsWith('http')) return { ok: true, url: kwText.trim(), quality: quality };
          return { ok: false, error: '无法获取播放链接' };
        }
        if (src === 'kg') {
          var hash = info.hash || info.songmid || info.id || '';
          var kgApiUrl = 'https://wwwapi.kugou.com/yy/index.php?r=play/getdata&hash=' + hash + '&appid=1014&mid=' + Date.now() + '&platid=4';
          var kgResp = await ncFetch(kgApiUrl, { headers: { 'Cookie': 'kg_mid=' + Date.now() } });
          var kgData = await kgResp.json();
          var kgUrl = kgData && kgData.data && kgData.data.play_url;
          if (kgUrl) return { ok: true, url: kgUrl, quality: quality };
          return { ok: false, error: '无法获取播放链接' };
        }
      } catch(e) {
        return { ok: false, error: '解析失败: ' + e.message };
      }
      return { ok: false, error: '不支持的音源: ' + src };
    }
    if (pn === '/api/lx-source/lyric') {
      var stored3 = loadStoredSource();
      if (stored3 && stored3.musicSearch && stored3.musicSearch.getLyric) {
        try {
          var storedLyric = await stored3.musicSearch.getLyric(body.source, body.musicInfo);
          if (typeof storedLyric === 'string') return { ok: true, lyric: storedLyric };
          if (storedLyric && typeof storedLyric === 'object' && !storedLyric.ok) storedLyric.ok = true;
          if (storedLyric) return storedLyric;
        } catch(e) {
          console.warn('[Mineradio Mobile] 自定义音源歌词失败:', e.message);
        }
      }
      // 内置平台歌词
      var lsrc = (body.source || '').toLowerCase();
      var linfo = body.musicInfo || body;
      try {
        if (lsrc === 'wy') {
          var lData = await ncApi('/lyric', { id: linfo.id || linfo.songmid });
          return { ok: true, lyric: (lData && lData.lrc && lData.lrc.lyric) || '', tlyric: (lData && lData.tlyric && lData.tlyric.lyric) || '' };
        }
        if (lsrc === 'tx') {
          var lmid = linfo.songmid || linfo.mid || linfo.id;
          return await qqLyric(lmid);
        }
      } catch(e) {}
      return { ok: false, error: 'Lyric not available' };
    }
    // LX 音源导入（支持文件导入 {fileName,script} 和链接导入 {url}）
    if (pn === '/api/lx-source/import') {
      try {
        var scriptText = body.script || '';
        var fileName = body.fileName || '';

        // 链接导入：从 URL 下载脚本
        if (!scriptText && (body.url || q.url)) {
          var sourceUrl = body.url || q.url;
          var resp;
          if (window.MineradioHttp) {
            var httpResult = await window.MineradioHttp.request({
              url: sourceUrl,
              method: 'GET',
              headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36' },
              timeout: 15000,
            });
            if (!httpResult.ok) return { ok: false, error: '下载音源失败: HTTP ' + httpResult.status };
            resp = { text: function() { return httpResult.data; } };
          } else {
            resp = await fetch(sourceUrl);
            if (!resp.ok) return { ok: false, error: '下载音源失败: HTTP ' + resp.status };
          }
          scriptText = await resp.text();
          fileName = sourceUrl.split('/').pop() || 'source.js';
        }

        if (!scriptText || scriptText.length < 10) return { ok: false, error: '音源内容为空或无效' };

        // 解析脚本提取音源名称
        var sourceName = '自定义音源';
        try {
          var sourceModule = { exports: {} };
          var moduleFn = new Function('module', 'exports', 'require', scriptText);
          moduleFn(sourceModule, sourceModule.exports, function() { return {}; });
          var exported = sourceModule.exports.default || sourceModule.exports;
          if (exported && typeof exported === 'object') {
            sourceName = exported.name || exported.sourceName || fileName.replace(/\.js$/i, '') || '自定义音源';
          }
        } catch(evalErr) {
          // 解析失败仍允许导入
          sourceName = fileName.replace(/\.js$/i, '') || '自定义音源';
        }

        // 存储到 localStorage（支持多音源）
        try {
          var existingSources = [];
          try { existingSources = JSON.parse(localStorage.getItem('mineradio-lx-sources') || '[]'); } catch(e) {}
          var newSource = { name: sourceName, script: scriptText, fileName: fileName, time: Date.now() };
          // 去重：同名覆盖
          existingSources = existingSources.filter(function(s) { return s.name !== sourceName; });
          existingSources.push(newSource);
          localStorage.setItem('mineradio-lx-sources', JSON.stringify(existingSources));
          localStorage.setItem('mineradio-lx-source-name', sourceName);
          localStorage.setItem('mineradio-lx-source-script', scriptText);
        } catch(e) {}

        return { ok: true, name: sourceName, message: '音源导入成功: ' + sourceName };
      } catch(e) {
        return { ok: false, error: '导入失败: ' + e.message };
      }
    }
    // LX 音源选择（支持内置源和自定义源）
    if (pn === '/api/lx-source/select') {
      var selectedSource = body.source || q.source || '';
      if (!selectedSource) return { ok: false, error: '请指定音源' };
      var validSources = ['wy', 'tx', 'mg', 'kg', 'kw'];
      var sourceNames = { wy: '网易云音乐', tx: 'QQ音乐', mg: '咪咕音乐', kg: '酷狗音乐', kw: '酷我音乐' };

      if (validSources.indexOf(selectedSource) !== -1) {
        // 选择内置源：清除自定义脚本
        try { localStorage.setItem('mineradio-lx-active-source', selectedSource); } catch(e) {}
        try { localStorage.removeItem('mineradio-lx-source-script'); } catch(e) {}
        try { localStorage.setItem('mineradio-lx-source-name', sourceNames[selectedSource]); } catch(e) {}
        return { ok: true, source: selectedSource, name: sourceNames[selectedSource], type: 'builtin' };
      }

      // 选择自定义源：从存储中查找并激活
      try {
        var storedSources = JSON.parse(localStorage.getItem('mineradio-lx-sources') || '[]');
        var found = storedSources.find(function(s) { return s.name === selectedSource; });
        if (found) {
          localStorage.setItem('mineradio-lx-source-script', found.script);
          localStorage.setItem('mineradio-lx-source-name', found.name);
          localStorage.setItem('mineradio-lx-active-source', 'custom');
          return { ok: true, source: 'custom', name: found.name, type: 'custom' };
        }
      } catch(e) {}

      return { ok: false, error: '未找到音源: ' + selectedSource };
    }
    if (pn === '/api/platform-lyric') {
      var source = q.source || '';
      var id = q.id || '';
      try {
        if (source === 'wy' && id) {
          var lyricResp = await ncFetch('https://music.163.com/api/song/lyric?id=' + id + '&lv=1&kv=1&tv=1');
          var lyricData = await lyricResp.json();
          return { lyric: lyricData && lyricData.lrc && lyricData.lrc.lyric || '', tlyric: lyricData && lyricData.tlyric && lyricData.tlyric.lyric || '', yrc: lyricData && lyricData.yrc && lyricData.yrc.lyric || '' };
        }
        if (source === 'tx' && id) {
          return await qqLyric(id);
        }
      } catch (e) {}
      return { lyric: '', tlyric: '' };
    }
    // 版本
    if (pn === '/api/app/version') return { version: '1.1.0-android', platform: 'android' };
    // 更新
    if (pn === '/api/update/latest') return { available: false };
    if (pn === '/api/update/download') return { ok: false, message: 'use app store' };
    if (pn === '/api/update/download/status') return { status: 'idle' };
    // LX 控制
    if (pn === '/api/lx/control') return { ok: true, message: 'Mobile mode' };
    if (pn === '/api/lx/status') return { ok: false, error: 'LX not available' };
    if (pn === '/api/lx/playlists') return { playlists: [] };
    // Beatmap
    if (pn === '/api/beatmap/cache/status') return { ok: true, cached: 0 };
    if (pn === '/api/beatmap/cache') return { ok: true, data: null };
    if (pn === '/api/podcast/dj-beatmap') return { beatmap: null, message: 'not available on mobile' };
    // 歌单导入
    if (pn === '/api/platform-playlist/import') {
      if (typeof platformPlaylistImport !== 'undefined' && platformPlaylistImport.importPlaylist) {
        return await platformPlaylistImport.importPlaylist(body);
      }
      return { ok: false, error: 'Import not available' };
    }

    console.warn('[Mineradio Mobile] Unhandled API:', pn);
    return { code: 404, message: 'not found: ' + pn };
  }

  console.log('[Mineradio Mobile] API bridge loaded');
})();
