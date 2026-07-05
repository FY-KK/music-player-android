// Mineradio Mobile Adapter v3 - 修复bug + 侧边滑动退出

(function() {
  'use strict';

  // 检测移动端
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);

  if (!isMobile) return;

  console.log('[MobileAdapter] 初始化 v3');

  // 添加移动端标记
  document.documentElement.classList.add('mobile-device');
  if (isAndroid) document.documentElement.classList.add('android-device');

  // 状态变量
  let swipeState = {
    leftCount: 0,
    rightCount: 0,
    lastSwipeTime: 0,
    lastSwipeSide: null,
    timer: null
  };

  function init() {
    setupViewport();
    fixLayout();
    setupTouchHandlers();
    setupSwipeExit();
    observeDOM();

    // 使用 requestAnimationFrame 替代 setInterval
    function rafFix() {
      fixLayout();
      requestAnimationFrame(rafFix);
    }
    requestAnimationFrame(rafFix);

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
    const body = document.body;
    const html = document.documentElement;

    body.style.overflow = 'auto';
    body.style.overflowX = 'hidden';
    body.style.overflowY = 'auto';
    body.style.height = 'auto';
    body.style.minHeight = '100vh';

    html.style.overflow = 'auto';
    html.style.overflowY = 'auto';
    html.style.height = 'auto';

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

    // 修复搜索区域
    const searchArea = document.getElementById('search-area');
    if (searchArea && searchArea.style.position !== 'fixed') {
      searchArea.style.position = 'fixed';
      searchArea.style.top = '0';
      searchArea.style.left = '0';
      searchArea.style.right = '0';
      searchArea.style.width = '100%';
      searchArea.style.transform = 'none';
      searchArea.style.padding = '8px';
    }
  }

  // 设置触摸处理
  function setupTouchHandlers() {
    // 触摸反馈（使用class替代直接修改style）
    const style = document.createElement('style');
    style.textContent = `
      .mobile-touch-active {
        opacity: 0.7 !important;
        transform: scale(0.98) !important;
        transition: opacity 0.1s, transform 0.1s !important;
      }
    `;
    document.head.appendChild(style);

    document.addEventListener('touchstart', function(e) {
      const el = e.target.closest('button, .btn, [role="button"], a, .clickable');
      if (el) {
        el.classList.add('mobile-touch-active');
      }
    }, { passive: true });

    document.addEventListener('touchend', function(e) {
      document.querySelectorAll('.mobile-touch-active').forEach(el => {
        el.classList.remove('mobile-touch-active');
      });
    }, { passive: true });

    document.addEventListener('touchcancel', function(e) {
      document.querySelectorAll('.mobile-touch-active').forEach(el => {
        el.classList.remove('mobile-touch-active');
      });
    }, { passive: true });
  }

  // 设置侧边滑动退出
  function setupSwipeExit() {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
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
      touchStartTime = Date.now();
      isSwiping = false;
      swipeSide = null;

      // 检测是否从边缘开始
      const screenWidth = window.innerWidth;
      const edgeThreshold = 30; // 边缘区域30px

      if (touchStartX < edgeThreshold) {
        swipeSide = 'left';
        isSwiping = true;
      } else if (touchStartX > screenWidth - edgeThreshold) {
        swipeSide = 'right';
        isSwiping = true;
      }
    }, { passive: true });

    document.addEventListener('touchmove', function(e) {
      if (!isSwiping) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = Math.abs(touch.clientY - touchStartY);

      // 如果垂直滑动超过50px，取消边缘滑动检测
      if (deltaY > 50) {
        isSwiping = false;
        return;
      }

      // 向右滑动超过100px触发左侧边缘滑动
      if (swipeSide === 'left' && deltaX > 100) {
        isSwiping = false;
        handleEdgeSwipe('left');
      }
      // 向左滑动超过100px触发右侧边缘滑动
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

      // 重置超过1.5秒的计数
      if (now - swipeState.lastSwipeTime > 1500) {
        swipeState.leftCount = 0;
        swipeState.rightCount = 0;
      }

      // 如果切换了侧面，重置计数
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
        // 触发退出
        exitApp();
      } else {
        // 显示提示
        showExitHint(side, count);
      }
    }

    function showExitHint(side, count) {
      const remaining = 2 - count;
      hint.textContent = `再滑动${remaining}次退出应用`;
      hint.className = side + ' show';

      // 清除之前的定时器
      if (swipeState.timer) {
        clearTimeout(swipeState.timer);
      }

      // 1.5秒后隐藏提示
      swipeState.timer = setTimeout(function() {
        hint.className = '';
      }, 1500);
    }

    function exitApp() {
      hint.textContent = '正在退出...';
      hint.className = swipeState.lastSwipeSide + ' show';

      // 重置计数
      swipeState.leftCount = 0;
      swipeState.rightCount = 0;

      // 尝试使用Capacitor退出
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
        window.Capacitor.Plugins.App.exitApp();
      }
      // 尝试使用Android WebView退出
      else if (window.Android && window.Android.exitApp) {
        window.Android.exitApp();
      }
      // 尝试使用history.back()退出
      else {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          // 最后尝试关闭窗口
          window.close();
        }
      }

      // 1秒后重置提示
      setTimeout(function() {
        hint.className = '';
      }, 1000);
    }
  }

  // 监听DOM变化（优化版）
  function observeDOM() {
    let debounceTimer = null;

    const observer = new MutationObserver(function(mutations) {
      // 防抖处理
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(function() {
        // 只在有新增节点时处理
        const hasNewNodes = mutations.some(m => m.addedNodes.length > 0);
        if (hasNewNodes) {
          fixLayout();
        }
      }, 100);
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

  // 页面加载完成后修复
  window.addEventListener('load', function() {
    setTimeout(fixLayout, 100);
  });

  // 监听返回按钮（Android）
  if (isAndroid) {
    let backButtonPressCount = 0;
    let backButtonTimer = null;

    document.addEventListener('backbutton', function(e) {
      e.preventDefault();
      backButtonPressCount++;

      if (backButtonPressCount >= 2) {
        exitApp();
      } else {
        showExitHint('back', backButtonPressCount);
      }

      if (backButtonTimer) {
        clearTimeout(backButtonTimer);
      }

      backButtonTimer = setTimeout(function() {
        backButtonPressCount = 0;
      }, 1500);
    }, false);
  }

})();
