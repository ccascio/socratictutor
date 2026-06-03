'use client';

import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Code,
  Flex,
  HStack,
  Icon,
  Input,
  Link,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Progress,
  Radio,
  RadioGroup,
  Stack,
  Text,
  VStack,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';
import {
  MdArrowForward,
  MdAutoAwesome,
  MdCheck,
  MdKey,
  MdMenuBook,
  MdOutlineManageAccounts,
  MdSettings,
} from 'react-icons/md';
import {
  DEFAULT_LEARNING_STYLE,
  DEFAULT_TARGET_DEPTH,
  StoredLearningStyle,
  StoredTargetDepth,
  getStoredLearningStyle,
  getStoredTargetDepth,
  isFirstRunOnboardingComplete,
  markFirstRunOnboardingComplete,
  saveLearningPreferences,
} from './onboardingStorage';

const STYLE_OPTIONS: Array<{
  value: StoredLearningStyle;
  label: string;
  desc: string;
}> = [
  { value: 'intuition-first', label: 'Intuition first', desc: 'Give me the why before the details' },
  { value: 'analogy-heavy', label: 'Analogy-heavy', desc: 'Use comparisons to things I already know' },
  { value: 'example-driven', label: 'Example-driven', desc: 'Show me concrete cases, then generalize' },
  { value: 'math-ok', label: 'Math-friendly', desc: "I'm comfortable with formulas and notation" },
];

const DEPTH_OPTIONS: Array<{
  value: StoredTargetDepth;
  label: string;
  desc: string;
}> = [
  { value: 'conceptual', label: 'Conceptual', desc: 'Understand the mental model with minimal implementation detail' },
  { value: 'applied', label: 'Applied', desc: 'Understand enough to make decisions and evaluate tradeoffs' },
  { value: 'deep', label: 'Deep', desc: 'Understand the mechanics thoroughly, including edge cases' },
];

type ApiKeyStatus = {
  checking: boolean;
  configured: boolean;
};

export default function FirstRunOnboarding() {
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [learningStyle, setLearningStyle] = useState<StoredLearningStyle>(DEFAULT_LEARNING_STYLE);
  const [targetDepth, setTargetDepth] = useState<StoredTargetDepth>(DEFAULT_TARGET_DEPTH);
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [apiStatus, setApiStatus] = useState<ApiKeyStatus>({ checking: true, configured: false });

  const textColor = useColorModeValue('navy.700', 'white');
  const subColor = useColorModeValue('gray.500', 'gray.400');
  const panelBg = useColorModeValue('white', 'navy.800');
  const borderColor = useColorModeValue('gray.100', 'whiteAlpha.100');
  const optionBg = useColorModeValue('secondaryGray.300', 'whiteAlpha.100');
  const noteBg = useColorModeValue('blue.50', 'whiteAlpha.100');
  const noteColor = useColorModeValue('blue.700', 'blue.200');

  const totalSteps = 3;
  const progress = ((step + 1) / totalSteps) * 100;
  const trimmedApiKey = apiKey.trim();
  const hasApiKeyInput = trimmedApiKey.length > 0;
  const apiKeyLooksValid = !hasApiKeyInput || trimmedApiKey.startsWith('sk-');

  useEffect(() => {
    setLearningStyle(getStoredLearningStyle());
    setTargetDepth(getStoredTargetDepth());
    setIsOpen(!isFirstRunOnboardingComplete());
  }, []);

  useEffect(() => {
    let active = true;

    async function loadApiStatus() {
      try {
        const response = await fetch('/api/settings/openai-key');
        const status = (await response.json()) as { configured?: boolean };
        if (active) {
          setApiStatus({ checking: false, configured: Boolean(status.configured) });
        }
      } catch {
        if (active) setApiStatus({ checking: false, configured: false });
      }
    }

    void loadApiStatus();

    return () => {
      active = false;
    };
  }, []);

  const currentTitle = useMemo(() => {
    if (step === 0) return 'Welcome to Socratic AI';
    if (step === 1) return 'Set your learning defaults';
    return 'Connect the tutor engine';
  }, [step]);

  async function saveApiKeyIfNeeded(): Promise<boolean> {
    if (!hasApiKeyInput) return true;

    if (!apiKeyLooksValid) {
      toast({
        title: 'OpenAI API keys should start with sk-.',
        status: 'error',
        position: 'top',
        isClosable: true,
      });
      return false;
    }

    try {
      const response = await fetch('/api/settings/openai-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: trimmedApiKey }),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error || 'Unable to save the API key.');
      }

      setApiStatus({ checking: false, configured: true });
      setApiKey('');
      return true;
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : 'Unable to save the API key.',
        status: 'error',
        position: 'top',
        isClosable: true,
      });
      return false;
    }
  }

  async function finishOnboarding() {
    setSaving(true);
    saveLearningPreferences(learningStyle, targetDepth);
    const apiSaved = await saveApiKeyIfNeeded();
    setSaving(false);
    if (!apiSaved) return;

    markFirstRunOnboardingComplete();
    setIsOpen(false);
    toast({
      title: 'Onboarding complete.',
      description: 'You can change API and Learning settings later from the gear icon.',
      status: 'success',
      position: 'top',
      isClosable: true,
    });
  }

  const goNext = async () => {
    if (step === 1) {
      saveLearningPreferences(learningStyle, targetDepth);
    }
    if (step < totalSteps - 1) {
      setStep((current) => current + 1);
      return;
    }
    await finishOnboarding();
  };

  const skipApiAndFinish = async () => {
    setApiKey('');
    await finishOnboarding();
  };

  return (
    <Modal isOpen={isOpen} onClose={() => {}} size="2xl" isCentered closeOnOverlayClick={false}>
      <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(6px)" />
      <ModalContent bg={panelBg} borderRadius="22px" mx={{ base: '16px', md: 'auto' }}>
        <ModalHeader pb="0">
          <Flex align="center" gap="12px">
            <Flex
              align="center"
              justify="center"
              w="40px"
              h="40px"
              borderRadius="14px"
              bg="linear-gradient(135deg, #4A25E1 0%, #7B5AFF 100%)"
              flexShrink={0}
            >
              <Icon as={step === 2 ? MdKey : MdAutoAwesome} color="white" w="20px" h="20px" />
            </Flex>
            <Box minW="0">
              <Badge colorScheme="purple" borderRadius="full" mb="5px">
                First-time setup
              </Badge>
              <Text color={textColor} fontSize="xl" lineHeight="1.2">
                {currentTitle}
              </Text>
            </Box>
          </Flex>
        </ModalHeader>

        <ModalBody pt="18px">
          <Progress value={progress} size="sm" borderRadius="full" colorScheme="brand" mb="22px" />

          {step === 0 && (
            <VStack align="stretch" spacing="18px">
              <Text color={subColor} fontSize="sm" lineHeight="1.7">
                Before the first lesson, set the defaults that shape how the tutor teaches.
                These settings help the app ask better questions, generate better artifacts,
                and avoid making every new goal start from a blank slate.
              </Text>
              <Flex
                bg={noteBg}
                color={noteColor}
                borderRadius="12px"
                p="12px 14px"
                gap="10px"
                align="flex-start"
              >
                <Icon as={MdSettings} w="16px" h="16px" mt="2px" flexShrink={0} />
                <Text fontSize="xs" lineHeight="1.6">
                  You can change everything later from the gear icon in the top-right navbar.
                  The Preferences modal has separate API and Learning tabs.
                </Text>
              </Flex>
              <Flex gap="12px" direction={{ base: 'column', md: 'row' }}>
                <SetupCard
                  icon={MdMenuBook}
                  title="Learning defaults"
                  body="Pick your default explanation style and target depth for new goals."
                />
                <SetupCard
                  icon={MdKey}
                  title="API key"
                  body="Add an OpenAI key now, or skip and add it later before live tutoring."
                />
              </Flex>
            </VStack>
          )}

          {step === 1 && (
            <VStack align="stretch" spacing="24px">
              <Box>
                <Text color={textColor} fontWeight="700" fontSize="sm" mb="4px">
                  Default learning style
                </Text>
                <Text color={subColor} fontSize="xs" mb="14px">
                  Used when you create a goal or start a session without choosing a style.
                </Text>
                <RadioGroup
                  value={learningStyle}
                  onChange={(value) => setLearningStyle(value as StoredLearningStyle)}
                >
                  <Stack spacing="10px">
                    {STYLE_OPTIONS.map((option) => (
                      <RadioOption
                        key={option.value}
                        value={option.value}
                        title={option.label}
                        body={option.desc}
                      />
                    ))}
                  </Stack>
                </RadioGroup>
              </Box>

              <Box>
                <Text color={textColor} fontWeight="700" fontSize="sm" mb="4px">
                  Default target depth
                </Text>
                <Text color={subColor} fontSize="xs" mb="14px">
                  Pre-selects depth when you create a new learning goal.
                </Text>
                <RadioGroup
                  value={targetDepth}
                  onChange={(value) => setTargetDepth(value as StoredTargetDepth)}
                >
                  <Stack spacing="10px">
                    {DEPTH_OPTIONS.map((option) => (
                      <RadioOption
                        key={option.value}
                        value={option.value}
                        title={option.label}
                        body={option.desc}
                      />
                    ))}
                  </Stack>
                </RadioGroup>
              </Box>
            </VStack>
          )}

          {step === 2 && (
            <VStack align="stretch" spacing="18px">
              <Text color={subColor} fontSize="sm" lineHeight="1.7">
                Live Socratic sessions, generated summaries, embeddings, and thinking profiles
                need an OpenAI API key. If you do not have one ready, you can skip this step
                and add it later from Preferences.
              </Text>

              <Alert
                status={apiStatus.checking ? 'info' : apiStatus.configured ? 'success' : 'warning'}
                borderRadius="12px"
              >
                <AlertIcon />
                {apiStatus.checking
                  ? 'Checking API key configuration...'
                  : apiStatus.configured
                    ? 'An OpenAI API key is already configured for this project.'
                    : 'No saved OpenAI API key was found yet.'}
              </Alert>

              <Box>
                <Text color={textColor} fontWeight="700" fontSize="sm" mb="8px">
                  OpenAI API key
                </Text>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  autoComplete="off"
                  borderRadius="14px"
                  h="50px"
                  borderColor={apiKeyLooksValid ? undefined : 'red.300'}
                />
                <Text color={subColor} fontSize="xs" mt="8px" lineHeight="1.6">
                  Saving writes to local <Code>.env</Code> as <Code>OPENAI_API_KEY</Code>.
                  It is not stored in browser localStorage.
                </Text>
              </Box>

              <HStack spacing="8px" align="flex-start" color={subColor}>
                <Icon as={MdOutlineManageAccounts} w="15px" h="15px" mt="2px" flexShrink={0} />
                <Text fontSize="xs" lineHeight="1.6">
                  Later: open the gear icon, choose <b>API</b> to change the key, or
                  <b> Learning</b> to change style and target depth.
                </Text>
              </HStack>

              <Link
                href="https://platform.openai.com/api-keys"
                isExternal
                color="brand.500"
                fontSize="sm"
                fontWeight="700"
                textDecoration="underline !important"
              >
                Get an API key from the OpenAI Dashboard
              </Link>
            </VStack>
          )}
        </ModalBody>

        <ModalFooter gap="10px" justifyContent="space-between" flexWrap="wrap">
          <Text color={subColor} fontSize="xs">
            Step {step + 1} of {totalSteps}
          </Text>
          <Flex gap="8px" wrap="wrap" justify="flex-end">
            {step === 2 && (
              <Button
                variant="ghost"
                color={subColor}
                size="sm"
                onClick={skipApiAndFinish}
                isDisabled={saving}
              >
                Skip API for now
              </Button>
            )}
            {step > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep((current) => current - 1)}
                isDisabled={saving}
              >
                Back
              </Button>
            )}
            <Button
              variant="brand"
              size="sm"
              rightIcon={<Icon as={step === totalSteps - 1 ? MdCheck : MdArrowForward} />}
              onClick={goNext}
              isLoading={saving}
              isDisabled={step === 2 && !apiKeyLooksValid}
            >
              {step === totalSteps - 1
                ? hasApiKeyInput
                  ? 'Save & Start'
                  : 'Finish'
                : 'Next'}
            </Button>
          </Flex>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );

  function SetupCard(props: { icon: typeof MdMenuBook; title: string; body: string }) {
    return (
      <Box
        flex="1"
        bg={optionBg}
        border="1px solid"
        borderColor={borderColor}
        borderRadius="14px"
        p="14px"
      >
        <Icon as={props.icon} color="brand.500" w="20px" h="20px" mb="10px" />
        <Text color={textColor} fontSize="sm" fontWeight="700" mb="4px">
          {props.title}
        </Text>
        <Text color={subColor} fontSize="xs" lineHeight="1.6">
          {props.body}
        </Text>
      </Box>
    );
  }

  function RadioOption(props: { value: string; title: string; body: string }) {
    return (
      <Radio value={props.value} colorScheme="brand">
        <Box ms="4px">
          <Text color={textColor} fontWeight="600" fontSize="sm">
            {props.title}
          </Text>
          <Text color={subColor} fontSize="xs">
            {props.body}
          </Text>
        </Box>
      </Radio>
    );
  }
}
