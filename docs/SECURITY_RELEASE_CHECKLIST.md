# Security and Release Checklist

## Identity and authorization

- [ ] Production identity provider configured.
- [ ] Administrator bootstrap restricted and documented.
- [ ] Role assignments stored server-side.
- [ ] Tenant and ownership checks enforced in every query.
- [ ] Authorization regression tests pass.

## Data protection

- [ ] Secrets stored only in managed runtime configuration.
- [ ] Logs contain no child personal information.
- [ ] Media type, size, ownership, and consent validated.
- [ ] Export and deletion flows tested.
- [ ] Retention jobs and legal holds tested.

## Reliability

- [ ] Backup completed and restoration demonstrated.
- [ ] Health checks and alerting operational.
- [ ] Incident response exercise completed.
- [ ] Dependency and vulnerability review completed.
- [ ] Production rollback demonstrated.

## Release authority

- [ ] Product approval.
- [ ] Technical approval.
- [ ] Privacy approval.
- [ ] Safeguarding approval.
- [ ] Legal approval where required.
