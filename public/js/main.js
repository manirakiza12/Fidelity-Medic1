/* =====================================================================
   Fidelity Medic — main.js
   Vanilla ES2019. No dependencies.
   ===================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ------------------------------------------------------------------
     1. HERO SLIDER
     ------------------------------------------------------------------ */
  function initHeroSlider() {
    var root = $('#hero');
    if (!root) return;

    var slides   = $$('.hero-slide', root);
    var dots     = $$('.hero-dot', root);
    var progress = $('#heroProgress', root);
    var prevBtn  = $('#heroPrev', root);
    var nextBtn  = $('#heroNext', root);
    if (!slides.length) return;

    var DURATION = 6500;
    var index    = 0;
    var timer    = null;
    var paused   = false;

    function renderProgress() {
      if (!progress) return;
      progress.style.transition = 'none';
      progress.style.width = '0%';
      void progress.offsetWidth;              // force reflow so the transition restarts
      if (reduceMotion) return;
      progress.style.transition = 'width ' + DURATION + 'ms linear';
      progress.style.width = '100%';
    }

    function goTo(next, userInitiated) {
      index = (next + slides.length) % slides.length;

      slides.forEach(function (s, i) {
        var active = i === index;
        s.classList.toggle('is-active', active);
        s.setAttribute('aria-hidden', active ? 'false' : 'true');
        // Keep inactive slides out of the tab order.
        $$('a, button', s).forEach(function (el) {
          if (active) el.removeAttribute('tabindex');
          else el.setAttribute('tabindex', '-1');
        });
      });

      dots.forEach(function (d, i) {
        var active = i === index;
        d.classList.toggle('is-active', active);
        d.setAttribute('aria-selected', active ? 'true' : 'false');
      });

      renderProgress();
      restart(userInitiated);
    }

    function step(dir) { goTo(index + dir, true); }

    function tick() { goTo(index + 1); }

    function restart(userInitiated) {
      clearInterval(timer);
      timer = setInterval(function () {
        if (!paused && !document.hidden) tick();
      }, DURATION);
      if (userInitiated) renderProgress();
    }

    // ---- Controls
    if (prevBtn) prevBtn.addEventListener('click', function () { step(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { step(1); });
    dots.forEach(function (d) {
      d.addEventListener('click', function () { goTo(parseInt(d.dataset.goto, 10), true); });
    });

    // ---- Pause on hover / focus
    ['mouseenter', 'focusin'].forEach(function (ev) {
      root.addEventListener(ev, function () { paused = true; });
    });
    ['mouseleave', 'focusout'].forEach(function (ev) {
      root.addEventListener(ev, function () { paused = false; });
    });

    // ---- Keyboard
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft')  { step(-1); }
      if (e.key === 'ArrowRight') { step(1); }
    });

    // ---- Touch / swipe
    var startX = 0, startY = 0, tracking = false;
    root.addEventListener('touchstart', function (e) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      tracking = true;
    }, { passive: true });

    root.addEventListener('touchend', function (e) {
      if (!tracking) return;
      tracking = false;
      var dx = e.changedTouches[0].clientX - startX;
      var dy = e.changedTouches[0].clientY - startY;
      // Ignore mostly-vertical swipes so page scrolling still feels natural.
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) step(dx < 0 ? 1 : -1);
    }, { passive: true });

    // ---- Pause when the tab is in the background
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { clearInterval(timer); } else { restart(); }
    });

    goTo(0);
  }

  /* ------------------------------------------------------------------
     2. MOBILE NAVIGATION
     ------------------------------------------------------------------ */
  function initMobileNav() {
    var toggle = $('#navToggle');
    var menu   = $('#mobileMenu');
    if (!toggle || !menu) return;

    function setOpen(open) {
      menu.classList.toggle('hidden', !open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
      toggle.innerHTML = open
        ? '<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>'
        : '<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16"/><path d="M4 12h16"/><path d="M4 19h16"/></svg>';
      document.body.style.overflow = open ? 'hidden' : '';
    }

    toggle.addEventListener('click', function () {
      setOpen(menu.classList.contains('hidden'));
    });

    $$('a', menu).forEach(function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.classList.contains('hidden')) {
        setOpen(false);
        toggle.focus();
      }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth >= 1024 && !menu.classList.contains('hidden')) setOpen(false);
    });
  }

  /* ------------------------------------------------------------------
     3. NAVBAR STATE + SCROLL PROGRESS
     ------------------------------------------------------------------ */
  function initNavbar() {
    var nav      = $('#navbar');
    var progress = $('#scrollProgress');
    var backTop  = $('#backToTop');
    if (!nav) return;

    // Publish the real navbar height so CSS (hero fill height) and JS
    // (scroll offsets) agree on a single source of truth.
    function publishHeight() {
      document.documentElement.style.setProperty('--nav-h', nav.offsetHeight + 'px');
    }
    publishHeight();
    window.addEventListener('resize', publishHeight);
    window.addEventListener('load', publishHeight);

    function onScroll() {
      var y = window.pageYOffset;

      nav.classList.toggle('border-ink-line', y > 8);
      nav.classList.toggle('shadow-nav', y > 8);

      if (progress) {
        var docH = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.width = (docH > 0 ? (y / docH) * 100 : 0) + '%';
      }

      if (backTop) {
        backTop.classList.toggle('opacity-0', y < 600);
        backTop.classList.toggle('translate-y-24', y < 600);
        backTop.classList.toggle('opacity-100', y >= 600);
        backTop.classList.toggle('translate-y-0', y >= 600);
      }
    }

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () { onScroll(); ticking = false; });
    }, { passive: true });

    onScroll();

    if (backTop) {
      backTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      });
    }
  }

  /* ------------------------------------------------------------------
     4. SCROLL SPY
     ------------------------------------------------------------------ */
  function initScrollSpy() {
    var links = $$('.nav-link');
    if (!links.length) return;

    // Build [{ id, el, link }] from the nav links themselves so the two stay in sync.
    var entries = links.map(function (l) {
      var el = document.querySelector(l.getAttribute('href'));
      return el ? { id: l.getAttribute('href').slice(1), el: el, link: l } : null;
    }).filter(Boolean);
    if (!entries.length) return;

    var current = null;

    function setActive(id) {
      if (id === current) return;
      current = id;
      links.forEach(function (l) { l.classList.remove('is-active'); });
      var match = entries.filter(function (e) { return e.id === id; })[0];
      if (match) match.link.classList.add('is-active');
    }

    function update() {
      // Measure against the line just below the sticky navbar.
      var navH = ($('#navbar') ? $('#navbar').offsetHeight : 0);
      var line = window.pageYOffset + navH + 24;

      var active = entries[0];
      for (var i = 0; i < entries.length; i++) {
        var top = entries[i].el.getBoundingClientRect().top + window.pageYOffset;
        if (top <= line) active = entries[i];
      }

      // At the very bottom, favour the last section so short trailing
      // sections (e.g. the footer) can still become active.
      var atBottom = (window.pageYOffset + window.innerHeight) >= (document.documentElement.scrollHeight - 4);
      if (atBottom) active = entries[entries.length - 1];

      setActive(active.id);
    }

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () { update(); ticking = false; });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  /* ------------------------------------------------------------------
     5. REVEAL ON SCROLL
     ------------------------------------------------------------------ */
  function initReveal() {
    var items = $$('.reveal');
    if (!items.length) return;

    if (!('IntersectionObserver' in window) || reduceMotion) {
      items.forEach(function (el) { el.classList.add('in'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var siblings = Array.prototype.slice.call(el.parentNode.children).filter(function (n) {
          return n.classList && n.classList.contains('reveal');
        });
        // Stagger siblings slightly for a cascading feel.
        var i = Math.max(0, siblings.indexOf(el));
        el.style.transitionDelay = Math.min(i * 70, 350) + 'ms';
        el.classList.add('in');
        observer.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    items.forEach(function (el) { observer.observe(el); });
  }

  /* ------------------------------------------------------------------
     6. ANIMATED COUNTERS
     ------------------------------------------------------------------ */
  function initCounters() {
    var counters = $$('.counter');
    if (!counters.length) return;

    function format(n) {
      return n.toLocaleString('en-US');
    }

    function run(el) {
      var target = parseFloat(el.dataset.target || '0');
      if (reduceMotion) { el.textContent = format(target); return; }

      var duration = 1700;
      var start = null;

      function frame(ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - p, 4);           // easeOutQuart
        el.textContent = format(Math.round(target * eased));
        if (p < 1) window.requestAnimationFrame(frame);
        else el.textContent = format(target);
      }
      window.requestAnimationFrame(frame);
    }

    if (!('IntersectionObserver' in window)) {
      counters.forEach(run);
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        run(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.4 });

    counters.forEach(function (el) { observer.observe(el); });
  }

  /* ------------------------------------------------------------------
     7. APPOINTMENT FORM
     ------------------------------------------------------------------ */
  function initForm() {
    var form = $('#apptForm');
    if (!form) return;

    var success = $('#formSuccess');
    var successMsg = $('#formSuccessMsg');
    var submitBtn = $('#submitBtn');
    var resetBtn = $('#resetForm');
    var message = $('#message');
    var charCount = $('#charCount');
    var dateInput = $('#date');
    var submitted = false;

    // Captured once so the submit button label can be restored on reset.
    var submitLabel = submitBtn ? submitBtn.innerHTML : '';

    // Prevent choosing a date in the past.
    var today = new Date();
    var iso = today.getFullYear() + '-' +
      String(today.getMonth() + 1).padStart(2, '0') + '-' +
      String(today.getDate()).padStart(2, '0');
    dateInput.min = iso;

    // Character counter on the message box.
    if (message && charCount) {
      message.addEventListener('input', function () {
        if (message.value.length > 600) message.value = message.value.slice(0, 600);
        charCount.textContent = message.value.length;
      });
    }

    var rules = {
      name: function (v) { return v.trim().length >= 2; },
      email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); },
      phone: function (v) { return v.replace(/[^\d]/g, '').length >= 9; },
      service: function (v) { return v !== ''; },
      date: function (v) { return v !== '' && v >= iso; },
      consent: function (v, el) { return el.checked; }
    };

    var messages = {
      name: 'Please enter your full name.',
      email: 'Please enter a valid email address.',
      phone: 'Please enter a valid phone number.',
      service: 'Please choose a service.',
      date: 'Please choose a date from today onwards.',
      consent: 'Please accept the consent to continue.'
    };

    function showError(name, on) {
      var field = form.elements[name];
      var note  = $('[data-error-for="' + name + '"]', form);
      if (field && field.classList) field.classList.toggle('field-error', on);
      if (note) note.classList.toggle('hidden', !on);
    }

    function validateField(name) {
      var field = form.elements[name];
      if (!field || !rules[name]) return true;
      var ok = rules[name](field.value, field);
      showError(name, !ok);
      return ok;
    }

    Object.keys(rules).forEach(function (name) {
      var field = form.elements[name];
      if (!field) return;
      var evt = field.type === 'checkbox' || field.tagName === 'SELECT' ? 'change' : 'blur';
      field.addEventListener(evt, function () { if (submitted) validateField(name); });
      field.addEventListener('input', function () { if (submitted) validateField(name); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      submitted = true;

      var results = Object.keys(rules).map(validateField);
      var firstBad = Object.keys(rules).filter(function (n) {
        return !results[Object.keys(rules).indexOf(n)];
      })[0];

      if (firstBad) {
        showError(firstBad, true);
        var el = form.elements[firstBad];
        if (el && el.focus) el.focus();
        return;
      }

      // ---- Simulated request (swap for a real endpoint when available) ----
      submitBtn.disabled = true;
      submitBtn.style.opacity = '.7';
      submitBtn.innerHTML =
        '<span class="flex items-center gap-2">' +
        '<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">' +
        '<path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Sending…</span>';

      window.setTimeout(function () {
        var firstName = form.elements.name.value.trim().split(/\s+/)[0];
        var dateVal = form.elements.date.value;
        var pretty = '';
        try {
          pretty = new Date(dateVal + 'T00:00:00').toLocaleDateString('en-GB', {
            day: 'numeric', month: 'long', year: 'numeric'
          });
        } catch (err) { pretty = dateVal; }

        successMsg.textContent = 'Thank you, ' + firstName + '. We have received your request for ' +
          pretty + ' and our team will contact you shortly to confirm your slot.';

        form.querySelectorAll(':scope > *').forEach(function (node) {
          if (node !== success) node.style.display = 'none';
        });
        success.classList.remove('hidden');
        success.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      }, 1100);
    });

    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        form.reset();
        if (charCount) charCount.textContent = '0';
        submitted = false;
        Object.keys(rules).forEach(function (n) { showError(n, false); });
        form.querySelectorAll(':scope > *').forEach(function (node) {
          if (node !== success) node.style.display = '';
        });
        success.classList.add('hidden');
        submitBtn.disabled = false;
        submitBtn.style.opacity = '';
        submitBtn.innerHTML = submitLabel;
        form.elements.name.focus();
      });
    }
  }

  /* ------------------------------------------------------------------
     8. MISC
     ------------------------------------------------------------------ */
  function initMisc() {
    var year = $('#year');
    if (year) year.textContent = new Date().getFullYear();

    // Anchor links: smooth scroll with a sticky-nav offset, for older browsers
    // that do not honour `scroll-padding-top` consistently.
    $$('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var id = link.getAttribute('href');
        if (!id || id === '#') return;
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        var navH = ($('#navbar') ? $('#navbar').offsetHeight : 0) + 16;
        var top = target.getBoundingClientRect().top + window.pageYOffset - navH;
        window.scrollTo({ top: top, behavior: reduceMotion ? 'auto' : 'smooth' });
        history.replaceState(null, '', id);
      });
    });
  }

  /* ------------------------------------------------------------------
     BOOT
     ------------------------------------------------------------------ */
  function boot() {
    initHeroSlider();
    initMobileNav();
    initNavbar();
    initScrollSpy();
    initReveal();
    initCounters();
    initForm();
    initMisc();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();