/* ============================================================
   ROCKFOX RESEARCH JOURNAL — 运行时增强
   基于 fluid 的 custom_js 钩子。只做文本/结构注入，不改主题模板。
   ============================================================ */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else { fn(); }
  }

  // 由路径判定页面类型
  function pageType() {
    var p = location.pathname;
    if (p === '/' || p === '' || p === '/index.html') return 'home';
    if (p.indexOf('/archives') === 0) return 'archive';
    if (p.indexOf('/categories') === 0) return 'categories';
    if (p.indexOf('/tags') === 0) return 'tags';
    if (document.querySelector('.post-content h1#seo-header')) return 'post';
    return 'page';
  }

  // 简单稳定的哈希 → 3 位文章编号
  function noteId(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) { h = ((h << 5) + h + str.charCodeAt(i)) >>> 0; }
    return ('000' + (h % 997)).slice(-3);
  }

  function collectTopicLinks() {
    var seen = {}, out = [];
    document.querySelectorAll('.index-btm .category-chains a, .index-btm a[href*="/tags/"]').forEach(function (a) {
      var href = a.getAttribute('href'); var text = a.textContent.replace(/^#/, '').trim();
      if (!href || !text || seen[href]) return;
      seen[href] = 1; out.push({ href: href, text: text });
    });
    return out.slice(0, 6);
  }

  // 像素粒子背景：小方块像素缓慢漂浮 + 微光（暗青绿/石板蓝）
  function initParticles() {
    var cv = document.createElement('canvas');
    cv.id = 'rf-particles';
    document.body.insertBefore(cv, document.body.firstChild);
    var ctx = cv.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W, H, parts = [];

    var COLORS = [
      'rgba(45,150,120,',   // 青绿
      'rgba(38,66,98,',     // 石板蓝
      'rgba(63,120,120,',   // 深青
      'rgba(40,74,104,'     // 蓝灰
    ];

    function resize() {
      W = window.innerWidth; H = window.innerHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function make() {
      parts = [];
      var n = Math.floor(Math.min(70, Math.max(28, W * H / 26000)));
      for (var i = 0; i < n; i++) {
        parts.push({
          x: Math.random() * W,
          y: Math.random() * H,
          size: 2 + Math.random() * 2.5,   // 2-4.5px 小方块
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          c: COLORS[(Math.random() * COLORS.length) | 0],
          a: 0.25 + Math.random() * 0.45,   // 透明度
          tw: Math.random() * Math.PI * 2,  // 闪烁相位
          twS: 0.5 + Math.random() * 1.5
        });
      }
    }

    function frame(t) {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.x += p.vx; p.y += p.vy;
        p.tw += 0.016 * p.twS;
        // 边界环绕
        if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10; else if (p.y > H + 10) p.y = -10;
        var alpha = p.a * (0.6 + 0.4 * Math.sin(p.tw));
        ctx.fillStyle = p.c + alpha + ')';
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
    }

    resize();
    make();
    window.addEventListener('resize', function () { resize(); make(); });
    (function loop(t) { frame(t); requestAnimationFrame(loop); })();
  }

  // 给文章卡片分配色相 + 霓虹描边 + 鼠标光斑
  function decorateCards() {
    var hues = [18, 168, 282, 46, 205, 320, 90, 140, 250, 12]; // 橙/青/紫/金/蓝/桃/绿/薄荷/紫红/朱
    document.querySelectorAll('.index-card').forEach(function (card, i) {
      var h = hues[i % hues.length];
      card.style.setProperty('--rf-h', h);

      // 霓虹描边
      if (!card.querySelector('.rf-bd')) {
        var bd = document.createElement('div');
        bd.className = 'rf-bd';
        card.appendChild(bd);
      }
      // 鼠标光斑
      if (!card.querySelector('.rf-mouse')) {
        var m = document.createElement('div');
        m.className = 'rf-mouse';
        card.appendChild(m);
      }
    });

    // 鼠标跟随
    document.querySelectorAll('.index-card').forEach(function (card) {
      if (card.__rfMouseBound) return;
      card.__rfMouseBound = true;
      var spot = card.querySelector('.rf-mouse');
      card.addEventListener('mousemove', function (e) {
        if (!spot) return;
        var r = card.getBoundingClientRect();
        spot.style.left = (e.clientX - r.left) + 'px';
        spot.style.top = (e.clientY - r.top) + 'px';
      });
    });
  }

  ready(function () {
    var type = pageType();
    initParticles();   // 像素粒子背景（所有页面）

    /* ---------------- 首页 ---------------- */
    if (type === 'home') {
      document.body.classList.add('home-page');

      var hero = document.createElement('div');
      hero.className = 'rf-hero';
      hero.innerHTML =
        '<div class="rf-line"></div>' +
        '<div class="rf-scan"></div>' +
        '<div class="rf-kicker">/\\ ROCKFOX_</div>' +
        '<div class="rf-eyebrow">Research / Reverse / Android / Binary / Crypto</div>' +
        '<h1>Notes from beneath<br>the abstraction layer.<span class="rf-cursor"></span></h1>' +
        '<div class="rf-sub">Breaking abstractions, one layer at a time.</div>' +
        '<div class="rf-status"><span>LOG / <b>2026</b></span><span>STATUS / <b>ONLINE</b></span><span>LOCAL / <b></b></span></div>';
      document.querySelector('#board .container') && document.querySelector('#board .container').insertBefore(hero, document.querySelector('#board .container').firstChild);

      var topics = collectTopicLinks();
      if (topics.length) {
        var trace = document.createElement('div');
        trace.className = 'rf-trace';
        var lis = topics.map(function (t) {
          return '<li><a href="' + t.href + '">' + t.text + '</a></li>';
        }).join('');
        trace.innerHTML = '<div class="rt-t"><i>▸</i> CURRENT TRACE</div><ul>' + lis + '</ul>';
        hero.parentNode.insertBefore(trace, hero.nextSibling);
      }

      // 本地时间
      var el = hero.querySelector('.rf-status span:last-child b');
      if (el) {
        var tick = function () {
          var d = new Date();
          el.textContent = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
        };
        tick(); setInterval(tick, 30000);
      }

      decorateCards();
    }

    /* ---------------- 文章页：Aurora 风格 post-header 卡片 ---------------- */
    if (type === 'post') {
      var h1 = document.querySelector('.post-content h1#seo-header');
      var content = document.querySelector('.post-content');
      if (h1 && content) {
        var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
        var clean = function (s) { return String(s == null ? '' : s).replace(/^\s+|\s+$/g, '').replace(/\s+/g, ' '); };
        var id = noteId(location.pathname);
        // 分类（跳过导航栏）
        var catEl = document.querySelector('.post-content .post-metas a[href*="/categories/"], .category-chains a[href*="/categories/"]:not([href="/categories/"])');
        var cat = catEl ? clean(catEl.textContent) : '';
        // 标签
        var tags = [];
        document.querySelectorAll('.post-content .post-metas a[href*="/tags/"]').forEach(function (t) { tags.push(clean(t.textContent).replace(/^#/, '')); });
        // banner 里的作者/日期/字数/时长（按出现顺序）
        var bmetas = [];
        document.querySelectorAll('.banner .post-meta').forEach(function (e) { bmetas.push(clean(e.textContent)); });
        var author = bmetas[0] || '';
        var date = (document.querySelector('.banner .post-meta time') || {}).textContent ? clean(document.querySelector('.banner .post-meta time').textContent) : (bmetas[1] || '');
        var wordcount = bmetas[2] || '';
        var readtime = bmetas[3] || '';

        var chip = function (txt, isLink) { return '<span class="rf-chip' + (isLink ? ' rf-chip--link' : '') + '">' + esc(txt) + '</span>'; };
        var metaItem = function (sym, val) { return val ? '<span><i>' + sym + '</i> ' + esc(val) + '</span>' : ''; };

        var card = document.createElement('div');
        card.className = 'rf-post-header';
        card.innerHTML =
          '<div class="rf-labels">' +
            chip('FIELD NOTE / ' + id) +
            (cat ? chip(cat.toUpperCase(), true) : '') +
            tags.slice(0, 6).map(function (t) { return chip('#' + t, true); }).join('') +
          '</div>' +
          '<h1>' + esc(h1.textContent) + '</h1>' +
          '<div class="rf-post-divider"></div>' +
          '<div class="rf-meta">' +
            metaItem('▸', author) +
            metaItem('◷', date) +
            metaItem('≡', wordcount) +
            metaItem('⏱', readtime) +
          '</div>';
        content.insertBefore(card, h1);
        h1.style.display = 'none';
        // 隐藏原来分散的元信息，避免重复
        document.querySelectorAll('.post-content .post-metas').forEach(function (e) { e.style.display = 'none'; });
        document.querySelectorAll('.banner .banner-text .mt-3, .banner .banner-text .mt-1').forEach(function (e) { e.style.display = 'none'; });
      }
    }

    /* ---------------- 404 ---------------- */
    if (type === 'page' && /404|not found|notfound/i.test(document.title + ' ' + ((document.querySelector('h1') || {}).textContent || ''))) {
      var board404 = document.querySelector('#board');
      if (board404) {
        board404.innerHTML =
          '<div class="rf-404">' +
          '<div class="code">404</div>' +
          '<div class="seg">SEGMENT NOT FOUND</div>' +
          '<pre class="term" style="margin-top:1.5em;line-height:1.7;">' +
          'rockfox@archive:~$ cat page<br>' +
          '<span class="err">cat: page: No such file or directory</span>' +
          '</pre>' +
          '<p style="margin-top:1.2em;"><a href="/">&larr; RETURN HOME</a></p>' +
          '<p style="margin-top:1.4em;font-size:1.6rem;color:#2bbc8a;">/\\</p>' +
          '</div>';
      }
    }

    /* ---------------- 归档 / 分类 / 标签 ---------------- */
    if (type === 'archive' || type === 'categories' || type === 'tags') {
      var label = type === 'archive' ? 'LOGBOOK / ' : (type === 'categories' ? 'DIRECTORIES / ' : 'INDEX / ');
      var board = document.querySelector('#board');
      if (board) {
        var bar = document.createElement('div');
        bar.className = 'rf-note-head';
        bar.style.letterSpacing = '.24em';
        bar.textContent = label + new Date().getFullYear();
        // 放在页面标题之前
        var title = board.querySelector('h1, .page-header, h2');
        if (title) { title.parentNode.insertBefore(bar, title); }
        else { board.insertBefore(bar, board.firstChild); }
      }
    }

    /* ---------------- 点击涟漪（文章卡片） ---------------- */
    document.addEventListener('click', function (e) {
      var card = e.target && e.target.closest ? e.target.closest('.index-card') : null;
      // 命中卡片或其内部链接都触发
      if (!card && e.target && e.target.closest) card = e.target.closest('a[href]') && e.target.closest('a[href]').closest('.index-card');
      if (!card) return;
      var rect = card.getBoundingClientRect();
      var r = document.createElement('span');
      r.className = 'rf-ripple';
      var size = Math.max(rect.width, rect.height);
      var x = (e.clientX - rect.left) - size / 2;
      var y = (e.clientY - rect.top) - size / 2;
      r.style.width = r.style.height = size + 'px';
      r.style.left = x + 'px';
      r.style.top = y + 'px';
      card.appendChild(r);
      setTimeout(function () { r.remove(); }, 650);
    }, true);

    /* ------- 无论主页/分页，给存在的文章卡片上色 + 描边 + 光斑 ------- */
    decorateCards();

    /* ------- 阅读进度条 ------- */
    var progressBar = document.createElement('div');
    progressBar.className = 'rf-progress';
    document.body.appendChild(progressBar);
    var updateProgress = function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? (window.scrollY / h) * 100 : 0;
      progressBar.style.width = p.toFixed(2) + '%';
    };
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });

    /* ------- 滚动渐显（克制的淡入上移） ------- */
    if ('IntersectionObserver' in window) {
      var revealEls = [];
      document.querySelectorAll('.rf-post-header, .post-content .markdown-body h2, .post-content .markdown-body h3, .post-content .markdown-body pre, .post-content .markdown-body table, .post-content .markdown-body blockquote').forEach(function (el) {
        el.classList.add('rf-reveal');
        revealEls.push(el);
      });
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('rf-in'); io.unobserve(en.target); }
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
      revealEls.forEach(function (el) { io.observe(el); });
    }

    /* ------- about 页：动态技术栈占比 ------- */
    var stackEl = document.querySelector('.rf-stack[data-rf-stack]');
    if (stackEl) {
      fetch('/tech-stack.json').then(function (r) { return r.json(); }).then(function (d) {
        var rows = (d.items || []).map(function (it) {
          return '<div class="rf-stack-row">' +
            '<span class="rf-stack-name">' + it.name + '</span>' +
            '<div class="rf-stack-track"><div class="rf-stack-fill" style="width:' + it.pct + '%;background:' + it.grad + '"></div></div>' +
            '<span class="rf-stack-val"><b>' + it.count + '</b> 篇 · ' + it.pct + '%</span>' +
          '</div>';
        }).join('');
        stackEl.innerHTML =
          '<div class="rf-stack-title">tech stack / 文章领域占比</div>' + rows +
          '<div class="rf-stack-note">按文章分类/标签自动统计（共 ' + d.totalAssoc + ' 次归入，跨领域文章计入多个板块）</div>';
      }).catch(function () {
        stackEl.innerHTML = '<div class="rf-stack-note">技术栈统计加载失败</div>';
      });
    }
  });
})();
