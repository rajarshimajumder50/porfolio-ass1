/**
 * RAJARSHI MAJUMDAR PORTFOLIO - MAIN ENGINE
 * Mobile Optimized & Bug-Free:
 * - 180-frame canvas image scrub with linear velocity damping (lerp)
 * - Anti-flicker frame fallback & mobile address-bar collapse protection
 * - Lenis smooth momentum scrolling with touch fallbacks
 * - Multi-layer Parallax story beats, ambient orbs & touch-safe 3D tilt
 * - Slide-out mobile navigation drawer with backdrop
 * - Animated stats counters & live interactive feedback
 */

(function () {
  'use strict';

  // --- Configuration ---
  const TOTAL_FRAMES = 180;
  const FRAME_FOLDER = 'ezgif-6a720f51b87870d3-jpg';
  const FRAME_PREFIX = 'ezgif-frame-';
  const FRAME_EXT = '.jpg';
  
  // Touch device detection
  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

  // State
  const images = [];
  let loadedImagesCount = 0;
  let isFullyLoaded = false;
  let currentFrame = 0;
  let targetFrame = 0;
  let lastRenderedIndex = -1;

  // Viewport tracking for mobile resize debouncing
  let lastCanvasWidth = 0;
  let lastCanvasHeight = 0;

  // DOM Elements
  const preloader = document.getElementById('preloader');
  const loaderBar = document.getElementById('loader-bar');
  const loaderPercent = document.getElementById('loader-percent');
  const heroContainer = document.getElementById('hero-container');
  const canvas = document.getElementById('hero-canvas');
  const ctx = canvas ? canvas.getContext('2d', { alpha: false }) : null;

  // Story Beat Overlays
  const beat1 = document.getElementById('beat-1');
  const beat2 = document.getElementById('beat-2');
  const beat3 = document.getElementById('beat-3');
  const beat4 = document.getElementById('beat-4');

  // --- 1. Lenis Smooth Momentum Scroll Initialization ---
  let lenisInstance = null;
  if (typeof Lenis !== 'undefined') {
    lenisInstance = new Lenis({
      duration: isTouch ? 1.0 : 1.25,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.2,
      syncTouch: false,
      infinite: false,
    });

    lenisInstance.on('scroll', () => {
      updateScrollProgress();
    });

    function raf(time) {
      lenisInstance.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  // Always bind passive scroll listener as fallback & touch guarantee
  window.addEventListener('scroll', updateScrollProgress, { passive: true });

  // --- 2. Image Preloading System (180 Frames) ---
  function preloadImages() {
    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      const numStr = String(i).padStart(3, '0');
      img.src = `${FRAME_FOLDER}/${FRAME_PREFIX}${numStr}${FRAME_EXT}`;

      img.onload = () => {
        loadedImagesCount++;
        const pct = Math.floor((loadedImagesCount / TOTAL_FRAMES) * 100);
        if (loaderBar) loaderBar.style.width = `${pct}%`;
        if (loaderPercent) loaderPercent.textContent = `${pct}%`;

        // Render first frame immediately once available so user sees initial frame instantly
        if (loadedImagesCount === 1 && canvas && ctx) {
          resizeCanvas();
          renderCanvasFrame(0);
        }

        if (loadedImagesCount >= TOTAL_FRAMES) {
          finishLoading();
        }
      };

      img.onerror = () => {
        loadedImagesCount++;
        if (loadedImagesCount >= TOTAL_FRAMES) {
          finishLoading();
        }
      };

      images.push(img);
    }

    // Safety fallback timeout to prevent infinite preloader
    setTimeout(() => {
      if (!isFullyLoaded) {
        finishLoading();
      }
    }, 3500);
  }

  function finishLoading() {
    if (isFullyLoaded) return;
    isFullyLoaded = true;
    if (loaderBar) loaderBar.style.width = '100%';
    if (loaderPercent) loaderPercent.textContent = '100%';

    setTimeout(() => {
      if (preloader) {
        preloader.classList.add('loaded');
      }
      resizeCanvas();
      renderCanvasFrame(0);
    }, 350);
  }

  // --- 3. Responsive Canvas Rendering with HiDPI Cover Math ---
  function resizeCanvas() {
    if (!canvas || !ctx) return;

    const currentWidth = window.innerWidth;
    const currentHeight = window.innerHeight;

    // Mobile address-bar collapse protection:
    // If width hasn't changed and height change is small (< 120px), skip canvas resize to prevent flicker!
    if (isTouch && lastCanvasWidth > 0) {
      const deltaW = Math.abs(currentWidth - lastCanvasWidth);
      const deltaH = Math.abs(currentHeight - lastCanvasHeight);
      if (deltaW < 12 && deltaH < 140) {
        return;
      }
    }

    lastCanvasWidth = currentWidth;
    lastCanvasHeight = currentHeight;

    const isMobile = currentWidth <= 768;
    // On mobile, cap DPR to 1.5 for silky 120fps/60fps rendering without memory bloat
    const maxDpr = isMobile ? 1.5 : 2;
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);

    canvas.width = Math.round(currentWidth * dpr);
    canvas.height = Math.round(currentHeight * dpr);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Redraw current frame on resize
    lastRenderedIndex = -1;
    renderCanvasFrame(Math.min(TOTAL_FRAMES - 1, Math.max(0, Math.round(currentFrame))));
  }

  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('orientationchange', () => {
    setTimeout(resizeCanvas, 250);
  });

  function renderCanvasFrame(index) {
    if (!ctx || !canvas) return;

    let img = images[index];

    // Anti-Blank Fallback: If requested frame is still loading over network,
    // find the closest available loaded frame to prevent black/blank flashing!
    if (!img || !img.complete || img.naturalWidth === 0) {
      let nearest = null;
      for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
        if (index - offset >= 0 && images[index - offset]?.complete && images[index - offset]?.naturalWidth > 0) {
          nearest = images[index - offset];
          break;
        }
        if (index + offset < TOTAL_FRAMES && images[index + offset]?.complete && images[index + offset]?.naturalWidth > 0) {
          nearest = images[index + offset];
          break;
        }
      }
      if (!nearest) return;
      img = nearest;
    }

    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    // Object-fit: cover math
    const hRatio = cw / iw;
    const vRatio = ch / ih;
    const ratio = Math.max(hRatio, vRatio);

    const destW = iw * ratio;
    const destH = ih * ratio;
    const offsetX = (cw - destW) / 2;
    const offsetY = (ch - destH) / 2;

    ctx.drawImage(img, 0, 0, iw, ih, offsetX, offsetY, destW, destH);
    lastRenderedIndex = index;
  }

  // --- 4. Smooth Velocity Damping (Lerp) Frame Loop ---
  function updateScrollProgress() {
    if (!heroContainer) return;
    const rect = heroContainer.getBoundingClientRect();
    const scrollDistance = -rect.top;
    const maxScroll = heroContainer.offsetHeight - window.innerHeight;

    if (maxScroll <= 0) return;

    const progress = Math.max(0, Math.min(1, scrollDistance / maxScroll));
    targetFrame = progress * (TOTAL_FRAMES - 1);

    // Update Story Beats Opacity & Transforms
    updateStoryBeats(progress);

    // Parallax background orbs & headers
    updateParallaxElements();

    // Header styling on scroll
    const header = document.querySelector('.site-header');
    if (header) {
      if (window.scrollY > 50) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }

    // Back to top button visibility
    const backToTop = document.getElementById('back-to-top');
    if (backToTop) {
      if (window.scrollY > 450) {
        backToTop.classList.add('visible');
      } else {
        backToTop.classList.remove('visible');
      }
    }

    // Active Navigation Highlight
    updateActiveNav();
  }

  // RAF Loop for Canvas Lerp
  function animateCanvasLoop() {
    const diff = targetFrame - currentFrame;
    if (Math.abs(diff) > 0.005) {
      currentFrame += diff * 0.14; // Snappy, buttery smooth damping
    } else {
      currentFrame = targetFrame;
    }

    const renderIndex = Math.min(TOTAL_FRAMES - 1, Math.max(0, Math.round(currentFrame)));
    if (renderIndex !== lastRenderedIndex) {
      renderCanvasFrame(renderIndex);
    }

    requestAnimationFrame(animateCanvasLoop);
  }
  requestAnimationFrame(animateCanvasLoop);

  // Helper smoothstep function for smooth transitions
  function smoothstep(min, max, value) {
    const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return x * x * (3 - 2 * x);
  }

  // Story Beats Progression (0.0 to 1.0)
  function updateStoryBeats(p) {
    const isMobile = window.innerWidth <= 768;
    const travelDistance = isMobile ? 80 : 130;

    // Beat 1: Intro (0.0 - 0.22)
    if (beat1) {
      let op1 = 1;
      if (p > 0.10) {
        op1 = 1 - smoothstep(0.10, 0.22, p);
      }
      const ty1 = -p * (isMobile ? 140 : 220);
      beat1.style.opacity = op1.toFixed(3);
      beat1.style.transform = `translate3d(0, ${ty1.toFixed(1)}px, 0)`;
      beat1.style.pointerEvents = op1 > 0.1 ? 'auto' : 'none';
    }

    // Beat 2: Split Cards (0.24 - 0.50)
    if (beat2) {
      let op2 = 0;
      if (p >= 0.22 && p <= 0.32) {
        op2 = smoothstep(0.22, 0.32, p);
      } else if (p > 0.32 && p < 0.42) {
        op2 = 1;
      } else if (p >= 0.42 && p <= 0.52) {
        op2 = 1 - smoothstep(0.42, 0.52, p);
      }
      const ty2 = (0.36 - p) * travelDistance;
      beat2.style.opacity = op2.toFixed(3);
      beat2.style.transform = `translate3d(0, ${ty2.toFixed(1)}px, 0)`;
      beat2.style.pointerEvents = op2 > 0.1 ? 'auto' : 'none';
    }

    // Beat 3: Highlights & Philosophy (0.52 - 0.76)
    if (beat3) {
      let op3 = 0;
      if (p >= 0.50 && p <= 0.59) {
        op3 = smoothstep(0.50, 0.59, p);
      } else if (p > 0.59 && p < 0.68) {
        op3 = 1;
      } else if (p >= 0.68 && p <= 0.77) {
        op3 = 1 - smoothstep(0.68, 0.77, p);
      }
      const ty3 = (0.64 - p) * (travelDistance * 0.85);
      beat3.style.opacity = op3.toFixed(3);
      beat3.style.transform = `translate3d(0, ${ty3.toFixed(1)}px, 0)`;
      beat3.style.pointerEvents = op3 > 0.1 ? 'auto' : 'none';
    }

    // Beat 4: Transition to Showcase (0.78 - 0.98)
    if (beat4) {
      let op4 = 0;
      if (p >= 0.76 && p <= 0.85) {
        op4 = smoothstep(0.76, 0.85, p);
      } else if (p > 0.85 && p < 0.94) {
        op4 = 1;
      } else if (p >= 0.94 && p <= 1.0) {
        op4 = 1 - smoothstep(0.94, 1.0, p);
      }
      const ty4 = (0.89 - p) * (travelDistance * 0.75);
      beat4.style.opacity = op4.toFixed(3);
      beat4.style.transform = `translate3d(0, ${ty4.toFixed(1)}px, 0)`;
      beat4.style.pointerEvents = op4 > 0.1 ? 'auto' : 'none';
    }
  }

  // --- 5. Multi-Layer Parallax Elements & 3D Tilt ---
  function updateParallaxElements() {
    const parallaxItems = document.querySelectorAll('[data-parallax-speed]');
    const scrollY = window.scrollY;
    parallaxItems.forEach((el) => {
      const speed = parseFloat(el.getAttribute('data-parallax-speed')) || 0.1;
      const yShift = scrollY * speed;
      el.style.transform = `translate3d(0, ${yShift.toFixed(1)}px, 0)`;
    });
  }

  // 3D Card Tilt on Mousemove (Disabled on Touch Devices to prevent sticking!)
  function init3DTilt() {
    if (isTouch) return;

    const tiltCards = document.querySelectorAll('.tilt-card');
    tiltCards.forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -6;
        const rotateY = ((x - centerX) / centerX) * 6;

        card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
      });
    });
  }

  // --- 6. Custom Mouse Cursor Follower (Desktop only) ---
  function initCustomCursor() {
    if (isTouch) return;

    const cursor = document.querySelector('.custom-cursor');
    const follower = document.querySelector('.custom-cursor-follower');
    if (!cursor || !follower) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let followerX = mouseX;
    let followerY = mouseY;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
    });

    function loopFollower() {
      followerX += (mouseX - followerX) * 0.18;
      followerY += (mouseY - followerY) * 0.18;
      follower.style.transform = `translate3d(${followerX.toFixed(1)}px, ${followerY.toFixed(1)}px, 0) translate(-50%, -50%)`;
      requestAnimationFrame(loopFollower);
    }
    requestAnimationFrame(loopFollower);

    // Hover scale effects on interactive elements
    const hoverables = document.querySelectorAll('a, button, input, textarea, .expertise-card, .timeline-card, .skill-matrix-card');
    hoverables.forEach((el) => {
      el.addEventListener('mouseenter', () => {
        cursor.classList.add('active');
        follower.classList.add('active');
      });
      el.addEventListener('mouseleave', () => {
        cursor.classList.remove('active');
        follower.classList.remove('active');
      });
    });
  }

  // --- 7. Animated Stats Counter ---
  function initStatsCounter() {
    const statNumbers = document.querySelectorAll('.stat-number');
    let hasAnimated = false;

    function checkStats() {
      if (hasAnimated) return;
      const statsSection = document.querySelector('.stats-counter-strip');
      if (!statsSection) return;

      const rect = statsSection.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.9) {
        hasAnimated = true;
        statNumbers.forEach((numEl) => {
          const target = parseFloat(numEl.getAttribute('data-target')) || 0;
          const duration = 1600;
          const startTime = performance.now();

          function updateCounter(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const ease = 1 - Math.pow(1 - progress, 3);
            const val = target * ease;

            if (target === 3) {
              numEl.textContent = '3rd';
            } else if (target === 2) {
              numEl.textContent = '2+';
            } else if (target === 100) {
              numEl.textContent = Math.floor(val) + '%';
            } else {
              numEl.textContent = Math.floor(val);
            }

            if (progress < 1) {
              requestAnimationFrame(updateCounter);
            }
          }
          requestAnimationFrame(updateCounter);
        });
      }
    }

    window.addEventListener('scroll', checkStats, { passive: true });
    checkStats();
  }

  // --- 8. Contact Form Transmission ---
  function initForms() {
    const contactForm = document.getElementById('transmission-form');

    if (contactForm) {
      contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const origText = submitBtn.textContent;
        submitBtn.textContent = 'TRANSMITTING SIGNAL...';
        submitBtn.disabled = true;

        setTimeout(() => {
          submitBtn.textContent = 'SIGNAL RECEIVED ✓';
          contactForm.reset();
          showToast('Signal transmitted! Rajarshi will review your brief promptly.');
          setTimeout(() => {
            submitBtn.textContent = origText;
            submitBtn.disabled = false;
          }, 3500);
        }, 800);
      });
    }
  }

  // --- 9. Toast Notifications ---
  function showToast(msg) {
    let toast = document.getElementById('global-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'global-toast';
      toast.className = 'toast-notice';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span style="color:var(--accent-gold)">●</span> ${escapeHtml(msg)}`;
    toast.classList.add('show');

    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 3800);
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // --- 10. Live Clock & Local Time ---
  function initLiveClock() {
    const timeEl = document.getElementById('live-time');
    if (!timeEl) return;

    function tick() {
      const now = new Date();
      timeEl.textContent = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }) + ' UTC+5:30 (KOLKATA)';
    }
    tick();
    setInterval(tick, 1000);
  }

  // --- 11. Mobile Navigation Drawer & Backdrop ---
  function initMobileMenu() {
    const menuBtn = document.getElementById('mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const backdrop = document.getElementById('mobile-nav-backdrop');
    const menuIcon = menuBtn ? menuBtn.querySelector('.menu-icon') : null;

    if (!menuBtn || !navLinks) return;

    function openMenu() {
      navLinks.classList.add('mobile-open');
      if (backdrop) backdrop.classList.add('active');
      document.body.classList.add('nav-locked');
      menuBtn.setAttribute('aria-expanded', 'true');
      if (menuIcon) menuIcon.textContent = '✕';
    }

    function closeMenu() {
      navLinks.classList.remove('mobile-open');
      if (backdrop) backdrop.classList.remove('active');
      document.body.classList.remove('nav-locked');
      menuBtn.setAttribute('aria-expanded', 'false');
      if (menuIcon) menuIcon.textContent = '☰';
    }

    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = navLinks.classList.contains('mobile-open');
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    if (backdrop) {
      backdrop.addEventListener('click', closeMenu);
    }

    // Close when clicking any nav link
    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', closeMenu);
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navLinks.classList.contains('mobile-open')) {
        closeMenu();
      }
    });
  }

  // --- 12. Active Navigation Tracking ---
  function updateActiveNav() {
    const sections = ['hero-container', 'projects', 'expertise', 'experience', 'skills', 'about', 'contact'];
    const navLinks = document.querySelectorAll('.nav-link');
    const scrollPos = window.scrollY + 160;

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        const top = el.offsetTop;
        const height = el.offsetHeight;
        if (scrollPos >= top && scrollPos < top + height) {
          navLinks.forEach((link) => {
            if (link.getAttribute('href') === `#${id}`) {
              link.classList.add('active');
            } else {
              link.classList.remove('active');
            }
          });
        }
      }
    });
  }

  // --- 13. Smooth Navigation Links & Back to Top ---
  function initSmoothNavigation() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (!targetId || targetId === '#') return;
        const targetEl = document.querySelector(targetId);
        if (targetEl) {
          e.preventDefault();
          const offsetTop = window.innerWidth <= 768 ? -50 : -60;
          if (lenisInstance) {
            lenisInstance.scrollTo(targetEl, { offset: offsetTop, duration: 1.2 });
          } else {
            const y = targetEl.getBoundingClientRect().top + window.pageYOffset + offsetTop;
            window.scrollTo({ top: y, behavior: 'smooth' });
          }
        }
      });
    });

    const backToTopBtn = document.getElementById('back-to-top');
    if (backToTopBtn) {
      backToTopBtn.addEventListener('click', () => {
        if (lenisInstance) {
          lenisInstance.scrollTo(0, { duration: 1.2 });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    }
  }

  // --- Document Initialization ---
  document.addEventListener('DOMContentLoaded', () => {
    preloadImages();
    init3DTilt();
    initCustomCursor();
    initStatsCounter();
    initForms();
    initLiveClock();
    initMobileMenu();
    initSmoothNavigation();
  });
})();
