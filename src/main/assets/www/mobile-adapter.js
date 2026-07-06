// Mineradio Mobile Adapter v7 — 参照 Mineradio_1.1.5 重构

(function() {
  'use strict';

  var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  var isSmallScreen = window.innerWidth <= 768;

  if (!isMobile && !isSmallScreen) return;

  console.log('[MobileAdapter] 初始化 v7');

  // ── 平台标记 ──
  window.__MINERADIO_ANDROID__ = true;
  window.__MINERADIO_PLATFORM__ = 'android';

  // ── 添加 class 和 data 属性标记 ──
  document.documentElement.classList.add('mobile-device');
  document.body.classList.add('mobile-device');
  if (isMobile) document.documentElement.classList.add('is-mobile');
  if (/Android/i.test(navigator.userAgent)) document.documentElement.classList.add('is-android');

  // ── data-screen / data-orientation (参照 1.1.5) ──
  function updateScreenAttrs() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    document.body.setAttribute('data-screen', (w <= 760 || h <= 500) ? 'small' : 'large');
    document.body.setAttribute('data-orientation', w > h ? 'landscape' : 'portrait');
  }
  updateScreenAttrs();
  window.addEventListener('resize', updateScreenAttrs);
  window.addEventListener('orientationchange', function() {
    setTimeout(updateScreenAttrs, 200);
  });

  // ── require() mock ──
  if (typeof window.require === 'undefined') {
    window.require = function() { return {}; };
  }

  // ── MineradioHttp 原生 HTTP 桥接 ──
  // 将 Capacitor 插件暴露为 window.MineradioHttp，供 server-mobile.js 绕过 CORS
  if (!window.MineradioHttp && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.MinoradioHttp) {
    window.MineradioHttp = {
      request: function(opts) {
        return window.Capacitor.Plugins.MinoradioHttp.request(opts);
      }
    };
    console.log('[MobileAdapter] MineradioHttp 桥接已就绪');
  } else if (!window.MineradioHttp) {
    console.warn('[MobileAdapter] MineradioHttp 插件不可用，跨域请求将受限');
  }

  // ══════════════════════════════════════════════
  //  Electron API 兼容层
  // ══════════════════════════════════════════════
  function setupElectronCompat() {
    window.electronAPI = {
      minimizeWindow: function() {},
      toggleMaximize: function() {},
      toggleFullscreen: function() {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen();
        }
      },
      exitFullscreen: function() {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      },
      getWindowState: async function() {
        return {
          isMaximized: true,
          isNativeFullScreen: false,
          isHtmlFullScreen: false,
          isWindowFullScreen: false,
          isFullScreen: true,
          isMinimized: false,
          isVisible: true,
          isFocused: true,
          isPrimaryDisplay: true,
        };
      },

      openNeteaseLogin: function() {
        window.open('https://music.163.com/#/login', '_blank', 'width=800,height=600');
      },
      clearNeteaseLogin: function() {
        localStorage.removeItem('mineradio-netease-cookie');
      },
      openQQLogin: function() {
        window.open('https://y.qq.com/n/ryqq/profile', '_blank', 'width=800,height=600');
      },
      clearQQLogin: function() {
        localStorage.removeItem('mineradio-qq-cookie');
      },

      exportJsonFile: async function(data) {
        try {
          var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'mineradio-export-' + Date.now() + '.json';
          a.click();
          return { ok: true };
        } catch (e) {
          return { ok: false, error: e.message };
        }
      },
      importJsonFile: async function() {
        return new Promise(function(resolve) {
          var input = document.createElement('input');
          input.type = 'file';
          input.accept = '.json';
          input.onchange = function(e) {
            var f = e.target.files[0];
            if (!f) return resolve({ ok: false, cancelled: true });
            var reader = new FileReader();
            reader.onload = function() {
              try { resolve({ ok: true, data: JSON.parse(reader.result) }); }
              catch (err) { resolve({ ok: false, error: 'Invalid JSON' }); }
            };
            reader.readAsText(f);
          };
          input.click();
        });
      },

      configureGlobalHotkeys: function() { return { ok: false, skipped: true }; },
      openUpdateInstaller: function() {},
      restartApp: function() { window.location.reload(); },

      setDesktopLyricsEnabled: function() {},
      updateDesktopLyrics: function() {},
      setDesktopLyricsDragging: function() {},
      setWallpaperEnabled: function() {},
      updateWallpaper: function() {},

      onWindowState: function(cb) {
        cb && cb({ isMaximized: true, isFullScreen: true, isVisible: true, isFocused: true });
      },
      onWindowStateUnsubscribe: function() {},
      onUpdateAvailable: function() {},
      onUpdateDownloadProgress: function() {},
    };

    window.Capacitor = window.Capacitor || { isNative: true, isAndroid: true, platform: 'android' };
  }

  // ══════════════════════════════════════════════
  //  触摸适配: 长按模拟右键
  // ══════════════════════════════════════════════
  function setupTouchAdaptation() {
    var longPressTimer;
    var touchStartPos;

    document.addEventListener('touchstart', function(e) {
      touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      longPressTimer = setTimeout(function() {
        var touch = e.touches[0];
        var contextMenuEvent = new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: touch.clientX,
          clientY: touch.clientY,
          button: 2,
        });
        e.target.dispatchEvent(contextMenuEvent);
      }, 600);
    }, { passive: true });

    document.addEventListener('touchmove', function(e) {
      if (touchStartPos) {
        var dx = Math.abs(e.touches[0].clientX - touchStartPos.x);
        var dy = Math.abs(e.touches[0].clientY - touchStartPos.y);
        if (dx > 10 || dy > 10) clearTimeout(longPressTimer);
      }
    }, { passive: true });

    document.addEventListener('touchend', function() {
      clearTimeout(longPressTimer);
    }, { passive: true });
  }

  // ══════════════════════════════════════════════
  //  安全区域 + 隐藏桌面控件
  // ══════════════════════════════════════════════
  function setupSafeArea() {
    var style = document.createElement('style');
    style.textContent = [
      ':root {',
      '  --safe-area-top: env(safe-area-inset-top, 0px);',
      '  --safe-area-bottom: env(safe-area-inset-bottom, 0px);',
      '  --safe-area-left: env(safe-area-inset-left, 0px);',
      '  --safe-area-right: env(safe-area-inset-right, 0px);',
      '}',
      '#player-bar, #control-panel, #bottom-player {',
      '  padding-bottom: max(12px, var(--safe-area-bottom)) !important;',
      '}',
    ].join('\n');
    document.head.appendChild(style);
  }

  // ══════════════════════════════════════════════
  //  侧边滑动退出
  // ══════════════════════════════════════════════
  var swipeState = {
    leftCount: 0,
    rightCount: 0,
    lastSwipeTime: 0,
    lastSwipeSide: null,
    timer: null
  };
  var hint = null;

  function createHintElement() {
    hint = document.createElement('div');
    hint.id = 'swipe-exit-hint';
    document.body.appendChild(hint);
  }

  function showHint(text, side) {
    if (!hint) return;
    hint.textContent = text;
    hint.className = (side || 'center') + ' show';
    if (swipeState.timer) clearTimeout(swipeState.timer);
    swipeState.timer = setTimeout(function() {
      hint.className = '';
    }, 1500);
  }

  // 全局函数: 返回键提示
  window.showBackPressHint = function() {
    showHint('再按一次返回键退出应用', 'center');
  };

  function setupSwipeExit() {
    var touchStartX = 0;
    var touchStartY = 0;
    var isSwiping = false;
    var swipeSide = null;

    document.addEventListener('touchstart', function(e) {
      var touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      isSwiping = false;
      swipeSide = null;

      var edgeThreshold = 30;
      if (touchStartX < edgeThreshold) {
        swipeSide = 'left';
        isSwiping = true;
      } else if (touchStartX > window.innerWidth - edgeThreshold) {
        swipeSide = 'right';
        isSwiping = true;
      }
    }, { passive: true });

    document.addEventListener('touchmove', function(e) {
      if (!isSwiping) return;
      var touch = e.touches[0];
      var deltaX = touch.clientX - touchStartX;
      var deltaY = Math.abs(touch.clientY - touchStartY);

      if (deltaY > 50) {
        isSwiping = false;
        return;
      }

      if (swipeSide === 'left' && deltaX > 100) {
        isSwiping = false;
        handleEdgeSwipe('left');
      } else if (swipeSide === 'right' && deltaX < -100) {
        isSwiping = false;
        handleEdgeSwipe('right');
      }
    }, { passive: true });

    document.addEventListener('touchend', function() {
      isSwiping = false;
    }, { passive: true });

    function handleEdgeSwipe(side) {
      var now = Date.now();
      if (now - swipeState.lastSwipeTime > 1500) {
        swipeState.leftCount = 0;
        swipeState.rightCount = 0;
      }
      if (swipeState.lastSwipeSide && swipeState.lastSwipeSide !== side) {
        swipeState.leftCount = 0;
        swipeState.rightCount = 0;
      }

      if (side === 'left') swipeState.leftCount++;
      else swipeState.rightCount++;

      swipeState.lastSwipeTime = now;
      swipeState.lastSwipeSide = side;

      var count = side === 'left' ? swipeState.leftCount : swipeState.rightCount;
      if (count >= 2) {
        exitApp();
      } else {
        showHint('再滑动' + (2 - count) + '次退出应用', side);
      }
    }
  }

  // ══════════════════════════════════════════════
  //  返回按钮
  // ══════════════════════════════════════════════
  function setupBackButton() {
    history.pushState({ page: 'home' }, '', '');
  }

  // ══════════════════════════════════════════════
  //  退出应用
  // ══════════════════════════════════════════════
  function exitApp() {
    showHint('正在退出...', 'center');
    swipeState.leftCount = 0;
    swipeState.rightCount = 0;

    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
      window.Capacitor.Plugins.App.exitApp();
    } else if (window.Android && window.Android.exitApp) {
      window.Android.exitApp();
    } else if (navigator.app && navigator.app.exitApp) {
      navigator.app.exitApp();
    } else {
      window.close();
    }
  }

  // ══════════════════════════════════════════════
  //  布局修复 (CSS 已处理主要布局，仅修复溢出)
  // ══════════════════════════════════════════════
  function fixLayout() {
    document.body.style.overflowX = 'hidden';
    document.documentElement.style.overflowX = 'hidden';
  }

  // ══════════════════════════════════════════════
  //  DOM 变化监听
  // ══════════════════════════════════════════════
  function observeDOM() {
    var debounceTimer = null;
    var observer = new MutationObserver(function(mutations) {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function() {
        var hasNewNodes = mutations.some(function(m) { return m.addedNodes.length > 0; });
        if (hasNewNodes) fixLayout();
      }, 150);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ══════════════════════════════════════════════
  //  初始化
  // ══════════════════════════════════════════════
  function init() {
    setupElectronCompat();
    setupSafeArea();
    setupTouchAdaptation();
    fixLayout();
    createHintElement();
    setupSwipeExit();
    setupBackButton();
    observeDOM();

    var rafId = null;
    function scheduleFix() {
      if (rafId) return;
      rafId = requestAnimationFrame(function() {
        fixLayout();
        rafId = null;
      });
    }

    window.addEventListener('resize', scheduleFix);
    window.addEventListener('orientationchange', function() {
      setTimeout(fixLayout, 300);
    });

    console.log('[MobileAdapter] 初始化完成 v6');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('load', function() {
    setTimeout(fixLayout, 200);
  });

})();
