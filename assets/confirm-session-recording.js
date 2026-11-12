/* eslint-disable */
/*
 * Sugar — PostHog session replay for the public /confirm form ONLY.
 * (eslint disabled: this file embeds PostHog's vendored install snippet.)
 *
 * WHY A SEPARATE FILE:
 * The marketing analytics loader (/assets/analytics.js) is intentionally NOT
 * loaded inside the SPA app shell (app-template.html), so the logged-in app and
 * the /dashboard are never tracked. The /confirm record-confirmation form is a
 * public page served by that same SPA shell, so it would otherwise get no
 * telemetry at all. This snippet is loaded by the shell but HARD-GATED to the
 * /confirm route, so it activates only there and no-ops on every other SPA route
 * (dashboard, settings, membership setup, …).
 *
 * WHY: people fill this form in by typing, and we want to watch real sessions to
 * find where they get stuck. Ordinary answers are recorded UN-masked on purpose —
 * otherwise every typed character would show as asterisks and the replay would be
 * useless. Answers the page encrypts (a card number, a memorable word) are the
 * exception: password boxes inside .ph-no-capture, masked and blocked from replay.
 *
 * EXTENDED LINKS: confirm links carry a token in the URL fragment, e.g.
 *   /confirm#02385377f0501331ccda7fcb94d3ff2bec7d2b29
 * The gate matches on pathname alone, so every fragment variant (record confirm,
 * debt review "d.", affordability "a.", budget previews) is covered.
 *
 * SERVER TOGGLE: replay also has to be enabled in PostHog → Settings → Project →
 * "Record user sessions". This snippet sets disable_session_recording:false and
 * calls startSessionRecording(), but PostHog will only persist recordings when
 * that project setting is on.
 *
 * CSP: us(-assets).i.posthog.com is already allowed by *.posthog.com in
 * nginx-security-headers.conf (script-src/connect-src/img-src), and the replay
 * compression worker is covered by worker-src 'self' blob:.
 */
(function () {
  'use strict'

  var POSTHOG_PROJECT_KEY = 'phc_M67LAgZJ3qujB3bliFgZxaK11p0ucP4nIKDXvnyGjn'
  var POSTHOG_API_HOST = 'https://us.i.posthog.com'
  var ALLOWED_HOSTS = {
    'conciergebysugar.com': true,
    'www.conciergebysugar.com': true
  }

  // Gate 1: only the public /confirm route (any fragment), never the rest of
  // the SPA. Trailing slash tolerated.
  var path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (path !== '/confirm') return

  // Gate 2: production hosts only, and honour the app shell's attribution
  // kill-switch (set when a URL carries sensitive claim material).
  if (
    !ALLOWED_HOSTS[window.location.hostname] ||
    window.__SUGAR_DISABLE_EXTERNAL_ATTRIBUTION__ === true
  ) {
    return
  }

  // Gate 3: never ship to a placeholder project.
  if (
    typeof POSTHOG_PROJECT_KEY !== 'string' ||
    POSTHOG_PROJECT_KEY.indexOf('phc_') !== 0
  ) {
    if (window.console && console.warn) {
      console.warn(
        '[sugar-confirm-replay] PostHog Project API Key not set — session recording disabled.'
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
    person_profiles: 'identified_only',
    autocapture: true,
    capture_pageview: true,
    capture_pageleave: true,
    // Record the whole /confirm session...
    disable_session_recording: false,
    session_recording: {
      // ...with NO input masking — people type their answers in and we want to
      // see exactly what they typed. The one exception: answers the page
      // encrypts (a card number, a memorable word) sit in password boxes inside
      // .ph-no-capture, so they are masked and left out of the recording entirely.
      maskAllInputs: false,
      maskInputOptions: { password: true },
      blockClass: 'ph-no-capture',
      // Do not auto-mask any text by selector.
      maskTextSelector: null
    },
    loaded: function (ph) {
      // Server setting permitting, make sure replay is running for this view.
      try {
        if (typeof ph.startSessionRecording === 'function') {
          ph.startSessionRecording()
        }
      } catch (_) {}
    }
  })
})()
