# Security finding, Sep 18, 2026 (synthetic)
Repo: lumen-app. Area: CSV export (exports.py).
Snyk Code rule: SQL injection (python/Sqli), severity high.
What happened: the export endpoint built its SQL with an f-string from the account_id query parameter. A crafted
account_id returned rows from other customers. Fixed by switching to a parameterised query.
Lesson: every query in the export path must use placeholders; never format request input into SQL.
