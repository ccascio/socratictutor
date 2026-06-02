'use client';

import {
  Box,
  Button,
  Flex,
  Radio,
  RadioGroup,
  Stack,
  Text,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';

const STYLE_OPTIONS = [
  { value: 'intuition-first', label: 'Intuition first', desc: 'Give me the why before the details' },
  { value: 'analogy-heavy', label: 'Analogy-heavy', desc: 'Use comparisons to things I already know' },
  { value: 'example-driven', label: 'Example-driven', desc: 'Show me concrete cases, then generalize' },
  { value: 'math-ok', label: 'Math-friendly', desc: "I'm comfortable with formulas and notation" },
];

const DEPTH_OPTIONS = [
  { value: 'conceptual', label: 'Conceptual', desc: 'Understand the mental model — no implementation needed' },
  { value: 'applied', label: 'Applied', desc: 'Understand enough to make decisions and evaluate tradeoffs' },
  { value: 'deep', label: 'Deep', desc: 'Understand the mechanics thoroughly, including edge cases' },
];

export default function LearningPreferences() {
  const textColor = useColorModeValue('navy.700', 'white');
  const subColor = useColorModeValue('gray.500', 'gray.400');
  const toast = useToast();

  const [style, setStyle] = useState('intuition-first');
  const [depth, setDepth] = useState('conceptual');

  useEffect(() => {
    setStyle(localStorage.getItem('pref_learningStyle') || 'intuition-first');
    setDepth(localStorage.getItem('pref_targetDepth') || 'conceptual');
  }, []);

  const save = () => {
    localStorage.setItem('pref_learningStyle', style);
    localStorage.setItem('pref_targetDepth', depth);
    toast({ title: 'Preferences saved.', status: 'success', position: 'top', isClosable: true });
  };

  return (
    <Flex direction="column" gap="24px">
      <Box>
        <Text color={textColor} fontWeight="700" fontSize="sm" mb="4px">
          Default learning style
        </Text>
        <Text color={subColor} fontSize="xs" mb="14px">
          Used as the default when you start a new session without specifying a style.
        </Text>
        <RadioGroup value={style} onChange={setStyle}>
          <Stack spacing="12px">
            {STYLE_OPTIONS.map((opt) => (
              <Radio key={opt.value} value={opt.value} colorScheme="brand">
                <Box ms="4px">
                  <Text color={textColor} fontWeight="600" fontSize="sm">{opt.label}</Text>
                  <Text color={subColor} fontSize="xs">{opt.desc}</Text>
                </Box>
              </Radio>
            ))}
          </Stack>
        </RadioGroup>
      </Box>

      <Box>
        <Text color={textColor} fontWeight="700" fontSize="sm" mb="4px">
          Default target depth
        </Text>
        <Text color={subColor} fontSize="xs" mb="14px">
          Pre-selects the depth when you create a new learning goal.
        </Text>
        <RadioGroup value={depth} onChange={setDepth}>
          <Stack spacing="12px">
            {DEPTH_OPTIONS.map((opt) => (
              <Radio key={opt.value} value={opt.value} colorScheme="brand">
                <Box ms="4px">
                  <Text color={textColor} fontWeight="600" fontSize="sm">{opt.label}</Text>
                  <Text color={subColor} fontSize="xs">{opt.desc}</Text>
                </Box>
              </Radio>
            ))}
          </Stack>
        </RadioGroup>
      </Box>

      <Button
        bg="linear-gradient(15.46deg, #4A25E1 26.3%, #7B5AFF 86.4%)"
        color="white"
        borderRadius="12px"
        onClick={save}
        _hover={{ boxShadow: '0px 21px 27px -10px rgba(96,60,255,0.48)', opacity: 0.92 }}
      >
        Save Preferences
      </Button>
    </Flex>
  );
}
