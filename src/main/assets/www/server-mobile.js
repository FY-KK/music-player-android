// Mineradio Mobile Server - Android WebView 版本
// 将 server.js 的核心功能移植到浏览器环境

(function() {
  'use strict';

  const MOBILE_API = window.MOBILE_API_ORIGIN || '';

  // 拦截 fetch 请求，模拟 API 响应
  const originalFetch = window.fetch;
  window.fetch = async function(url, options) {
    const urlStr = typeof url === 'string' ? url : url.url || '';

    // 处理本地 API 请求
    if (urlStr.startsWith('/api/') || urlStr.startsWith(MOBILE_API + '/api/')) {
      return handleApiRequest(urlStr, options);
    }

    return originalFetch.call(this, url, options);
  };

  // 处理 XMLHttpRequest
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    this._mobileUrl = url;
    this._mobileMethod = method;
    return originalXHROpen.call(this, method, url, ...args);
  };

  XMLHttpRequest.prototype.send = function(body) {
    if (this._mobileUrl && (this._mobileUrl.startsWith('/api/') || this._mobileUrl.startsWith(MOBILE_API + '/api/'))) {
      handleApiRequest(this._mobileUrl, { method: this._mobileMethod, body })
        .then(response => response.json())
        .then(data => {
          Object.defineProperty(this, 'responseText', { value: JSON.stringify(data) });
          Object.defineProperty(this, 'status', { value: 200 });
          this.dispatchEvent(new Event('load'));
          this.dispatchEvent(new Event('loadend'));
        })
        .catch(err => {
          Object.defineProperty(this, 'status', { value: 500 });
          this.dispatchEvent(new Event('error'));
          this.dispatchEvent(new Event('loadend'));
        });
      return;
    }
    return originalXHRSend.call(this, body);
  };

  // API 路由处理
  async function handleApiRequest(urlStr, options) {
    const url = new URL(urlStr, 'http://localhost');
    const pathname = url.pathname;

    try {
      let data;

      // 版本信息
      if (pathname === '/api/app/version') {
        data = {
          name: 'mineradio',
          productName: 'Mineradio',
          version: '1.0.0-mobile',
          update: { provider: 'github', configured: false }
        };
      }
      // LX Source 状态
      else if (pathname === '/api/lx-source/status') {
        data = await getLxSourceStatus();
      }
      // LX Source 搜索
      else if (pathname === '/api/lx-source/search') {
        const query = url.searchParams.get('q') || '';
        const limit = parseInt(url.searchParams.get('limit') || '30');
        data = await searchLxSource(query, limit);
      }
      // LX Source 解析
      else if (pathname === '/api/lx-source/resolve') {
        const body = await parseBody(options);
        data = await resolveLxSource(body);
      }
      // LX Source 歌词
      else if (pathname === '/api/lx-source/lyric') {
        const body = await parseBody(options);
        data = await getLxLyric(body);
      }
      // 平台歌词
      else if (pathname === '/api/platform-lyric') {
        data = await getPlatformLyric(url.searchParams);
      }
      // 音频代理
      else if (pathname === '/api/audio') {
        const audioUrl = url.searchParams.get('url') || '';
        return handleAudioProxy(audioUrl);
      }
      // 图片代理
      else if (pathname === '/api/image-proxy' || pathname === '/api/cover') {
        const imageUrl = url.searchParams.get('url') || '';
        return handleImageProxy(imageUrl);
      }
      // 搜索
      else if (pathname === '/api/search') {
        const keywords = url.searchParams.get('keywords') || '';
        data = await searchMusic(keywords);
      }
      // 歌词
      else if (pathname === '/api/lyric') {
        const id = url.searchParams.get('id') || '';
        data = await getLyric(id);
      }
      // LX 控制
      else if (pathname === '/api/lx/control') {
        data = { ok: true, message: 'Mobile mode - LX control not available' };
      }
      // LX 状态
      else if (pathname === '/api/lx/status') {
        data = { ok: false, error: 'LX not available in mobile mode' };
      }
      // LX 歌单
      else if (pathname === '/api/lx/playlists') {
        data = { playlists: [] };
      }
      // 节拍缓存
      else if (pathname === '/api/beatmap/cache/status') {
        data = { ok: true, cached: 0 };
      }
      else if (pathname === '/api/beatmap/cache') {
        data = { ok: true, data: null };
      }
      // 平台歌单导入
      else if (pathname === '/api/platform-playlist/import') {
        const body = await parseBody(options);
        data = await importPlatformPlaylist(body);
      }
      // 默认 404
      else {
        data = { ok: false, error: 'Not found' };
      }

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (err) {
      console.error('[MobileAPI]', pathname, err);
      return new Response(JSON.stringify({ ok: false, error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // 解析请求体
  async function parseBody(options) {
    if (!options || !options.body) return {};
    if (typeof options.body === 'string') {
      try { return JSON.parse(options.body); } catch { return {}; }
    }
    if (options.body instanceof FormData) {
      const obj = {};
      options.body.forEach((value, key) => { obj[key] = value; });
      return obj;
    }
    return options.body || {};
  }

  // LX Source 相关功能
  async function getLxSourceStatus() {
    return {
      ok: true,
      sources: {
        wy: { available: true, name: '网易云音乐' },
        tx: { available: true, name: 'QQ音乐' },
        mg: { available: true, name: '咪咕音乐' },
        kg: { available: true, name: '酷狗音乐' },
        kw: { available: true, name: '酷我音乐' }
      }
    };
  }

  async function searchLxSource(query, limit) {
    // 使用 lx-source-host 的搜索功能
    if (typeof lxSourceHost !== 'undefined' && lxSourceHost.search) {
      return await lxSourceHost.search(query, { limit });
    }
    return { ok: false, error: 'Search not available' };
  }

  async function resolveLxSource(body) {
    if (typeof lxSourceHost !== 'undefined' && lxSourceHost.resolveMusicUrl) {
      const { source, musicInfo, quality } = body;
      return await lxSourceHost.resolveMusicUrl(source, musicInfo, quality);
    }
    return { ok: false, error: 'Resolve not available' };
  }

  async function getLxLyric(body) {
    if (typeof lxSourceHost !== 'undefined' && lxSourceHost.resolveLyrics) {
      const { source, musicInfo } = body;
      return await lxSourceHost.resolveLyrics(source, musicInfo);
    }
    return { ok: false, error: 'Lyric not available' };
  }

  // 平台歌词获取
  async function getPlatformLyric(params) {
    const source = params.get('source') || '';
    const id = params.get('id') || '';
    const hash = params.get('hash') || '';

    try {
      if (source === 'wy' && id) {
        const resp = await fetch(`https://music.163.com/api/song/lyric?id=${id}&lv=1&kv=1&tv=1`);
        const data = await resp.json();
        return {
          lyric: data?.lrc?.lyric || '',
          tlyric: data?.tlyric?.lyric || '',
          yrc: data?.yrc?.lyric || ''
        };
      }
      if (source === 'tx' && id) {
        const resp = await fetch(`https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?songmid=${id}&format=json&nobase64=1`, {
          headers: { 'Referer': 'https://y.qq.com/' }
        });
        const data = await resp.json();
        return { lyric: data.lyric || '', tlyric: data.trans || '' };
      }
      return { lyric: '', tlyric: '' };
    } catch (err) {
      return { lyric: '', tlyric: '' };
    }
  }

  // 搜索音乐
  async function searchMusic(keywords) {
    if (typeof lxSearch !== 'undefined' && lxSearch.searchAll) {
      return await lxSearch.searchAll(keywords, { limit: 30 });
    }
    return { songs: [], error: 'Search not available' };
  }

  // 获取歌词
  async function getLyric(id) {
    try {
      const resp = await fetch(`https://music.163.com/api/song/lyric?id=${id}&lv=1&kv=1&tv=1`);
      return await resp.json();
    } catch {
      return { lrc: { lyric: '' } };
    }
  }

  // 音频代理
  async function handleAudioProxy(url) {
    try {
      const response = await fetch(url, {
        headers: { 'Range': 'bytes=0-' }
      });
      return new Response(response.body, {
        status: response.status,
        headers: {
          'Content-Type': response.headers.get('Content-Type') || 'audio/mpeg',
          'Accept-Ranges': 'bytes',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (err) {
      return new Response('Audio proxy error', { status: 500 });
    }
  }

  // 图片代理
  async function handleImageProxy(url) {
    try {
      const response = await fetch(url);
      return new Response(response.body, {
        status: response.status,
        headers: {
          'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch {
      return new Response('', { status: 404 });
    }
  }

  // 平台歌单导入
  async function importPlatformPlaylist(body) {
    if (typeof platformPlaylistImport !== 'undefined' && platformPlaylistImport.importPlaylist) {
      return await platformPlaylistImport.importPlaylist(body);
    }
    return { ok: false, error: 'Import not available' };
  }

  console.log('[Mineradio Mobile] API bridge loaded');
})();
