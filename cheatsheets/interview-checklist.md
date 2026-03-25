# System Design Interview Checklist

> Use this checklist during practice to ensure you cover all important areas. Print it out or keep it open during mock interviews.

---

## Before the Interview

- [ ] Review the 45-minute framework
- [ ] Practice 2-3 back-of-envelope calculations
- [ ] Review common architecture patterns
- [ ] Know your database trade-offs
- [ ] Prepare to draw clear diagrams

---

## During the Interview (45-Minute Framework)

### Phase 1: Requirements (0–5 min)

- [ ] Ask clarifying questions (don't assume)
- [ ] Define **Functional Requirements** (3–5 core features)
- [ ] Define **Non-Functional Requirements**:
  - [ ] Scale (users, DAU, QPS)
  - [ ] Latency (p50, p99)
  - [ ] Availability (99.9%? 99.99%?)
  - [ ] Consistency (strong or eventual?)
  - [ ] Durability (can we lose data?)
- [ ] State **Assumptions** explicitly
- [ ] Define **Out of Scope** (what you won't design)

### Phase 2: Capacity Estimation (5–10 min)

- [ ] Estimate DAU
- [ ] Estimate QPS (read + write separately)
- [ ] Estimate Peak QPS (×2 or ×3)
- [ ] Estimate Storage (daily, yearly)
- [ ] Estimate Bandwidth
- [ ] Estimate Cache size (20% rule)

### Phase 3: API Design (10–15 min)

- [ ] Define core APIs (2–4 endpoints)
- [ ] Specify request/response format
- [ ] Include authentication (API key, JWT)
- [ ] Mention pagination for list endpoints
- [ ] Consider rate limiting

### Phase 4: High-Level Design (15–35 min)

- [ ] Draw top-level architecture diagram
- [ ] Identify core components:
  - [ ] Client (web, mobile)
  - [ ] Load Balancer
  - [ ] API Server(s)
  - [ ] Database(s)
  - [ ] Cache
  - [ ] Message Queue (if async needed)
  - [ ] CDN (if static content)
  - [ ] Blob Storage (if media)
- [ ] Explain data flow for each core operation
- [ ] Choose database with justification
- [ ] Explain caching strategy
- [ ] Deep dive into 1-2 critical components

### Phase 5: Scaling & Trade-offs (35–42 min)

- [ ] Identify bottlenecks
- [ ] Propose scaling solutions:
  - [ ] Horizontal scaling for stateless services
  - [ ] Database sharding / read replicas
  - [ ] Cache layer for hot data
  - [ ] CDN for static content
  - [ ] Queue for async processing
- [ ] Discuss failure scenarios:
  - [ ] What if the DB goes down?
  - [ ] What if the cache fails?
  - [ ] What about network partitions?
- [ ] State trade-offs explicitly:
  - [ ] Consistency vs Availability
  - [ ] Latency vs Correctness
  - [ ] Cost vs Performance
  - [ ] Simplicity vs Scalability

### Phase 6: Wrap-up (42–45 min)

- [ ] Summarize the design in 2–3 sentences
- [ ] Mention what you'd improve with more time
- [ ] Ask if the interviewer wants to dive deeper anywhere

---

## Common Mistakes to Avoid

| Mistake | Fix |
|---------|-----|
| Jumping straight to architecture | Start with requirements |
| No capacity estimation | Always do quick math |
| Single point of failure | Add redundancy everywhere |
| Only happy path | Discuss failure modes |
| "I'd use microservices" without reasoning | Justify every choice |
| Over-engineering for small scale | Match design to requirements |
| Not mentioning monitoring | Always add observability |
| Ignoring security | Mention auth, encryption, rate limiting |
| Talking too long on one area | Watch the clock, move on |
| Not driving the conversation | Take initiative, don't wait |

---

## Quick Quality Check

After your design, verify:

- [ ] Does it meet all functional requirements?
- [ ] Does it meet the scale requirements?
- [ ] Is there no single point of failure?
- [ ] Is the data model sensible?
- [ ] Can each component scale independently?
- [ ] Did I discuss at least 2 trade-offs?
- [ ] Did I mention monitoring/observability?
- [ ] Could I implement this in code?

---

## Scoring Rubric (What Interviewers Grade On)

| Area | Weight | What They Look For |
|------|--------|-------------------|
| **Problem Exploration** | 20% | Requirements, clarifying questions, scope |
| **High-Level Design** | 30% | Clean architecture, right components, data flow |
| **Technical Depth** | 25% | Deep dive on critical components, algorithms |
| **Trade-off Discussion** | 15% | Awareness of alternatives and their costs |
| **Communication** | 10% | Clarity, structured thinking, collaboration |
