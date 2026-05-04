# Research: legal & responsible data access

**Disclaimer:** This document captures **engineering and product guardrails**, not legal advice. Engage qualified counsel before launching features that **place orders**, **act on behalf of users**, or **circumvent retailer terms**.

---

## 10. Checkout strategy

### MVP: handoff / redirect

- After comparison, the user **opens the retailer’s own site/app** (deep link where available, otherwise clear instructions).
- We **do not** submit payment or complete purchase on the user’s behalf in MVP.

**Why**: minimizes legal and ToS risk, aligns with “we’re a decisioning layer, not the merchant of record.”

### Future: official API / partner integration

- Preferred path where a chain exposes a **documented partner API** or **affiliate checkout** with contractual permission.
- Integration should still be **explicitly consented** by the user per retailer.

### Avoid: server-side automated checkout without approval

- **Do not** implement headless checkout (credential storage, auto-form-fill submission, bot checkout) unless **explicitly** cleared legally and contractually.
- Such flows can violate **retailer terms**, **payment network rules**, and local consumer laws.

---

## Data scraping vs published feeds

- **Prefer** **published transparency files** and **official bulk endpoints** where they exist.
- **Screen scraping** HTML as a last resort: brittle, higher legal/reputational risk, harder to audit.
- Always record **`IngestionFile`** metadata (URL/path, hash, time) for traceability.

---

## Privacy (preview)

- MVP may run **without accounts**; session-based bags should still avoid collecting unnecessary PII.
- When auth arrives, document **retention** and **deletion** for bag and comparison history.

---

## Related docs

- [Data sources](./data-sources.md)
- [Architecture overview](../architecture/overview.md)
- [Basket comparison](../architecture/basket-comparison.md)
