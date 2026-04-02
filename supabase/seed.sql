-- ============================================================
-- seed.sql
-- Seed data for CRM Web Firm
-- ============================================================

-- ============================================================
-- Firm Settings (single row)
-- ============================================================

INSERT INTO firm_settings (
  id,
  firm_name,
  firm_logo_url,
  firm_address,
  firm_email,
  firm_phone,
  invoice_prefix,
  invoice_next_num,
  default_currency,
  default_tax_pct,
  default_payment_terms,
  invoice_footer
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Acme Web Studio',
  NULL,
  '123 Creative Lane, San Francisco, CA 94102',
  'billing@acmewebstudio.com',
  '+1 (415) 555-0100',
  'INV',
  1,
  'USD',
  0.00,
  'Net 30',
  'Thank you for your business! Payment is due within 30 days of invoice date. Late payments may incur a 1.5% monthly fee.'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Agreement Templates
-- ============================================================

-- Template 1: Web Development Contract
INSERT INTO agreement_templates (
  id,
  name,
  description,
  content,
  is_default,
  created_by
) VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'Web Development Contract',
  'Standard contract for web development projects covering scope, deliverables, payment terms, and IP ownership.',
  E'# Web Development Contract\n\n**This Web Development Contract ("Agreement")** is entered into as of {{DATE}} by and between:\n\n**{{FIRM_NAME}}** ("Developer"), located at {{FIRM_ADDRESS}}\n\nand\n\n**{{CLIENT_COMPANY}}** ("Client"), represented by {{CLIENT_NAME}}.\n\n---\n\n## 1. Project Scope\n\nDeveloper agrees to design and develop the following website/application:\n\n**Project Name:** {{PROJECT_NAME}}\n\n**Description:**\n{{PROJECT_DESCRIPTION}}\n\n**Key Deliverables:**\n- [ ] Project discovery and requirements documentation\n- [ ] UI/UX design mockups (up to 3 revision rounds)\n- [ ] Responsive front-end development\n- [ ] Back-end development and database setup\n- [ ] Testing and quality assurance\n- [ ] Deployment and launch support\n- [ ] 30-day post-launch bug fix period\n\n---\n\n## 2. Project Timeline\n\n- **Estimated Duration:** {{TIMELINE_WEEKS}} weeks\n- **Estimated Completion:** {{DEADLINE}}\n\nTimelines are estimates. Delays caused by Client feedback delays or scope changes may affect the schedule.\n\n---\n\n## 3. Payment Terms\n\n**Total Project Fee:** {{TOTAL_AMOUNT}}\n\n**Payment Schedule:**\n- 50% deposit due upon signing this Agreement\n- 25% due upon design approval\n- 25% due upon project launch\n\nPayments are due within 7 days of invoice. A 1.5% monthly late fee applies to overdue balances.\n\n---\n\n## 4. Change Orders\n\nAny work outside the agreed scope requires a written Change Order with additional cost and timeline estimates. No out-of-scope work will begin without written approval.\n\n---\n\n## 5. Intellectual Property\n\nUpon receipt of full payment, Client shall own all custom code and design created specifically for this project. Developer retains ownership of any proprietary tools, frameworks, libraries, or pre-existing code incorporated into the project.\n\n---\n\n## 6. Confidentiality\n\nBoth parties agree to keep confidential all non-public information exchanged during this project, including business strategies, technical details, and client data.\n\n---\n\n## 7. Warranties & Liability\n\nDeveloper warrants the website will function as described for 30 days post-launch. Developer''s total liability is limited to the total fees paid under this Agreement.\n\n---\n\n## 8. Termination\n\nEither party may terminate this Agreement with 14 days written notice. Client shall pay for all work completed to the termination date.\n\n---\n\n## 9. Governing Law\n\nThis Agreement shall be governed by the laws of the State of California.\n\n---\n\n## Signatures\n\n**Developer:** {{FIRM_NAME}}\nSigned: _________________________ Date: _____________\n\n**Client:** {{CLIENT_COMPANY}}\nSigned: _________________________ Date: _____________\nName (Print): _________________________',
  true,
  NULL
)
ON CONFLICT (id) DO NOTHING;

-- Template 2: Maintenance Agreement
INSERT INTO agreement_templates (
  id,
  name,
  description,
  content,
  is_default,
  created_by
) VALUES (
  'b0000000-0000-0000-0000-000000000002',
  'Website Maintenance Agreement',
  'Ongoing monthly maintenance retainer covering updates, backups, security monitoring, and support hours.',
  E'# Website Maintenance Agreement\n\n**This Website Maintenance Agreement ("Agreement")** is entered into as of {{DATE}} between:\n\n**{{FIRM_NAME}}** ("Service Provider")\n\nand\n\n**{{CLIENT_COMPANY}}** ("Client").\n\n---\n\n## 1. Services Included\n\nService Provider will perform the following maintenance services each month:\n\n### Standard Plan — {{PLAN_NAME}}\n\n- **CMS & Plugin Updates:** Core, theme, and plugin updates applied monthly\n- **Security Monitoring:** Daily malware scans and firewall rule updates\n- **Uptime Monitoring:** 24/7 uptime checks with email alerts\n- **Daily Backups:** Off-site encrypted backups retained for 30 days\n- **Performance Monitoring:** Monthly page speed checks and optimizations\n- **Support Hours:** Up to {{SUPPORT_HOURS}} hours/month of development or content updates\n- **Monthly Report:** Summary of all activities and site health metrics\n\n---\n\n## 2. Response Times\n\n| Priority | Description | Response Time |\n|----------|-------------|---------------|\n| Critical | Site down / security breach | Within 2 hours |\n| High | Major functionality broken | Within 4 hours |\n| Medium | Minor bugs / content issues | Within 1 business day |\n| Low | Enhancement requests | Within 3 business days |\n\n---\n\n## 3. Fees\n\n**Monthly Retainer:** {{MONTHLY_FEE}} per month\n\nBilled on the 1st of each month. Payment due within 7 days of invoice.\n\nAdditional development work beyond included support hours is billed at {{HOURLY_RATE}}/hour and requires prior written approval.\n\n---\n\n## 4. Term & Renewal\n\nThis Agreement begins on {{START_DATE}} and continues month-to-month until cancelled. Either party may cancel with 30 days written notice.\n\n---\n\n## 5. Client Responsibilities\n\nClient agrees to:\n- Provide timely access to hosting, CMS, and third-party service credentials\n- Respond to critical security alerts within 24 hours\n- Maintain a current backup of all proprietary content\n\n---\n\n## 6. Exclusions\n\nThis Agreement does not cover:\n- New feature development (billed separately)\n- Third-party service fees (hosting, domains, SaaS tools)\n- Issues caused by Client modifications without prior approval\n- Force majeure events\n\n---\n\n## 7. Limitation of Liability\n\nService Provider''s liability is limited to three months of fees paid. Service Provider is not liable for data loss, revenue loss, or indirect damages.\n\n---\n\n## Signatures\n\n**Service Provider:** {{FIRM_NAME}}\nSigned: _________________________ Date: _____________\n\n**Client:** {{CLIENT_COMPANY}}\nSigned: _________________________ Date: _____________\nName (Print): _________________________',
  false,
  NULL
)
ON CONFLICT (id) DO NOTHING;

-- Template 3: Project Proposal
INSERT INTO agreement_templates (
  id,
  name,
  description,
  content,
  is_default,
  created_by
) VALUES (
  'b0000000-0000-0000-0000-000000000003',
  'Project Proposal',
  'Formal project proposal outlining approach, scope, timeline, and investment for prospective clients.',
  E'# Project Proposal\n\n**Prepared for:** {{CLIENT_COMPANY}} ({{CLIENT_NAME}})\n**Prepared by:** {{FIRM_NAME}}\n**Date:** {{DATE}}\n**Proposal Valid Until:** {{EXPIRY_DATE}}\n\n---\n\n## Executive Summary\n\nThank you for the opportunity to submit this proposal. We are excited about the prospect of working together on **{{PROJECT_NAME}}**.\n\nBased on our discovery conversations, we have outlined below our recommended approach, scope of work, timeline, and investment required to bring your vision to life.\n\n---\n\n## Understanding Your Goals\n\n{{PROJECT_DESCRIPTION}}\n\n**Target Audience:** {{TARGET_AUDIENCE}}\n\n**Key Success Metrics:**\n- Improved user experience and conversion rates\n- Faster page load times\n- Mobile-first responsive design\n- Scalable architecture for future growth\n\n---\n\n## Our Approach\n\nWe follow an iterative, collaborative process:\n\n### Phase 1 — Discovery & Strategy (Week 1–2)\n- Stakeholder interviews and requirements workshop\n- Competitor and market analysis\n- Information architecture and sitemap\n- Technical requirements specification\n\n### Phase 2 — Design (Week 3–5)\n- Wireframes for key pages\n- Visual design concepts (2 directions)\n- Design revisions (up to 2 rounds)\n- Design system / style guide\n\n### Phase 3 — Development (Week 6–{{TIMELINE_WEEKS}})\n- Front-end development (HTML/CSS/JS)\n- Back-end and CMS integration\n- Third-party integrations\n- Cross-browser and device testing\n\n### Phase 4 — Launch & Handoff\n- Staging environment review\n- Performance optimisation\n- Production deployment\n- Team training and documentation\n- 30-day post-launch support\n\n---\n\n## Technology Stack\n\n**Technologies we recommend for this project:**\n{{TECH_STACK}}\n\n---\n\n## Timeline\n\n- **Project Kickoff:** Upon signed agreement and deposit receipt\n- **Estimated Completion:** {{DEADLINE}}\n- **Total Duration:** Approximately {{TIMELINE_WEEKS}} weeks\n\n---\n\n## Investment\n\n| Item | Cost |\n|------|------|\n| Discovery & Strategy | Included |\n| UX/UI Design | Included |\n| Development | Included |\n| Testing & QA | Included |\n| Launch & Handoff | Included |\n| **Total Investment** | **{{TOTAL_AMOUNT}}** |\n\n**Budget Range:** {{BUDGET_MIN}} – {{BUDGET_MAX}}\n\n### Payment Schedule\n- 50% upon signing ({{DEPOSIT_AMOUNT}})\n- 25% upon design approval\n- 25% upon project launch\n\n---\n\n## Why {{FIRM_NAME}}?\n\n- **Experienced Team:** Years of experience building web solutions for businesses like yours\n- **Transparent Process:** Regular updates, shared project management, no surprises\n- **Long-term Partnership:** We build relationships, not just websites\n- **Quality Guarantee:** 30-day post-launch bug fix warranty included\n\n---\n\n## Next Steps\n\n1. Review this proposal and let us know if you have any questions\n2. Sign the proposal to proceed (or request adjustments)\n3. Pay the 50% deposit to kick off the project\n4. Attend the project kickoff meeting\n\n---\n\n## Acceptance\n\nBy signing below, {{CLIENT_COMPANY}} agrees to move forward with the project as described in this proposal and authorises {{FIRM_NAME}} to begin work upon receipt of the deposit.\n\n**{{FIRM_NAME}}:**\nSigned: _________________________ Date: _____________\n\n**{{CLIENT_COMPANY}}:**\nSigned: _________________________ Date: _____________\nName (Print): _________________________',
  false,
  NULL
)
ON CONFLICT (id) DO NOTHING;
