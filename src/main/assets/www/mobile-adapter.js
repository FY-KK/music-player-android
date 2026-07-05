// Mineradio Mobile Adapter v2 - 手机端交互适配

(function() {
  'use strict';

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);

  if (!isMobile) return;

  console.log('[MobileAdapter] 初始化移动端适配 v2');

  // 添加移动端标记
  document.documentElement.classList.add('mobile-device');
  if (isAndroid) document.documentElement.classList.add('android-device');

  function initMobileAdapter() {
    // 1. 强制修改viewport
    forceViewport();

    // 2. 重写全局样式
    overrideGlobalStyles();

    // 3. 修复布局
    fixLayout();

    // 4. 禁用桌面功能
    disableDesktopFeatures();

    // 5. 修复滚动
    fixScrolling();

    // 6. 添加触摸支持
    addTouchSupport();

    // 7. 监听动态内容
    observeDOM();

    // 8. 定时修复
    setInterval(fixLayout, 1000);

    console.log('[MobileAdapter] 适配完成');
  }

  // 强制修改viewport
  function forceViewport() {
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';

    // 防止缩放
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.addEventListener('gesturechange', e => e.preventDefault());
    document.addEventListener('gestureend', e => e.preventDefault());

    // 防止双击
    let lastTouch = 0;
    document.addEventListener('touchend', e => {
      const now = Date.now();
      if (now - lastTouch < 300) e.preventDefault();
      lastTouch = now;
    }, { passive: false });
  }

  // 重写全局样式
  function overrideGlobalStyles() {
    const style = document.createElement('style');
    style.id = 'mobile-override';
    style.textContent = `
      html.mobile-device,
      html.mobile-device body {
        overflow: auto !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        height: auto !important;
        min-height: 100vh !important;
        width: 100vw !important;
        max-width: 100vw !important;
        position: relative !important;
        touch-action: pan-y !important;
        -webkit-overflow-scrolling: touch !important;
      }

      html.mobile-device * {
        max-width: 100vw !important;
        box-sizing: border-box !important;
      }

      html.mobile-device #desktop-window-shell {
        display: block !important;
        position: relative !important;
        inset: auto !important;
        overflow: visible !important;
        border-radius: 0 !important;
        clip-path: none !important;
        box-shadow: none !important;
        transform: none !important;
        width: 100vw !important;
        max-width: 100vw !important;
        min-height: 100vh !important;
      }

      html.mobile-device #desktop-titlebar,
      html.mobile-device .desktop-mode-btn,
      html.mobile-device .desktop-window-controls,
      html.mobile-device .desktop-resize-handle,
      html.mobile-device .desktop-drag-region,
      html.mobile-device #fullscreen-diy-zone {
        display: none !important;
      }

      html.mobile-device #search-area {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        width: 100vw !important;
        max-width: 100vw !important;
        transform: none !important;
        padding: 8px !important;
        z-index: 100 !important;
      }

      html.mobile-device #search-stack {
        width: 100% !important;
        max-width: 100% !important;
      }

      html.mobile-device #search-box {
        width: 100% !important;
        height: 44px !important;
      }

      html.mobile-device #search-results {
        width: 100% !important;
        max-width: 100% !important;
        max-height: 60vh !important;
        left: 0 !important;
      }

      html.mobile-device #top-right {
        position: fixed !important;
        top: 56px !important;
        right: 8px !important;
        z-index: 90 !important;
      }

      html.mobile-device .wallpaper-picker-card,
      html.mobile-device .playlist-select-dialog,
      html.mobile-device .playlist-import-dialog,
      html.mobile-device .modal-card,
      html.mobile-device .dialog-card {
        width: 95vw !important;
        max-width: 95vw !important;
        max-height: 85vh !important;
        margin: 5vh auto !important;
        overflow: auto !important;
      }

      html.mobile-device .wallpaper-picker-grid {
        grid-template-columns: 1fr !important;
      }

      html.mobile-device .main-view,
      html.mobile-device .content-area,
      html.mobile-device .scene,
      html.mobile-device .view {
        width: 100vw !important;
        max-width: 100vw !important;
        padding: 60px 8px 100px !important;
        overflow-x: hidden !important;
      }

      html.mobile-device .song-list,
      html.mobile-device .track-list,
      html.mobile-device .result-list {
        width: 100% !important;
        max-width: 100% !important;
        max-height: calc(100vh - 180px) !important;
        overflow-y: auto !important;
        -webkit-overflow-scrolling: touch !important;
      }

      html.mobile-device .song-item,
      html.mobile-device .track-item,
      html.mobile-device .list-item {
        width: 100% !important;
        max-width: 100% !important;
        padding: 10px 6px !important;
        flex-wrap: wrap !important;
      }

      html.mobile-device button,
      html.mobile-device .btn,
      html.mobile-device [role="button"] {
        min-height: 44px !important;
        min-width: 44px !important;
      }

      html.mobile-device input,
      html.mobile-device textarea {
        font-size: 16px !important;
        width: 100% !important;
      }

      html.mobile-device img,
      html.mobile-device video,
      html.mobile-device canvas {
        max-width: 100% !important;
      }

      html.mobile-device .cover-art,
      html.mobile-device .album-art {
        max-width: 80vw !important;
        max-height: 80vw !important;
      }

      html.mobile-device .lyrics-container {
        width: 100% !important;
        max-height: 40vh !important;
        overflow-y: auto !important;
      }

      html.mobile-device .grid,
      html.mobile-device .grid-view {
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 8px !important;
      }

      html.mobile-device .sidebar,
      html.mobile-device .side-panel {
        width: 80vw !important;
        max-width: 300px !important;
      }

      html.mobile-device .splash-wordmark {
        font-size: clamp(28px, 10vw, 50px) !important;
        width: 90vw !important;
        min-width: auto !important;
        height: auto !important;
      }

      html.mobile-device .splash-signal-line {
        width: 80vw !important;
      }

      /* 安全区域 */
      @supports (padding-top: env(safe-area-inset-top)) {
        html.mobile-device body {
          padding-top: env(safe-area-inset-top) !important;
          padding-left: env(safe-area-inset-left) !important;
          padding-right: env(safe-area-inset-right) !important;
        }

        html.mobile-device #search-area {
          padding-top: calc(env(safe-area-inset-top) + 8px) !important;
        }

        html.mobile-device .player-bar,
        html.mobile-device #player-bar {
          padding-bottom: env(safe-area-inset-bottom) !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // 修复布局
  function fixLayout() {
    // 强制body尺寸
    document.body.style.overflow = 'auto';
    document.body.style.overflowX = 'hidden';
    document.body.style.overflowY = 'auto';
    document.body.style.height = 'auto';
    document.body.style.minHeight = '100vh';
    document.body.style.width = '100vw';
    document.body.style.maxWidth = '100vw';

    document.documentElement.style.overflow = 'auto';
    document.documentElement.style.overflowY = 'auto';
    document.documentElement.style.height = 'auto';
    document.documentElement.style.width = '100vw';
    document.documentElement.style.maxWidth = '100vw';

    // 修复desktop-window-shell
    const shell = document.getElementById('desktop-window-shell');
    if (shell) {
      shell.style.display = 'block';
      shell.style.position = 'relative';
      shell.style.inset = 'auto';
      shell.style.overflow = 'visible';
      shell.style.borderRadius = '0';
      shell.style.clipPath = 'none';
      shell.style.boxShadow = 'none';
      shell.style.transform = 'none';
      shell.style.width = '100vw';
      shell.style.maxWidth = '100vw';
      shell.style.minHeight = '100vh';
    }

    // 修复搜索区域
    const searchArea = document.getElementById('search-area');
    if (searchArea) {
      searchArea.style.position = 'fixed';
      searchArea.style.top = '0';
      searchArea.style.left = '0';
      searchArea.style.right = '0';
      searchArea.style.width = '100vw';
      searchArea.style.maxWidth = '100vw';
      searchArea.style.transform = 'none';
      searchArea.style.padding = '8px';
    }

    const searchStack = document.getElementById('search-stack');
    if (searchStack) {
      searchStack.style.width = '100%';
      searchStack.style.maxWidth = '100%';
    }

    // 修复弹窗
    document.querySelectorAll('.wallpaper-picker-card, .playlist-select-dialog, .playlist-import-dialog').forEach(el => {
      el.style.width = '95vw';
      el.style.maxWidth = '95vw';
      el.style.maxHeight = '85vh';
      el.style.overflow = 'auto';
    });

    // 修复所有固定宽度元素
    document.querySelectorAll('[style*="width"]').forEach(el => {
      const w = el.style.width;
      if (w && w.includes('px') && parseInt(w) > window.innerWidth) {
        el.style.width = '100vw';
        el.style.maxWidth = '100vw';
      }
    });
  }

  // 禁用桌面功能
  function disableDesktopFeatures() {
    const hideSelectors = [
      '#desktop-titlebar',
      '.desktop-mode-btn',
      '.desktop-window-controls',
      '.desktop-resize-handle',
      '.desktop-drag-region',
      '#fullscreen-diy-zone'
    ];

    hideSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        el.style.display = 'none';
      });
    });
  }

  // 修复滚动
  function fixScrolling() {
    const scrollableSelectors = [
      '.song-list', '.track-list', '.playlist-list', '.result-list',
      '.list-view', '.list-container', '[class*="list"]',
      '.lyrics-container', '.lyrics-view',
      '.wallpaper-picker-card', '.playlist-select-dialog',
      '.playlist-import-dialog', '.modal-content'
    ];

    scrollableSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        el.style.overflowY = 'auto';
        el.style.overflowX = 'hidden';
        el.style.webkitOverflowScrolling = 'touch';
        el.style.touchAction = 'pan-y';
        el.style.maxHeight = el.style.maxHeight || '70vh';
      });
    });

    // 为整个页面启用滚动
    document.body.style.touchAction = 'pan-y';
  }

  // 添加触摸支持
  function addTouchSupport() {
    // 触摸反馈
    const addFeedback = (el) => {
      if (el._touchFeedbackAdded) return;
      el._touchFeedbackAdded = true;

      el.addEventListener('touchstart', function() {
        this.style.opacity = '0.7';
        this.style.transform = 'scale(0.98)';
      }, { passive: true });

      el.addEventListener('touchend', function() {
        this.style.opacity = '1';
        this.style.transform = 'scale(1)';
      }, { passive: true });

      el.addEventListener('touchcancel', function() {
        this.style.opacity = '1';
        this.style.transform = 'scale(1)';
      }, { passive: true });
    };

    document.querySelectorAll('button, .btn, [role="button"], a, .clickable').forEach(addFeedback);
  }

  // 监听DOM变化
  function observeDOM() {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.addedNodes.length) {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) {
              // 修复新元素的宽度
              if (node.style && node.style.width) {
                const w = node.style.width;
                if (w.includes('px') && parseInt(w) > window.innerWidth) {
                  node.style.width = '100vw';
                  node.style.maxWidth = '100vw';
                }
              }

              // 为新列表添加滚动
              if (node.classList && (
                node.classList.contains('song-list') ||
                node.classList.contains('track-list') ||
                node.classList.contains('result-list') ||
                node.className.includes('list')
              )) {
                node.style.overflowY = 'auto';
                node.style.webkitOverflowScrolling = 'touch';
              }
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // 初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileAdapter);
  } else {
    initMobileAdapter();
  }

  window.addEventListener('load', () => {
    fixLayout();
    fixScrolling();
  });

  window.addEventListener('resize', fixLayout);

})();
