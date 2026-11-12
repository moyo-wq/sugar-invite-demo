/* eslint-disable */
/*
 * Sugar marketing-site analytics — PostHog (US Cloud).
 * (eslint disabled: this file embeds PostHog's vendored install snippet.)
 *
 * Loaded ONLY on the public marketing pages (home/landing, about, faq, pricing,
 * connect-email, terms, privacy). It is intentionally NOT loaded
 * inside the logged-in app shell (app.html) or the /dashboard — this tracks how
 * anonymous visitors arrive at and move through the marketing site.
 *
 * With autocapture + automatic pageviews enabled, PostHog records page views,
 * clicks, and form interactions out of the box, so we get a baseline of visitor
 * behaviour with no per-element wiring. A few named events for the primary CTAs
 * are also emitted below for clean funnels.
 *
 * SETUP (one step): paste your PostHog Project API Key into POSTHOG_PROJECT_KEY
 * below. Find it in PostHog → Settings → Project → "Project API Key" (starts
 * with "phc_"). This is a publishable, client-side key and is safe to ship in
 * the browser. Until a real key is set, tracking stays disabled (no-op).
 *
 * NOTE: the site's Content-Security-Policy (nginx-security-headers.conf) must
 * allow PostHog's US hosts, or the browser will block array.js and ingestion.
 */
(function () {
  'use strict'

  var POSTHOG_PROJECT_KEY = 'phc_M67LAgZJ3qujB3bliFgZxaK11p0ucP4nIKDXvnyGjn'
  var POSTHOG_API_HOST = 'https://us.i.posthog.com'
  var GOOGLE_ADS_ID = 'AW-10776744781'
  var GOOGLE_ADS_SIGNUP_STARTED =
    'AW-10776744781/wjkKCNzh4MAYEM2m4JIo'
  var GOOGLE_ADS_PENDING_CHECKOUT_KEY = 'sugar.googleAds.pendingCheckout'
  var GOOGLE_ADS_CONVERSION_KEY_PREFIX = 'sugar.googleAds.conversion.'
  var GOOGLE_ADS_ALLOWED_HOSTS = {
    'conciergebysugar.com': true,
    'www.conciergebysugar.com': true
  }
  var googleAdsInitialized = false

  function isFixtureId(value) {
    return (
      /^(?:user[-_]?123|example(?:\.com)?|fixture[-_]|test[-_])/i.test(value) ||
      /^(?:cs|evt|pi)_[a-z0-9_-]*_123$/i.test(value)
    )
  }

  function initGoogleAdsTag() {
    if (
      !GOOGLE_ADS_ALLOWED_HOSTS[window.location.hostname] ||
      window.__SUGAR_DISABLE_EXTERNAL_ATTRIBUTION__ === true
    ) {
      return false
    }
    if (googleAdsInitialized) return true

    window.dataLayer = window.dataLayer || []
    window.gtag =
      window.gtag ||
      function () {
        window.dataLayer.push(arguments)
      }
    // Set cross-domain linking before the first config; a second config does
    // not update an already initialized Ads destination.
    window.gtag('set', 'linker', {
      domains: ['concierge.sugarwallet.co.nz', 'concierge.sugarwallet.co.uk']
    })
    window.gtag('js', new Date())
    window.gtag('config', GOOGLE_ADS_ID)

    var script = document.createElement('script')
    script.async = true
    script.src =
      'https://www.googletagmanager.com/gtag/js?id=' +
      encodeURIComponent(GOOGLE_ADS_ID)
    var firstScript = document.getElementsByTagName('script')[0]
    firstScript.parentNode.insertBefore(script, firstScript)
    googleAdsInitialized = true

    return true
  }

  initGoogleAdsTag()

  window.sugarGoogleAds = {
    trackCheckoutStarted: function (checkoutId) {
      var normalizedId = String(checkoutId || '').trim()
      if (!normalizedId || isFixtureId(normalizedId) || !initGoogleAdsTag()) {
        return false
      }

      try {
        window.sessionStorage.setItem(
          GOOGLE_ADS_PENDING_CHECKOUT_KEY,
          JSON.stringify({ id: normalizedId, startedAt: Date.now() })
        )
        var conversionKey =
          GOOGLE_ADS_CONVERSION_KEY_PREFIX + 'checkoutStarted.' + normalizedId
        if (window.localStorage.getItem(conversionKey)) return false
        window.localStorage.setItem(conversionKey, new Date().toISOString())
      } catch (_) {}

      window.gtag('event', 'conversion', {
        send_to: GOOGLE_ADS_SIGNUP_STARTED
      })

      return true
    }
  }

  // Guard: do nothing until a real key is configured, so we never ship events
  // to the wrong (or a placeholder) project.
  if (
    !GOOGLE_ADS_ALLOWED_HOSTS[window.location.hostname] ||
    window.__SUGAR_DISABLE_EXTERNAL_ATTRIBUTION__ === true ||
    typeof POSTHOG_PROJECT_KEY !== 'string' ||
    POSTHOG_PROJECT_KEY.indexOf('phc_') !== 0
  ) {
    if (window.console && console.warn) {
      console.warn(
        '[sugar-analytics] PostHog Project API Key not set in /assets/analytics.js — tracking disabled.'
      )
    }
    return
  }

  // Official PostHog web snippet (async-loads array.js from us-assets.i.posthog.com).
  !(function (t, e) {
    var o, n, p, r
    e.__SV ||
      ((window.posthog = e),
      (e._i = []),
      (e.init = function (i, s, a) {
        function g(t, e) {
          var o = e.split('.')
          2 == o.length && ((t = t[o[0]]), (e = o[1])),
            (t[e] = function () {
              t.push([e].concat(Array.prototype.slice.call(arguments, 0)))
            })
        }
        ;(p = t.createElement('script')).type = 'text/javascript'
        p.crossOrigin = 'anonymous'
        p.async = !0
        p.src =
          s.api_host.replace('.i.posthog.com', '-assets.i.posthog.com') +
          '/static/array.js'
        ;(r = t.getElementsByTagName('script')[0]).parentNode.insertBefore(p, r)
        var u = e
        for (
          void 0 !== a ? (u = e[a] = []) : (a = 'posthog'),
            u.people = u.people || [],
            u.toString = function (t) {
              var e = 'posthog'
              return (
                'posthog' !== a && (e += '.' + a), t || (e += ' (stub)'), e
              )
            },
            u.people.toString = function () {
              return u.toString(1) + '.people (stub)'
            },
            o =
              'init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug getPageViewId captureTraceFeedback captureTraceMetric'.split(
                ' '
              ),
            n = 0;
          n < o.length;
          n++
        )
          g(u, o[n])
        e._i.push([i, s, a])
      }),
      (e.__SV = 1))
  })(document, window.posthog || [])

  window.posthog.init(POSTHOG_PROJECT_KEY, {
    api_host: POSTHOG_API_HOST,
    // Don't create person profiles for anonymous marketing visitors — keeps
    // event volume/cost down while still capturing all behaviour.
    person_profiles: 'identified_only',
    // Autocapture clicks/inputs + automatic page views (this is a multi-page
    // static site, so each navigation is a real page load).
    autocapture: true,
    capture_pageview: true,
    capture_pageleave: true
  })

  // Lightweight named events for the primary marketing CTAs, so signup/login
  // funnels are easy to build without relying on autocapture selectors. We tag
  // by intent using href/text heuristics; autocapture still records everything
  // else automatically.
  document.addEventListener(
    'click',
    function (event) {
      var el = event.target && event.target.closest
        ? event.target.closest('a, button')
        : null
      if (!el) return

      var href = (el.getAttribute('href') || '').toLowerCase()
      var text = (el.textContent || '').trim().toLowerCase()
      var props = {
        cta_text: (el.textContent || '').trim().slice(0, 120),
        cta_href: el.getAttribute('href') || null,
        page_path: window.location.pathname
      }

      var isAppEntry =
        href.indexOf('/dashboard') === 0 ||
        href.indexOf('/connect-email') === 0 ||
        href.indexOf('/app') === 0
      var looksLikeSignup =
        /get started|sign up|signup|start (now|saving|free|membership)|join|create account/.test(
          text
        )
      var looksLikeLogin = /log ?in|sign ?in/.test(text)

      if (looksLikeLogin) {
        window.posthog.capture('marketing_login_clicked', props)
      } else if (looksLikeSignup || isAppEntry) {
        window.posthog.capture('marketing_cta_clicked', props)
      }
    },
    true
  )
})()
