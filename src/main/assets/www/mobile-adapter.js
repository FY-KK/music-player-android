// Mineradio Mobile Adapter v4 - 修复响应式布局

(function() {
  'use strict';

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isSmallScreen = window.innerWidth <= 768;

  if (!isMobile && !isSmallScreen) return;

  console.log('[MobileAdapter] 初始化 v4');

  // 添加标记
  document.documentElement.classList.add('mobile-device');
  if (isMobile) document.documentElement.classList.add('is-mobile');
  if (/Android/i.test(navigator.userAgent)) document.documentElement.classList.add('is-android');

  // 侧边滑动退出状态
  let swipeState = {
    leftCount: 0,
    rightCount: 0,
    lastSwipeTime: 0,
    timer: null
  };

  function init() {
    setupViewport();
    fixLayout();
    setupSwipeExit();
    observeDOM();

    // 使用 requestAnimationFrame 优化性能
    let rafId = null;
    function scheduleFix() {
      if (rafId) return;
      rafId = requestAnimationFrame(function() {
        fixLayout();
        rafId = null;
      });
    }

    // 只在需要时修复
    window.addEventListener('resize', scheduleFix);
    window.addEventListener('orientationchange', function() {
      setTimeout(fixLayout, 300);
    });

    console.log('[MobileAdapter] 初始化完成');
  }

  // 设置视口
  function setupViewport() {
    // 防止双指缩放
    document.addEventListener('touchmove', function(e) {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    }, { passive: false });
  }

  // 修复布局
  function fixLayout() {
    // 修复body滚动
    document.body.style.overflow = 'auto';
    document.body.style.overflowX = 'hidden';
    document.body.style.overflowY = 'auto';
    document.body.style.height = 'auto';
    document.body.style.minHeight = '100vh';

    document.documentElement.style.overflow = 'auto';
    document.documentElement.style.overflowY = 'auto';
    document.documentElement.style.height = 'auto';

    // 修复desktop-window-shell
    const shell = document.getElementById('desktop-window-shell');
    if (shell) {
      shell.style.position = 'relative';
      shell.style.inset = 'auto';
      shell.style.overflow = 'visible';
      shell.style.borderRadius = '0';
      shell.style.clipPath = 'none';
      shell.style.boxShadow = 'none';
      shell.style.transform = 'none';
    }

    // 修复empty-home
    const emptyHome = document.getElementById('empty-home');
    if (emptyHome) {
      emptyHome.style.position = 'relative';
      emptyHome.style.left = 'auto';
      emptyHome.style.top = 'auto';
      emptyHome.style.bottom = 'auto';
      emptyHome.style.width = '100%';
      emptyHome.style.maxWidth = '100%';
      emptyHome.style.transform = 'none';
      emptyHome.style.opacity = '1';
      emptyHome.style.pointerEvents = 'auto';
    }

    // 修复empty-home-shell的grid布局
    const shells = document.querySelectorAll('.empty-home-shell');
    shells.forEach(function(el) {
      el.style.display = 'flex';
      el.style.flexDirection = 'column';
      el.style.gap = '12px';
      el.style.height = 'auto';
      el.style.minHeight = 'auto';
    });

    // 修复搜索区域
    const searchArea = document.getElementById('search-area');
    if (searchArea) {
      searchArea.style.position = 'fixed';
      searchArea.style.top = '0';
      searchArea.style.left = '0';
      searchArea.style.right = '0';
      searchArea.style.width = '100%';
      searchArea.style.transform = 'none';
      searchArea.style.padding = '8px';
    }
  }

  // 设置侧边滑动退出
  function setupSwipeExit() {
    let touchStartX = 0;
    let touchStartY = 0;
    let isSwiping = false;
    let swipeSide = null;

    // 创建提示元素
    const hint = document.createElement('div');
    hint.id = 'swipe-exit-hint';
    document.body.appendChild(hint);

    document.addEventListener('touchstart', function(e) {
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      isSwiping = false;
      swipeSide = null;

      // 检测是否从边缘开始（30px内）
      const edgeThreshold = 30;
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

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = Math.abs(touch.clientY - touchStartY);

      // 垂直滑动超过50px则取消
      if (deltaY > 50) {
        isSwiping = false;
        return;
      }

      // 向右滑动超过100px（左侧边缘）
      if (swipeSide === 'left' && deltaX > 100) {
        isSwiping = false;
        handleEdgeSwipe('left');
      }
      // 向左滑动超过100px（右侧边缘）
      else if (swipeSide === 'right' && deltaX < -100) {
        isSwiping = false;
        handleEdgeSwipe('right');
      }
    }, { passive: true });

    document.addEventListener('touchend', function() {
      isSwiping = false;
    }, { passive: true });

    function handleEdgeSwipe(side) {
      const now = Date.now();

      // 超过1.5秒重置计数
      if (now - swipeState.lastSwipeTime > 1500) {
        swipeState.leftCount = 0;
        swipeState.rightCount = 0;
      }

      // 切换侧面重置计数
      if (swipeState.lastSwipeSide && swipeState.lastSwipeSide !== side) {
        swipeState.leftCount = 0;
        swipeState.rightCount = 0;
      }

      // 增加计数
      if (side === 'left') {
        swipeState.leftCount++;
      } else {
        swipeState.rightCount++;
      }

      swipeState.lastSwipeTime = now;
      swipeState.lastSwipeSide = side;

      const count = side === 'left' ? swipeState.leftCount : swipeState.rightCount;

      if (count >= 2) {
        exitApp();
      } else {
        showExitHint(side, count);
      }
    }

    function showExitHint(side, count) {
      const remaining = 2 - count;
      hint.textContent = '再滑动' + remaining + '次退出应用';
      hint.className = side + ' show';

      if (swipeState.timer) {
        clearTimeout(swipeState.timer);
      }

      swipeState.timer = setTimeout(function() {
        hint.className = '';
      }, 1500);
    }

    function exitApp() {
      hint.textContent = '正在退出...';
      hint.className = (swipeState.lastSwipeSide || 'left') + ' show';

      swipeState.leftCount = 0;
      swipeState.rightCount = 0;

      // 尝试Capacitor退出
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
        window.Capacitor.Plugins.App.exitApp();
      }
      // 尝试Android WebView退出
      else if (window.Android && window.Android.exitApp) {
        window.Android.exitApp();
      }
      // history.back
      else if (window.history.length > 1) {
        window.history.back();
      }
      else {
        window.close();
      }

      setTimeout(function() {
        hint.className = '';
      }, 1000);
    }
  }

  // 监听DOM变化（防抖）
  function observeDOM() {
    let debounceTimer = null;

    const observer = new MutationObserver(function(mutations) {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function() {
        const hasNewNodes = mutations.some(function(m) { return m.addedNodes.length > 0; });
        if (hasNewNodes) {
          fixLayout();
        }
      }, 150);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // 初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('load', function() {
    setTimeout(fixLayout, 200);
  });

})();
