# User Personas — AI Socratic Learning Studio

Three personas for the initial vertical: **AI/ML Tutor for Professionals**.

---

## Persona 1 — The Transitioning Engineer

**Name:** Marco, 31, Software Engineer → ML Engineer  
**Context:** 6 years of backend engineering. Switched to an ML-heavy team 8 months ago. Writes training loops but cannot explain why they work.

**Goal:** Understand the conceptual foundations he skipped — backpropagation, attention, embeddings — well enough to make architectural decisions, not just implement them.

**Pain:** Courses are too slow. Chatbots give him answers but don't reveal whether he actually understood. He passes the quiz but can't explain it a week later.

**What he needs from this product:**
- A tutor that probes his understanding instead of lecturing
- A record of where his mental model is wrong
- Flashcards and summaries he can review before a design meeting

**Session behavior:** Opens the app with a specific concept. Wants to go deep on one thing per session (30–45 min). Values precision over breadth.

---

## Persona 2 — The Technical PM

**Name:** Sofia, 34, Senior Product Manager at an AI startup  
**Context:** Non-technical background but has been working with ML teams for 3 years. Needs enough depth to evaluate tradeoffs, write specs, and challenge engineers credibly.

**Goal:** Understand AI/ML at a conceptual level — not to implement, but to reason about systems intelligently.

**Pain:** She reads documentation but can't distinguish what's important from what's noise. She suspects she has misconceptions she doesn't know she has.

**What she needs from this product:**
- A patient tutor that meets her where she is
- Clear analogies and mental models, not math
- A knowledge map that shows her what she's covered and what's missing

**Session behavior:** Opens the app for 20-minute learning bursts. Prefers conceptual-first explanations. Often triggers the "missing prerequisite" detection because she jumps into advanced topics.

---

## Persona 3 — The Curious Architect

**Name:** James, 42, Solutions Architect at a cloud provider  
**Context:** Deep systems knowledge, zero ML background. His company is integrating LLM-based features into its platform and he needs to evaluate vendor claims.

**Goal:** Build a rigorous mental model of how LLMs work — enough to detect marketing BS and make sound infrastructure decisions.

**Pain:** He's used to reading specs and primary sources but foundational ML resources assume math background he doesn't have. He needs a tutor who can bridge systems intuition to ML concepts.

**What he needs from this product:**
- Analogies rooted in systems engineering (e.g., transformers ↔ message brokers)
- Misconception correction that's blunt, not gentle
- Session artifacts he can share with his team as structured notes

**Session behavior:** Starts with a topic map ("explain LLM architecture from first principles"). Explores breadth first, then dives into gaps. High confidence, so misconception detection is especially important for him.
