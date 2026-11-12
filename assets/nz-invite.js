/*
 * Invite-only signup — logic layer + site-wide redirect (PROTOTYPE).
 *
 * A NEW, separate system from the existing referral (?ref=) flow. The whole UI
 * lives on the /invite page; everywhere else, any sign-up/pay attempt by a
 * not-yet-admitted visitor is redirected to /invite (no popups).
 *
 * This file is the data/logic layer:
 *   - talks to Supabase security-definer RPCs (anon key cannot read member rows)
 *   - remembers admission in sessionStorage
 *   - installs the site-wide redirect for "Get started"/sign-up CTAs
 *
 * Supabase RPCs:
 *   nz_invite_check(p_email)              -> 'member' | 'not_member'
 *   nz_invite_vouch(p_email, p_inviter)   -> 'allowed' | 'waitlisted'
 *   nz_invite_waitlist(p_email)           -> 'waitlisted'
 *   nz_invite_resolve_code(p_code)        -> inviter_email | null
 *   nz_invite_redeem_code(p_email,p_code) -> 'allowed' | 'invalid_code'
 *
 * Public API: window.NZInviteGate
 *   getAdmission()                 -> {admitted,email,inviterEmail,code} | null
 *   setAdmitted({email,inviterEmail,code}) -> state   (writes session + returns it)
 *   check(email)                   -> Promise<'member'|'not_member'>
 *   vouch(email, inviter)          -> Promise<'allowed'|'waitlisted'>
 *   waitlist(email)                -> Promise<'waitlisted'>
 *   resolveCode(code)              -> Promise<inviterEmail|null>
 *   redeemCode(email, code)        -> Promise<'allowed'|'invalid_code'>
 *   checkMember(email)             -> Promise<boolean>   (login gate)
 *   isEmail(value)                 -> boolean
 *
 * Invite code URL param: ?invite=CODE (deliberately NOT ?ref=).
 */
;(function () {
  'use strict'

  var STORAGE_KEY = 'sugar.nzInvite.v1'
  var INVITE_PARAM = 'invite'
  var INVITE_PAGE = 'invite.html'

  // Baked-in config so a single <script> include works on every page. anonKey
  // is a public key; the member tables are sealed behind RLS + definer RPCs.
  var DEFAULT_CONFIG = {
    url: 'https://vjfyuqdypacsffuulbdv.supabase.co',
    anonKey:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqZnl1cWR5cGFjc2ZmdXVsYmR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNDg5NDcsImV4cCI6MjA2NDYyNDk0N30.25H6QRkdmLzuYYt2F0NaLznKfzt2vcDjZ2LXFtINfR8'
  }
  var cfg = window.NZ_INVITE_CONFIG || DEFAULT_CONFIG

  // ----- storage -----------------------------------------------------------
  function loadState() {
    try {
      return JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || '{}') || {}
    } catch (e) {
      return {}
    }
  }
  function getAdmission() {
    var s = loadState()
    return s && s.admitted ? s : null
  }
  function setAdmitted(info) {
    info = info || {}
    var state = {
      admitted: true,
      email: info.email || null,
      inviterEmail: info.inviterEmail || null,
      code: info.code || null
    }
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (e) {
      /* ignore */
    }
    return state
  }

  // ----- supabase rpc ------------------------------------------------------
  function rpc(fn, args) {
    if (!cfg.url || !cfg.anonKey) {
      return Promise.reject(new Error('nz-invite: missing config'))
    }
    return fetch(cfg.url.replace(/\/$/, '') + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: {
        apikey: cfg.anonKey,
        Authorization: 'Bearer ' + cfg.anonKey,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(args || {})
    }).then(function (res) {
      return res.json().catch(function () {
        return null
      })
    })
  }

  function isEmail(value) {
    return /.+@.+\..+/.test(String(value || '').trim())
  }

  // ----- public operations -------------------------------------------------
  function check(email) {
    return rpc('nz_invite_check', { p_email: email })
  }
  function vouch(email, inviter) {
    return rpc('nz_invite_vouch', { p_email: email, p_inviter: inviter })
  }
  function waitlist(email) {
    return rpc('nz_invite_waitlist', { p_email: email })
  }
  function resolveCode(code) {
    return rpc('nz_invite_resolve_code', { p_code: code }).then(function (r) {
      return r && typeof r === 'string' ? r : null
    })
  }
  function redeemCode(email, code) {
    return rpc('nz_invite_redeem_code', { p_email: email, p_code: code })
  }
  // Fire-and-forget: tell the backend a waitlisted user is connecting their
  // email (so moyo@ gets notified). Resolves even on error so navigation
  // never blocks.
  function notifyConnect(email, provider) {
    return rpc('nz_invite_notify_connect', {
      p_email: email,
      p_provider: provider
    }).catch(function () {
      return null
    })
  }

  // Login gate: only a real (current OR past) paying customer may log in.
  // Fail-open on a network error so a flaky check never locks out a real member.
  function checkMember(email) {
    return check(email)
      .then(function (r) {
        return r === 'paying'
      })
      .catch(function () {
        return true
      })
  }

  // ----- site-wide redirect (no popups) -----------------------------------
  // Any "Get started"/sign-up CTA (an <a> pointing at #get-started) sends a
  // not-yet-admitted visitor to the /invite page. The pay button on the offer
  // and landing pages is gated inline (it redirects to /invite itself).
  function signupAnchor(target) {
    if (!target) return null
    if (target.closest('[data-membership-checkout]')) return null
    var a = target.closest('a[href]')
    if (!a) return null
    var href = a.getAttribute('href') || ''
    if (/(^|\/)#get-started$/.test(href) || href === '#get-started') return a
    return null
  }

  function installRedirect() {
    document.addEventListener(
      'click',
      function (e) {
        var a = signupAnchor(e.target)
        if (!a) return
        if (getAdmission()) {
          // Already in. If the sign-up section is on this page, scroll to it
          // ourselves — a plain anchor click is a no-op when the hash is
          // already #get-started (which it is after we redirect there post
          // admission), leaving the CTA looking dead. Cross-page links fall
          // through to normal navigation.
          var section = document.getElementById('get-started')
          if (section) {
            e.preventDefault()
            section.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
          return
        }
        e.preventDefault()
        e.stopPropagation()
        var next
        try {
          var u = new URL(a.href)
          next = u.pathname + (u.hash || '#get-started')
        } catch (err) {
          next = '/#get-started'
        }
        window.location.assign(INVITE_PAGE + '?next=' + encodeURIComponent(next))
      },
      true
    )
  }

  // An invite code anywhere on the site funnels to /invite, which greets the
  // visitor by their inviter and stores the link. "Straight to sign up."
  function handleInviteCodeArrival() {
    if (/invite(\.html)?$/.test(window.location.pathname)) return // the page handles it
    if (getAdmission()) return
    var code = (new URLSearchParams(window.location.search).get(INVITE_PARAM) || '').trim()
    if (!code) return
    window.location.assign(INVITE_PAGE + '?' + INVITE_PARAM + '=' + encodeURIComponent(code))
  }

  function init() {
    installRedirect()
    handleInviteCodeArrival()
  }

  window.NZInviteGate = {
    getAdmission: getAdmission,
    setAdmitted: setAdmitted,
    check: check,
    vouch: vouch,
    waitlist: waitlist,
    resolveCode: resolveCode,
    redeemCode: redeemCode,
    checkMember: checkMember,
    notifyConnect: notifyConnect,
    isEmail: isEmail,
    _rpc: rpc
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
