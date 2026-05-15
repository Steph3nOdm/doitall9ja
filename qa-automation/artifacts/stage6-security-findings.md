# Stage 6 Security & Access Report

Manual security review is still required for confirmed exploitability.

## Findings

- [MEDIUM] restricted-page-access | https://doitall9ja.com/admin | status=200 | Restricted candidate path returned HTTP 200.
- [MEDIUM] restricted-page-access | https://doitall9ja.com/dashboard | status=200 | Restricted candidate path returned HTTP 200.
- [MEDIUM] restricted-page-access | https://doitall9ja.com/account | status=200 | Restricted candidate path returned HTTP 200.
- [MEDIUM] restricted-page-access | https://doitall9ja.com/profile | status=200 | Restricted candidate path returned HTTP 200.
- [MEDIUM] restricted-page-access | https://doitall9ja.com/settings | status=200 | Restricted candidate path returned HTTP 200.
- [MEDIUM] restricted-page-access | https://doitall9ja.com/orders | status=200 | Restricted candidate path returned HTTP 200.
- [MEDIUM] restricted-page-access | https://doitall9ja.com/checkout | status=200 | Restricted candidate path returned HTTP 200.
- [MEDIUM] unauthenticated-api-access | https://doitall9ja.com/api/user | status=200 | API endpoint is reachable without auth.
- [MEDIUM] unauthenticated-api-access | https://doitall9ja.com/api/admin | status=200 | API endpoint is reachable without auth.
- [MEDIUM] unauthenticated-api-access | https://doitall9ja.com/api/orders | status=200 | API endpoint is reachable without auth.
- [MEDIUM] unauthenticated-api-access | https://doitall9ja.com/api/settings | status=200 | API endpoint is reachable without auth.