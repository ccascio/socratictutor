'use client';

import {
  Box,
  Button,
  Flex,
  Icon,
  Input,
  Radio,
  RadioGroup,
  Stack,
  Text,
  Textarea,
  useColorModeValue,
} from '@chakra-ui/react';
import { MdArrowBack, MdArrowForward, MdCheck } from 'react-icons/md';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/card/Card';
import { GoalSetupForm } from '@/types/learning';

const STEPS = [
  { id: 'topic', title: 'What do you want to understand?', subtitle: 'Be specific — a focused topic leads to better sessions.' },
  { id: 'level', title: 'What is your current level?', subtitle: 'Be honest — the tutor calibrates its questions to your starting point.' },
  { id: 'depth', title: 'How deeply do you want to go?', subtitle: 'This shapes the length and complexity of your learning path.' },
  { id: 'style', title: 'How do you learn best?', subtitle: 'The tutor will adapt its analogies and explanations to your style.' },
  { id: 'motivation', title: 'Why are you learning this?', subtitle: 'Context helps the tutor connect concepts to your actual use cases.' },
] as const;

const TOTAL = STEPS.length;

export default function GoalSetup() {
  const router = useRouter();
  const textColor = useColorModeValue('navy.700', 'white');
  const subColor = useColorModeValue('gray.500', 'gray.400');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.200');
  const stepInactiveBg = useColorModeValue('gray.100', 'whiteAlpha.200');

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<GoalSetupForm>({
    topic: '',
    currentLevel: '',
    targetDepth: '',
    learningStyle: '',
    motivation: '',
    timeAvailable: '',
  });

  const current = STEPS[step];

  const canAdvance = () => {
    if (current.id === 'topic') return form.topic.trim().length > 2;
    if (current.id === 'level') return !!form.currentLevel;
    if (current.id === 'depth') return !!form.targetDepth;
    if (current.id === 'style') return !!form.learningStyle;
    if (current.id === 'motivation') return form.motivation.trim().length > 2;
    return false;
  };

  const handleNext = async () => {
    if (step < TOTAL - 1) {
      setStep((s) => s + 1);
      return;
    }
    setLoading(true);
    try {
      // Create goal
      const goalRes = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: form.topic,
          currentLevel: form.currentLevel || 'intermediate',
          targetDepth: form.targetDepth || 'conceptual',
          motivation: form.motivation,
          learningStyle: form.learningStyle || undefined,
        }),
      });
      const goal = await goalRes.json() as { id: string };
      // Create session for that goal
      const sessRes = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId: goal.id }),
      });
      const { id: sessionId } = await sessRes.json() as { id: string };
      router.push(`/session/${sessionId}`);
    } catch {
      setLoading(false);
    }
  };

  return (
    <Flex direction="column" align="center" justify="center" w="100%" minH="60vh">
      <Box w="100%" maxW="560px">
        {/* Step indicator */}
        <Flex mb="32px" gap="6px">
          {STEPS.map((_, i) => (
            <Box
              key={i}
              flex="1"
              h="4px"
              borderRadius="full"
              bg={i <= step ? 'brand.500' : stepInactiveBg}
              transition="background 0.3s"
            />
          ))}
        </Flex>

        <Text color={subColor} fontSize="xs" fontWeight="600" letterSpacing="wider" mb="8px" textTransform="uppercase">
          Step {step + 1} of {TOTAL}
        </Text>
        <Text color={textColor} fontSize="2xl" fontWeight="700" mb="8px">
          {current.title}
        </Text>
        <Text color={subColor} fontSize="sm" mb="32px">
          {current.subtitle}
        </Text>

        <Card mb="32px">
          {current.id === 'topic' && (
            <Input
              placeholder="e.g. Attention mechanism in transformers"
              value={form.topic}
              onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
              size="lg"
              borderRadius="12px"
              onKeyDown={(e) => e.key === 'Enter' && canAdvance() && handleNext()}
              autoFocus
            />
          )}

          {current.id === 'level' && (
            <RadioGroup
              value={form.currentLevel}
              onChange={(v) => setForm((f) => ({ ...f, currentLevel: v as any }))}
            >
              <Stack spacing="16px">
                {[
                  { value: 'beginner', label: 'Beginner', desc: "I've heard the term but can't explain it" },
                  { value: 'intermediate', label: 'Intermediate', desc: 'I know the basics and have worked with it' },
                  { value: 'advanced', label: 'Advanced', desc: 'I use it regularly and want to fill precise gaps' },
                ].map((opt) => (
                  <Radio key={opt.value} value={opt.value} colorScheme="brand">
                    <Box ms="4px">
                      <Text color={textColor} fontWeight="600" fontSize="sm">{opt.label}</Text>
                      <Text color={subColor} fontSize="xs">{opt.desc}</Text>
                    </Box>
                  </Radio>
                ))}
              </Stack>
            </RadioGroup>
          )}

          {current.id === 'depth' && (
            <RadioGroup
              value={form.targetDepth}
              onChange={(v) => setForm((f) => ({ ...f, targetDepth: v as any }))}
            >
              <Stack spacing="16px">
                {[
                  { value: 'conceptual', label: 'Conceptual', desc: 'Understand the mental model — no implementation needed' },
                  { value: 'applied', label: 'Applied', desc: 'Understand well enough to make decisions and evaluate tradeoffs' },
                  { value: 'deep', label: 'Deep', desc: 'Understand the mechanics thoroughly, including edge cases' },
                ].map((opt) => (
                  <Radio key={opt.value} value={opt.value} colorScheme="brand">
                    <Box ms="4px">
                      <Text color={textColor} fontWeight="600" fontSize="sm">{opt.label}</Text>
                      <Text color={subColor} fontSize="xs">{opt.desc}</Text>
                    </Box>
                  </Radio>
                ))}
              </Stack>
            </RadioGroup>
          )}

          {current.id === 'style' && (
            <RadioGroup
              value={form.learningStyle}
              onChange={(v) => setForm((f) => ({ ...f, learningStyle: v as any }))}
            >
              <Stack spacing="16px">
                {[
                  { value: 'intuition-first', label: 'Intuition first', desc: 'Give me the "why" before the details' },
                  { value: 'analogy-heavy', label: 'Analogy-heavy', desc: 'Use comparisons to things I already know' },
                  { value: 'example-driven', label: 'Example-driven', desc: 'Show me concrete cases, then generalize' },
                  { value: 'math-ok', label: 'Math-friendly', desc: "I'm comfortable with formulas and notation" },
                ].map((opt) => (
                  <Radio key={opt.value} value={opt.value} colorScheme="brand">
                    <Box ms="4px">
                      <Text color={textColor} fontWeight="600" fontSize="sm">{opt.label}</Text>
                      <Text color={subColor} fontSize="xs">{opt.desc}</Text>
                    </Box>
                  </Radio>
                ))}
              </Stack>
            </RadioGroup>
          )}

          {current.id === 'motivation' && (
            <Textarea
              placeholder="e.g. I'm evaluating which attention variant to use in our search system"
              value={form.motivation}
              onChange={(e) => setForm((f) => ({ ...f, motivation: e.target.value }))}
              rows={4}
              borderRadius="12px"
              resize="none"
              autoFocus
            />
          )}
        </Card>

        <Flex justify="space-between">
          <Button
            variant="ghost"
            leftIcon={<Icon as={MdArrowBack} />}
            onClick={() => setStep((s) => s - 1)}
            isDisabled={step === 0}
            color={subColor}
          >
            Back
          </Button>
          <Button
            rightIcon={<Icon as={step === TOTAL - 1 ? MdCheck : MdArrowForward} />}
            bg="linear-gradient(15.46deg, #4A25E1 26.3%, #7B5AFF 86.4%)"
            color="white"
            borderRadius="12px"
            isDisabled={!canAdvance()}
            isLoading={loading}
            loadingText="Creating path..."
            onClick={handleNext}
            _hover={{ boxShadow: '0px 21px 27px -10px rgba(96,60,255,0.48)', opacity: 0.92 }}
          >
            {step === TOTAL - 1 ? 'Start Learning' : 'Next'}
          </Button>
        </Flex>
      </Box>
    </Flex>
  );
}
