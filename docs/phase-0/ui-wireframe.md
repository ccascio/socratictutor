# UI Wireframes — Phase 1 Screens

ASCII wireframes for the four screens to build in Phase 1. All examples use AI/ML topics.

---

## Screen 1 — Home Dashboard

```
┌─────────────────────────────────────────────────────────────────────┐
│  SIDEBAR          │  Home                                           │
│  ─────────        │  ───────────────────────────────────────────    │
│  [Chat UI]        │                                                 │
│  [Dashboard] ◀    │  Active Goals                                   │
│  [Concepts]       │  ┌────────────────────┐  ┌────────────────────┐ │
│  [History]        │  │ Transformer Arch.  │  │ RAG Fundamentals   │ │
│  [Export]         │  │ Mastery: 38%       │  │ Mastery: 15%       │ │
│                   │  │ Last: 2 days ago   │  │ Last: 1 week ago   │ │
│                   │  │ [Continue]         │  │ [Continue]         │ │
│                   │  └────────────────────┘  └────────────────────┘ │
│                   │                                                 │
│                   │  + New Learning Goal                            │
│                   │                                                 │
│                   │  ──────────────────────────────────────────     │
│                   │  Review Due                      3 items        │
│                   │  ┌──────────────────────────────────────────┐  │
│                   │  │ ⚠ Q/K/V vectors are fixed like embeddings│  │
│                   │  │   Misconception · Transformers · overdue  │  │
│                   │  ├──────────────────────────────────────────┤  │
│                   │  │ ○ Softmax normalization in attention      │  │
│                   │  │   Concept · Weak · due today              │  │
│                   │  ├──────────────────────────────────────────┤  │
│                   │  │ ○ What is a token embedding?              │  │
│                   │  │   Flashcard · due today                   │  │
│                   │  └──────────────────────────────────────────┘  │
│                   │                                                 │
│                   │  Recent Sessions                                │
│                   │  · Attention mechanisms — 42 min — 4 concepts  │
│                   │  · Embedding spaces — 28 min — 3 concepts      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Screen 2 — Socratic Session

```
┌─────────────────────────────────────────────────────────────────────┐
│  SIDEBAR          │  Session: Attention in Transformers             │
│                   │  ─────────────────────────────────────────────  │
│                   │                                                 │
│  LEFT: CHAT       │              RIGHT: LIVE CONCEPTS               │
│  ─────────────────│──────────────────────────────────────────────   │
│                   │                                                 │
│  🤖 Tutor         │  Concepts this session                          │
│  What do you      │  ┌────────────────────────────────────────┐    │
│  already know     │  │ ✓ Parallel processing (confirmed)      │    │
│  about how        │  │ ~ QKV vectors (learning...)            │    │
│  transformers     │  │ ○ Softmax normalization (untested)     │    │
│  process context? │  │ ○ Multi-head attention (not yet)       │    │
│                   │  └────────────────────────────────────────┘    │
│  👤 You           │                                                 │
│  They use         │  ──────────────────────────────────────────     │
│  attention to     │  Misconceptions detected                        │
│  look at all      │  ┌────────────────────────────────────────┐    │
│  tokens at once   │  │ ⚠ Q/K/V are fixed like embeddings     │    │
│                   │  │   → They are learned projections       │    │
│  🤖 Tutor         │  └────────────────────────────────────────┘    │
│  Good. What does  │                                                 │
│  each token need  │  ──────────────────────────────────────────     │
│  to compute to    │  Tutor mode                                     │
│  decide which     │  ● Socratic (asking)                           │
│  other tokens     │  ○ Explain (lecturing)                         │
│  matter to it?    │                                                 │
│                   │  Progress this session                         │
│  👤 You           │  ████████░░░░░░░░  4 / 10 concepts             │
│  [_____________]  │                                                 │
│  [  Send  ]       │  [End Session & Generate Summary]              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Screen 3 — Session Summary

```
┌─────────────────────────────────────────────────────────────────────┐
│  SIDEBAR          │  Session Summary — Attention in Transformers    │
│                   │  42 minutes · 18 turns · May 31, 2026           │
│                   │  ─────────────────────────────────────────────  │
│                   │                                                 │
│                   │  What you learned                               │
│                   │  ┌──────────────────────────────────────────┐  │
│                   │  │ Transformers use dot-product attention to │  │
│                   │  │ compute token relevance. The Q/K/V        │  │
│                   │  │ mechanism lets each token aggregate       │  │
│                   │  │ weighted context from all other tokens.   │  │
│                   │  └──────────────────────────────────────────┘  │
│                   │                                                 │
│                   │  Concepts  ──────────────────────────────────   │
│                   │  ✓ QKV mechanism          [mastered]           │
│                   │  ✓ Softmax normalization  [strong]             │
│                   │  ~ Weighted value sum     [improving]          │
│                   │  ○ Multi-head attention   [weak]               │
│                   │                                                 │
│                   │  Misconceptions  ────────────────────────────   │
│                   │  ⚠ "Q/K/V are fixed like word embeddings"     │
│                   │    Correction: learned linear projections      │
│                   │    Status: unresolved  [Mark resolved]         │
│                   │                                                 │
│                   │  Next Steps  ────────────────────────────────   │
│                   │  Suggested: Why does multi-head attention      │
│                   │  use multiple Q/K/V projections?               │
│                   │  [Start Next Session]                          │
│                   │                                                 │
│                   │  Flashcards generated: 4    Quiz: 3 questions  │
│                   │                                                 │
│                   │  [Export as Markdown]  [Export Anki CSV]       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Screen 4 — Concept Library

```
┌─────────────────────────────────────────────────────────────────────┐
│  SIDEBAR          │  Concepts                                       │
│                   │  ─────────────────────────────────────────────  │
│                   │                                                 │
│                   │  [Search: "attention"________________] [Filter▾]│
│                   │  Filter by: All | Weak | Mastered | Review due  │
│                   │                                                 │
│                   │  Goal: Transformer Architecture   (12 concepts) │
│                   │  ┌───────────────────────────────────────────┐ │
│                   │  │ QKV Mechanism              [mastered] ✓   │ │
│                   │  │ Attention is a learned relevance scorer.  │ │
│                   │  │ Sessions: 2  · Flashcards: 2              │ │
│                   │  ├───────────────────────────────────────────┤ │
│                   │  │ Multi-head Attention          [weak] ⚡   │ │
│                   │  │ Using multiple Q/K/V projections in       │ │
│                   │  │ parallel to capture different subspaces.  │ │
│                   │  │ Sessions: 1  · Misconceptions: 0          │ │
│                   │  ├───────────────────────────────────────────┤ │
│                   │  │ Positional Encoding         [unknown] ○   │ │
│                   │  │ Not yet studied                           │ │
│                   │  │ Prerequisite of: Multi-head attention     │ │
│                   │  └───────────────────────────────────────────┘ │
│                   │                                                 │
│                   │  Misconceptions  (2 unresolved)                 │
│                   │  ┌───────────────────────────────────────────┐ │
│                   │  │ ⚠ Q/K/V vectors are fixed properties     │ │
│                   │  │   Detected: Session 1 · Status: unresolved│ │
│                   │  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Navigation Structure

```
/                    → Home Dashboard (Screen 1)
/session/[id]        → Socratic Session (Screen 2)  ← entered from a Goal
/session/[id]/summary → Session Summary (Screen 3)  ← auto-redirect on end
/concepts            → Concept Library (Screen 4)
```

**State flow:**
```
Home → [New Goal] → Goal Setup → Session → Session Summary → Home
Home → [Continue]             → Session → Session Summary → Home
Home → [Concepts]             → Concept Library
```
