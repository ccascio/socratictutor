# Learning Session Flow

A complete walkthrough of one session. Topic: **"How does attention work in a transformer?"**

---

## Step 1 — Goal Setup (new user or new topic)

The app asks five questions before the first session on a new topic:

```
1. What do you already know about transformers? (free text)
2. What's your goal? (understand / apply / evaluate)
3. Preferred explanation style? (intuition-first / math-ok / analogy-heavy)
4. How long do you have? (15 min / 30 min / 45 min+)
5. Why are you learning this now? (context)
```

The answers initialize the `LearningGoal` and feed the tutor's system prompt.

---

## Step 2 — Diagnostic (first session on a topic only)

The system asks 5 questions to estimate the user's real level. It does not announce this is a diagnostic.

```
Tutor: Before we dive in — what's the difference between a recurrent neural 
       network and a transformer? Take a shot at it.

User:  Transformers are faster because they don't process tokens one at a time.

Tutor: Good. What makes that possible — why can a transformer process tokens 
       in parallel when an RNN can't?

User:  Because it doesn't have hidden state from previous tokens?

Tutor: Interesting — so what does it use instead to understand context?

User:  ... attention? But I'm not sure exactly how.
```

**System detects:** user understands the "parallel" property but has a gap in what replaces sequential state. Confidence level: medium. Missing prerequisite: Query/Key/Value mechanics.

The profile is seeded:
```json
{
  "weak": ["attention mechanism internals"],
  "partial": ["transformer vs RNN tradeoffs"],
  "confirmed": ["parallelism property"]
}
```

---

## Step 3 — Socratic Teaching Loop

The tutor enters the controlled loop: ask → analyze → probe → minimal explanation → test.

```
Tutor: Let's dig into attention. Imagine you're reading the sentence 
       "The cat sat on the mat because it was tired." When you read "it," 
       how do you know what "it" refers to?

User:  Context — I look back at the sentence and "cat" makes more sense 
       than "mat" because cats get tired.

Tutor: Exactly. You scanned the sentence and assigned relevance. 
       Now — if a model needs to do the same thing, what does it need 
       to compute for each word?

User:  Some kind of score between words?

Tutor: Right direction. What inputs would you need to compute that score?

User:  The word itself, and all the other words?

Tutor: Yes — and this is where attention formalizes it. The model 
       produces three vectors per token: Query, Key, and Value. 
       The Query says "what am I looking for?" The Key says 
       "what do I contain?" The dot product of Q and K gives 
       the relevance score. Why do you think we apply softmax to those scores?

User:  To normalize them so they sum to 1?

Tutor: Correct. And then?

User:  Multiply by Value to get a weighted average of context?

Tutor: Exactly. So — what would happen if two words had identical 
       Query and Key vectors?

User:  They'd attend equally to everything?

Tutor: Close — they'd produce the same attention distribution. 
       Is that a problem?
```

**System detects:** user now grasps the QKV mechanics. Misconception check running.

```
Tutor: Quick check — some people think the Q, K, V vectors are fixed 
       properties of each word. What do you think?

User:  Yeah, I assumed they were like word embeddings.
```

**Misconception detected:**

```json
{
  "misconception": "Q, K, V vectors are fixed word properties like embeddings",
  "correction": "Q, K, V are produced by learned linear projections — 
                 they change with every layer and depend on the full model context",
  "session": "transformers-session-1",
  "status": "unresolved"
}
```

---

## Step 4 — Structured Output (end of session)

Generated automatically after the session ends:

```json
{
  "topic": "Attention in Transformers",
  "summary": "User understands the QKV mechanism and can derive why softmax 
              normalizes attention scores. Grasps the parallel processing 
              advantage over RNNs.",
  "concepts": [
    "Query/Key/Value vectors",
    "Dot-product attention",
    "Softmax normalization",
    "Weighted value aggregation"
  ],
  "misconceptions": [
    {
      "text": "Q/K/V vectors are fixed like word embeddings",
      "correction": "They are learned linear projections, context-dependent",
      "status": "unresolved"
    }
  ],
  "mastered": ["Parallel processing in transformers", "Attention as relevance scoring"],
  "weak": ["Multi-head attention", "Positional encoding"],
  "next_questions": [
    "Why does multi-head attention use multiple Q/K/V projections?",
    "How does the model know token order if it processes everything in parallel?"
  ],
  "flashcards": [
    { "q": "What does a Query vector represent?", "a": "What the current token is looking for in other tokens" },
    { "q": "Why apply softmax to attention scores?", "a": "To normalize them into a probability distribution over tokens" }
  ]
}
```

---

## State Machine Summary

```
[Goal Setup]
     ↓
[Diagnostic: 5 questions → build starting profile]
     ↓
[Socratic Loop]
  ask question
    → analyze answer (LLM: Answer Evaluator)
    → detect gap or misconception (LLM: Misconception Detector)
    → ask follow-up OR give minimal explanation
    → test understanding
    → store concept status
  ↓ (when time or topic exhausted)
[Generate Artifacts] (LLM: Artifact Generator)
     ↓
[Session Summary screen]
     ↓
[Update Learner Profile]
```

---

## LLM Role Assignments

| Role | Trigger | Output |
|---|---|---|
| **Tutor** | Every turn | Next question or minimal explanation |
| **Answer Evaluator** | After each user response | Confidence score, gap category |
| **Misconception Detector** | After suspicious answer | Misconception JSON or null |
| **Concept Extractor** | Continuously | Concept list, mastery status updates |
| **Artifact Generator** | End of session | Session summary JSON |
