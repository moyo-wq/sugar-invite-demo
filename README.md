# Sugar — invite-only flow (demo)

Full static demo of the Sugar site + invite-only sign-up gate. Runs against the
live Supabase invite backend (anon key, RLS-protected). Landing → "Sign up" →
the gate: paying customer → log in, invited/code → sign-up, else → "know a
member?" → vouch or waitlist. Invite link: append `?invite=FOUNDER`.
Backend-only steps (checkout, real login, mailbox connect) are shown as in-page
notes since this is a static demo.
