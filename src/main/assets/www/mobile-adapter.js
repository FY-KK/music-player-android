// Mineradio Mobile Adapter - 手机端交互适配

(function() {
  'use strict';

  // 检测是否为移动端
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);

  if (!isMobile) return;

  console.log('[MobileAdapter] 初始化移动端适配');

  // 添加移动端标记
  document.documentElement.classList.add('mobile-device');
  if (isAndroid) document.documentElement.classList.add('android-device');

  // 等待DOM加载完成
  function initMobileAdapter() {
    // 1. 修复滚动问题
    fixScrolling();

    // 2. 修复触摸事件
    fixTouchEvents();

    // 3. 修复视口问题
    fixViewport();

    // 4. 添加移动端样式
    addMobileStyles();

    // 5. 监听动态内容
    observeDynamicContent();

    console.log('[MobileAdapter] 适配完成');
  }

  // 修复滚动问题
  function fixScrolling() {
    // 移除overflow:hidden限制
    document.body.style.overflow = 'auto';
    document.body.style.overflowX = 'hidden';
    document.body.style.overflowY = 'auto';
    document.body.style.height = 'auto';
    document.body.style.minHeight = '100vh';
    document.body.style.touchAction = 'pan-y';

    document.documentElement.style.overflow = 'auto';
    document.documentElement.style.overflowY = 'auto';
    document.documentElement.style.height = 'auto';

    // 为可滚动容器添加惯性滚动
    const scrollableSelectors = [
      '.list-container', '.song-list', '.playlist',
      '[class*="list"]', '[class*="scroll"]',
      '.panel-content', '.modal-content'
    ];

    scrollableSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        el.style.overflowY = 'auto';
        el.style.webkitOverflowScrolling = 'touch';
        el.style.touchAction = 'pan-y';
      });
    });
  }

  // 修复触摸事件
  function fixTouchEvents() {
    // 移除300ms延迟
    document.addEventListener('touchstart', function() {}, { passive: true });

    // 为按钮添加触摸反馈
    const addTouchFeedback = (el) => {
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

    // 为所有可点击元素添加反馈
    document.querySelectorAll('button, .btn, [role="button"], a, .clickable').forEach(addTouchFeedback);
  }

  // 修复视口问题
  function fixViewport() {
    // 确保viewport设置正确
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';

    // 防止双击缩放
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(event) {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    }, false);

    // 防止手势缩放
    document.addEventListener('gesturestart', function(e) {
      e.preventDefault();
    });
  }

  // 添加移动端样式
  function addMobileStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* 移动端强制样式 */
      html.mobile-device, html.mobile-device body {
        overflow: auto !important;
        overflow-y: auto !important;
        height: auto !important;
        min-height: 100vh !important;
        touch-action: pan-y !important;
        -webkit-overflow-scrolling: touch !important;
      }

      html.mobile-device #desktop-window-shell {
        display: block !important;
        position: relative !important;
        inset: auto !important;
        overflow: visible !important;
        border-radius: 0 !important;
        clip-path: none !important;
        box-shadow: none !important;
        width: 100% !important;
        min-height: 100vh !important;
      }

      html.mobile-device #desktop-titlebar,
      html.mobile-device .desktop-mode-btn,
      html.mobile-device .desktop-window-controls,
      html.mobile-device .desktop-resize-handle,
      html.mobile-device #fullscreen-diy-zone {
        display: none !important;
      }

      /* 可点击元素增大触摸区域 */
      html.mobile-device button,
      html.mobile-device .btn,
      html.mobile-device [role="button"],
      html.mobile-device a {
        min-height: 44px !important;
        min-width: 44px !important;
      }

      /* 输入框防止iOS缩放 */
      html.mobile-device input,
      html.mobile-device textarea,
      html.mobile-device [contenteditable] {
        font-size: 16px !important;
      }

      /* 安全区域 */
      html.mobile-device body {
        padding-top: env(safe-area-inset-top) !important;
        padding-bottom: calc(env(safe-area-inset-bottom) + 80px) !important;
      }
    `;
    document.head.appendChild(style);
  }

  // 监听动态内容
  function observeDynamicContent() {
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.addedNodes.length) {
          // 为新添加的可滚动容器添加惯性滚动
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) {
              if (node.classList && (
                node.classList.contains('list-container') ||
                node.classList.contains('song-list') ||
                node.classList.contains('playlist') ||
                node.className.includes('list')
              )) {
                node.style.overflowY = 'auto';
                node.style.webkitOverflowScrolling = 'touch';
              }

              // 为新按钮添加触摸反馈
              if (node.tagName === 'BUTTON' || node.getAttribute('role') === 'button') {
                addTouchFeedbackToElement(node);
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

  // 为单个元素添加触摸反馈
  function addTouchFeedbackToElement(el) {
    el.addEventListener('touchstart', function() {
      this.style.opacity = '0.7';
    }, { passive: true });

    el.addEventListener('touchend', function() {
      this.style.opacity = '1';
    }, { passive: true });
  }

  // 初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileAdapter);
  } else {
    initMobileAdapter();
  }

  // 页面加载完成后再次修复
  window.addEventListener('load', function() {
    setTimeout(fixScrolling, 500);
    setTimeout(fixScrolling, 1000);
  });

})();
