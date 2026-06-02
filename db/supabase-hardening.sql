ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_user_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_official_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_signup_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.groups FROM anon, authenticated;
REVOKE ALL ON public.entries FROM anon, authenticated;
REVOKE ALL ON public.app_settings FROM anon, authenticated;
REVOKE ALL ON public.companies FROM anon, authenticated;
REVOKE ALL ON public.company_branding FROM anon, authenticated;
REVOKE ALL ON public.company_domains FROM anon, authenticated;
REVOKE ALL ON public.company_users FROM anon, authenticated;
REVOKE ALL ON public.company_user_credentials FROM anon, authenticated;
REVOKE ALL ON public.company_predictions FROM anon, authenticated;
REVOKE ALL ON public.company_official_results FROM anon, authenticated;
REVOKE ALL ON public.company_signup_links FROM anon, authenticated;
REVOKE ALL ON public.auth_rate_limits FROM anon, authenticated;

CREATE UNIQUE INDEX IF NOT EXISTS company_domains_one_primary_per_company_idx
ON public.company_domains (company_id)
WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS company_users_company_role_status_idx
ON public.company_users (company_id, role, status);

CREATE INDEX IF NOT EXISTS company_predictions_lookup_idx
ON public.company_predictions (company_id, game_mode, scope_key);
