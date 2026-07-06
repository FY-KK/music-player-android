// Mineradio Mobile Server v2 — 完整 API 路由
// 参照 Mineradio-Android 的 patch-index.js 内联适配层

(function() {
  'use strict';

  console.log('[Mineradio Mobile] API bridge loading...');

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

  async function ncApi(pathStr, params, opts) {
    opts = opts || {};
    var url = NC_API + pathStr;
    var body = new URLSearchParams(params).toString();
    // 优先使用原生 HTTP 插件绕过 CORS
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
      return JSON.parse(result.data);
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
      return { json: function() { return JSON.parse(result.data); }, text: function() { return result.data; }, ok: result.ok, status: result.status };
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

    // LX Source (保留原有功能)
    if (pn === '/api/lx-source/status') {
      return {
        ok: true,
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
      if (typeof lxSourceHost !== 'undefined' && lxSourceHost.search) {
        return await lxSourceHost.search(q.q || q.keywords, { limit: Number(q.limit) || 30 });
      }
      return { ok: false, error: 'Search not available' };
    }
    if (pn === '/api/lx-source/resolve') {
      if (typeof lxSourceHost !== 'undefined' && lxSourceHost.resolveMusicUrl) {
        return await lxSourceHost.resolveMusicUrl(body.source, body.musicInfo, body.quality);
      }
      return { ok: false, error: 'Resolve not available' };
    }
    if (pn === '/api/lx-source/lyric') {
      if (typeof lxSourceHost !== 'undefined' && lxSourceHost.resolveLyrics) {
        return await lxSourceHost.resolveLyrics(body.source, body.musicInfo);
      }
      return { ok: false, error: 'Lyric not available' };
    }
    // LX 音源导入
    if (pn === '/api/lx-source/import') {
      var sourceUrl = body.url || q.url || '';
      if (!sourceUrl) return { ok: false, error: '请提供音源 URL' };
      try {
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
        var scriptText = await resp.text();
        if (!scriptText || scriptText.length < 10) return { ok: false, error: '音源内容为空或无效' };
        try {
          var sourceModule = { exports: {} };
          var moduleFn = new Function('module', 'exports', 'require', scriptText);
          moduleFn(sourceModule, sourceModule.exports, function() { return {}; });
          var exported = sourceModule.exports.default || sourceModule.exports;
          if (exported && typeof exported === 'object') {
            var sourceName = exported.name || exported.sourceName || '自定义音源';
            try { localStorage.setItem('mineradio-lx-source-name', sourceName); } catch(e) {}
            try { localStorage.setItem('mineradio-lx-source-script', scriptText); } catch(e) {}
            return { ok: true, name: sourceName, message: '音源导入成功: ' + sourceName };
          }
          return { ok: true, name: '自定义音源', message: '音源脚本已导入' };
        } catch(evalErr) {
          try { localStorage.setItem('mineradio-lx-source-script', scriptText); } catch(e) {}
          return { ok: true, name: '自定义音源', message: '音源脚本已导入（未解析元数据）' };
        }
      } catch(e) {
        return { ok: false, error: '导入失败: ' + e.message };
      }
    }
    // LX 音源选择
    if (pn === '/api/lx-source/select') {
      var selectedSource = body.source || q.source || '';
      if (!selectedSource) return { ok: false, error: '请指定音源' };
      var validSources = ['wy', 'tx', 'mg', 'kg', 'kw'];
      if (validSources.indexOf(selectedSource) === -1) {
        return { ok: false, error: '不支持的音源: ' + selectedSource };
      }
      try { localStorage.setItem('mineradio-lx-active-source', selectedSource); } catch(e) {}
      var sourceNames = { wy: '网易云音乐', tx: 'QQ音乐', mg: '咪咕音乐', kg: '酷狗音乐', kw: '酷我音乐' };
      return { ok: true, source: selectedSource, name: sourceNames[selectedSource] || selectedSource };
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
