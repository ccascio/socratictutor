'use client';

import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Progress,
  Text,
  VStack,
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MdAutoAwesome,
  MdChecklist,
  MdChevronLeft,
  MdChevronRight,
  MdLightbulbOutline,
  MdOutlineExplore,
} from 'react-icons/md';
import {
  ONBOARDING_COMPLETE_EVENT,
  isFirstRunOnboardingComplete,
} from './onboardingStorage';

type TourStep = {
  title: string;
  body: string;
  benefit: string;
};

type TourGuide = {
  id: string;
  section: string;
  headline: string;
  intro: string;
  steps: TourStep[];
};

const TOUR_VERSION = 'v1';
const OPEN_GUIDE_EVENT = 'socratic:open-guide';

const guides: TourGuide[] = [
  {
    id: 'dashboard',
    section: 'Dashboard',
    headline: 'Your daily learning cockpit',
    intro:
      'Use this screen to decide what deserves attention now: a goal to continue, a review to reinforce, or a past session to revisit.',
    steps: [
      {
        title: 'Start with active goals',
        body:
          'Each goal shows mastery, recent activity, and how many concepts still need attention.',
        benefit:
          'You can choose the next session based on progress instead of guessing what to study.',
      },
      {
        title: 'Clear the review queue',
        body:
          'Rate due concepts and flashcards as Again, Hard, Good, or Easy.',
        benefit:
          'The app turns your ratings into a spaced-repetition schedule, keeping weak ideas alive before they fade.',
      },
      {
        title: 'Reopen recent sessions',
        body:
          'Recent sessions link back to summaries, flashcards, misconceptions, and suggested next questions.',
        benefit:
          'The chat stays temporary, while the knowledge it produces becomes easy to reuse.',
      },
      {
        title: 'Create a focused path',
        body:
          'Use New Goal when you want the tutor to calibrate around a specific topic, depth, style, and motivation.',
        benefit:
          'Focused goals produce better Socratic questions and cleaner knowledge artifacts.',
      },
    ],
  },
  {
    id: 'new-goal',
    section: 'New Goal',
    headline: 'Shape the tutor before the lesson starts',
    intro:
      'The goal wizard collects enough context for the tutor to ask useful questions from the first turn.',
    steps: [
      {
        title: 'Name the exact topic',
        body:
          'A narrow topic such as “attention mechanism in transformers” works better than a broad topic such as “AI”.',
        benefit:
          'The session starts closer to your actual gap instead of spending time discovering it.',
      },
      {
        title: 'Be honest about level',
        body:
          'Choose beginner, intermediate, or advanced based on what you can explain today.',
        benefit:
          'The tutor can challenge you without skipping foundations or repeating material you already know.',
      },
      {
        title: 'Choose depth and style',
        body:
          'Target depth controls how far the tutor goes. Learning style changes the examples, analogies, and level of formalism.',
        benefit:
          'The same topic can become a high-level mental model, an applied decision guide, or a deep mechanics session.',
      },
      {
        title: 'Add your motivation',
        body:
          'Tell the app why the topic matters: work, research, exams, product decisions, or personal curiosity.',
        benefit:
          'The tutor can connect abstract ideas to the situations where you will actually use them.',
      },
    ],
  },
  {
    id: 'session',
    section: 'Socratic Session',
    headline: 'Learn by being questioned',
    intro:
      'The session workspace is where the tutor probes your understanding and builds a live model of what you know.',
    steps: [
      {
        title: 'Answer in your own words',
        body:
          'Do not aim for perfect phrasing. Give the tutor your current mental model, even if it feels incomplete.',
        benefit:
          'The app can only detect gaps and misconceptions when it sees how you actually reason.',
      },
      {
        title: 'Watch concepts emerge',
        body:
          'The side panel adds concepts as the conversation reveals them and marks whether they are confirmed, learning, or untested.',
        benefit:
          'You get real-time feedback on what is becoming stable knowledge.',
      },
      {
        title: 'Treat mistakes as assets',
        body:
          'When a misconception appears, the app records the mistaken belief and the correction.',
        benefit:
          'Mistakes become durable review material instead of disappearing inside the chat transcript.',
      },
      {
        title: 'End the session intentionally',
        body:
          'Click End Session when the conversation reaches a useful stopping point.',
        benefit:
          'Ending the session generates the artifact used for summaries, flashcards, reviews, and exports.',
      },
    ],
  },
  {
    id: 'summary',
    section: 'Session Summary',
    headline: 'Turn a conversation into study material',
    intro:
      'The summary page is the handoff from live tutoring to permanent knowledge.',
    steps: [
      {
        title: 'Read the narrative summary',
        body:
          'The first card compresses the session into the main learning movement and unresolved edges.',
        benefit:
          'You can recover the lesson quickly without rereading the entire chat.',
      },
      {
        title: 'Separate mastered and weak ideas',
        body:
          'Concepts are grouped by what landed and what still needs reinforcement.',
        benefit:
          'Your next study action becomes obvious.',
      },
      {
        title: 'Use generated flashcards',
        body:
          'Flashcards capture the questions and answers worth revisiting.',
        benefit:
          'Important ideas move into active recall instead of passive notes.',
      },
      {
        title: 'Follow the next step',
        body:
          'Suggested next questions and topics point to the next high-value lesson.',
        benefit:
          'The learning path keeps momentum without needing you to redesign it after every session.',
      },
    ],
  },
  {
    id: 'concepts',
    section: 'Concept Library',
    headline: 'Browse the knowledge system',
    intro:
      'The Concept Library is the long-term memory of the app: every topic, concept, misconception, and mastery state.',
    steps: [
      {
        title: 'Search across your knowledge',
        body:
          'Search by concept name, definition, or goal topic to find what you have learned.',
        benefit:
          'Your learning history becomes retrievable instead of buried in old conversations.',
      },
      {
        title: 'Filter by mastery',
        body:
          'Use All, Weak, Mastered, and Review due to change the view from browsing to action.',
        benefit:
          'You can quickly decide whether to review, deepen, or move on.',
      },
      {
        title: 'Look for misconception markers',
        body:
          'Concept cards surface unresolved misconceptions directly in the library.',
        benefit:
          'The highest-leverage corrections stay visible until they are resolved.',
      },
      {
        title: 'Open concept details',
        body:
          'Click a concept to inspect its definition, sessions, flashcards, related concepts, and mistake history.',
        benefit:
          'Each idea becomes a reusable learning object, not just a line in a transcript.',
      },
    ],
  },
  {
    id: 'concept-detail',
    section: 'Concept Detail',
    headline: 'Inspect one idea deeply',
    intro:
      'A concept detail page gathers everything the app knows about a single idea.',
    steps: [
      {
        title: 'Use the definition as the anchor',
        body:
          'The definition card is the current working explanation for the concept.',
        benefit:
          'You get a stable mental model to compare against future answers.',
      },
      {
        title: 'Review the misconception history',
        body:
          'Mistake cards show what you believed, what was corrected, and the current status.',
        benefit:
          'You can revisit the precise place where understanding changed.',
      },
      {
        title: 'Connect related concepts',
        body:
          'The sidebar links nearby ideas from the same goal.',
        benefit:
          'You can see how one concept sits inside a broader mental map.',
      },
      {
        title: 'Start another session',
        body:
          'Use New Session when the concept still feels unstable or deserves a deeper pass.',
        benefit:
          'The app turns a weak concept into the next focused tutoring moment.',
      },
    ],
  },
  {
    id: 'export',
    section: 'Export Center',
    headline: 'Move learning artifacts into your workflow',
    intro:
      'Exports let you take generated learning material outside the app.',
    steps: [
      {
        title: 'Choose a session ID',
        body:
          'Use the session ID for the summary or recent session you want to download.',
        benefit:
          'You can export a specific artifact without mixing unrelated lessons.',
      },
      {
        title: 'Use Markdown for notes',
        body:
          'Markdown keeps summaries, concepts, misconceptions, and next steps readable.',
        benefit:
          'It drops cleanly into note-taking systems and personal knowledge bases.',
      },
      {
        title: 'Use Anki CSV for recall',
        body:
          'Anki CSV exports generated flashcards for external spaced repetition.',
        benefit:
          'You can combine the app’s Socratic tutoring with your existing review habits.',
      },
      {
        title: 'Use JSON or PDF when needed',
        body:
          'JSON is useful for structured integrations. PDF is useful for sharing or archiving.',
        benefit:
          'The same session can become notes, review cards, reports, or data.',
      },
    ],
  },
  {
    id: 'profile',
    section: 'How You Think',
    headline: 'Understand your learning patterns',
    intro:
      'This section turns your history into a cognitive profile: strengths, recurring mistakes, and learning tendencies.',
    steps: [
      {
        title: 'Check the data quality note',
        body:
          'The profile tells you how much evidence it is based on.',
        benefit:
          'You can tell whether the profile is preliminary or becoming reliable.',
      },
      {
        title: 'Read strengths and weak spots',
        body:
          'The app looks for cross-cutting traits rather than just naming concepts.',
        benefit:
          'You learn how you reason, not only what you have studied.',
      },
      {
        title: 'Study recurring mistake patterns',
        body:
          'Common mistakes summarize the kinds of errors that appear across sessions.',
        benefit:
          'You can watch for those patterns in future learning and work.',
      },
      {
        title: 'Regenerate after more sessions',
        body:
          'As your learning history grows, regenerate the profile to refresh the evidence.',
        benefit:
          'The app gradually becomes a personal cognitive coach, not just a tutor.',
      },
    ],
  },
];

const overviewGuide: TourGuide = {
  id: 'overview',
  section: 'Socratic AI',
  headline: 'Build permanent knowledge from temporary conversations',
  intro:
    'This app is designed around one principle: the chat is temporary, but the knowledge should become permanent.',
  steps: [
    {
      title: 'Create focused goals',
      body:
        'Start with a topic, level, target depth, learning style, and motivation.',
      benefit:
        'The tutor can ask questions that match both your current understanding and your real-world reason for learning.',
    },
    {
      title: 'Learn through dialogue',
      body:
        'Sessions use Socratic questioning to expose gaps and strengthen mental models.',
      benefit:
        'You practice reasoning instead of only reading explanations.',
    },
    {
      title: 'Keep the knowledge',
      body:
        'Summaries, concepts, flashcards, misconceptions, and exports preserve what happened in the session.',
      benefit:
        'Your learning compounds across sessions.',
    },
  ],
};

function getGuideForPath(pathname: string | null): TourGuide {
  const path = pathname || '/';
  if (path === '/') return guides[0];
  if (path.startsWith('/goal')) return guides[1];
  if (path.startsWith('/session/') && path.endsWith('/summary')) return guides[3];
  if (path.startsWith('/session/')) return guides[2];
  if (path.startsWith('/concepts/') && path !== '/concepts') return guides[5];
  if (path.startsWith('/concepts')) return guides[4];
  if (path.startsWith('/export')) return guides[6];
  if (path.startsWith('/profile')) return guides[7];
  return overviewGuide;
}

function storageKey(guideId: string): string {
  return `socratic-tour:${TOUR_VERSION}:${guideId}`;
}

export default function GuidedTour() {
  const pathname = usePathname();
  const guide = useMemo(() => getGuideForPath(pathname), [pathname]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [stepIndex, setStepIndex] = useState(0);
  const [firstRunComplete, setFirstRunComplete] = useState(false);

  const textColor = useColorModeValue('navy.700', 'white');
  const subColor = useColorModeValue('gray.500', 'gray.400');
  const panelBg = useColorModeValue('white', 'navy.800');
  const softBg = useColorModeValue('secondaryGray.300', 'whiteAlpha.100');
  const borderColor = useColorModeValue('gray.100', 'whiteAlpha.100');
  const benefitBg = useColorModeValue('blue.50', 'whiteAlpha.100');
  const benefitColor = useColorModeValue('blue.700', 'blue.200');

  const step = guide.steps[stepIndex];
  const isLastStep = stepIndex === guide.steps.length - 1;

  const markSeen = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey(guide.id), 'true');
  }, [guide.id]);

  const closeAndMarkSeen = useCallback(() => {
    markSeen();
    onClose();
  }, [markSeen, onClose]);

  useEffect(() => {
    setStepIndex(0);
    if (typeof window === 'undefined') return;
    if (!firstRunComplete) return;

    const hasSeenGuide = window.localStorage.getItem(storageKey(guide.id));
    if (hasSeenGuide) return;

    const timer = window.setTimeout(() => {
      onOpen();
    }, 700);

    return () => window.clearTimeout(timer);
  }, [firstRunComplete, guide.id, onOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setFirstRunComplete(isFirstRunOnboardingComplete());

    const markComplete = () => {
      setFirstRunComplete(true);
    };

    window.addEventListener(ONBOARDING_COMPLETE_EVENT, markComplete);
    return () => window.removeEventListener(ONBOARDING_COMPLETE_EVENT, markComplete);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const openCurrentGuide = () => {
      setStepIndex(0);
      onOpen();
    };

    window.addEventListener(OPEN_GUIDE_EVENT, openCurrentGuide);
    return () => window.removeEventListener(OPEN_GUIDE_EVENT, openCurrentGuide);
  }, [onOpen]);

  const goNext = () => {
    if (isLastStep) {
      closeAndMarkSeen();
      return;
    }
    setStepIndex((current) => current + 1);
  };

  const goBack = () => {
    setStepIndex((current) => Math.max(0, current - 1));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeAndMarkSeen}
      size="xl"
      isCentered
      closeOnOverlayClick={false}
    >
      <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(6px)" />
      <ModalContent bg={panelBg} borderRadius="18px" mx={{ base: '16px', md: 'auto' }}>
        <ModalHeader pb="0">
          <Flex align="center" gap="10px" mb="14px">
            <Flex
              align="center"
              justify="center"
              w="34px"
              h="34px"
              borderRadius="12px"
              bg="linear-gradient(135deg, #4A25E1 0%, #7B5AFF 100%)"
              flexShrink={0}
            >
              <Icon as={MdOutlineExplore} color="white" w="18px" h="18px" />
            </Flex>
            <Box minW="0">
              <Badge colorScheme="purple" borderRadius="full" mb="4px">
                {guide.section}
              </Badge>
              <Text color={textColor} fontSize="lg" lineHeight="1.25">
                {guide.headline}
              </Text>
            </Box>
          </Flex>
        </ModalHeader>
        <ModalCloseButton _focus={{ boxShadow: 'none' }} />

        <ModalBody pt="18px">
          <Text color={subColor} fontSize="sm" lineHeight="1.7" mb="20px">
            {guide.intro}
          </Text>

          <Progress
            value={((stepIndex + 1) / guide.steps.length) * 100}
            size="sm"
            borderRadius="full"
            colorScheme="brand"
            mb="18px"
          />

          <Box
            border="1px solid"
            borderColor={borderColor}
            borderRadius="14px"
            p="18px"
            bg={softBg}
          >
            <HStack spacing="8px" mb="10px">
              <Icon as={MdChecklist} color="brand.500" w="16px" h="16px" />
              <Text color={subColor} fontSize="xs" fontWeight="700">
                STEP {stepIndex + 1} OF {guide.steps.length}
              </Text>
            </HStack>
            <Text color={textColor} fontSize="md" fontWeight="700" mb="8px">
              {step.title}
            </Text>
            <Text color={textColor} fontSize="sm" lineHeight="1.7" mb="14px">
              {step.body}
            </Text>
            <Flex
              align="flex-start"
              gap="8px"
              bg={benefitBg}
              color={benefitColor}
              borderRadius="10px"
              p="10px 12px"
            >
              <Icon as={MdLightbulbOutline} w="15px" h="15px" mt="2px" flexShrink={0} />
              <Text fontSize="xs" lineHeight="1.6">
                {step.benefit}
              </Text>
            </Flex>
          </Box>

          <VStack align="stretch" spacing="8px" mt="18px">
            {guide.steps.map((tourStep, index) => (
              <Flex
                key={tourStep.title}
                align="center"
                gap="10px"
                color={index === stepIndex ? textColor : subColor}
              >
                <Flex
                  align="center"
                  justify="center"
                  w="22px"
                  h="22px"
                  borderRadius="full"
                  bg={index === stepIndex ? 'brand.500' : borderColor}
                  color={index === stepIndex ? 'white' : subColor}
                  fontSize="11px"
                  fontWeight="700"
                  flexShrink={0}
                >
                  {index + 1}
                </Flex>
                <Text fontSize="xs" fontWeight={index === stepIndex ? '700' : '500'}>
                  {tourStep.title}
                </Text>
              </Flex>
            ))}
          </VStack>
        </ModalBody>

        <ModalFooter gap="10px" justifyContent="space-between" flexWrap="wrap">
          <Button
            variant="ghost"
            color={subColor}
            size="sm"
            onClick={closeAndMarkSeen}
          >
            Skip
          </Button>
          <Flex gap="8px">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Icon as={MdChevronLeft} />}
              onClick={goBack}
              isDisabled={stepIndex === 0}
            >
              Back
            </Button>
            <Button
              variant="brand"
              size="sm"
              rightIcon={<Icon as={isLastStep ? MdAutoAwesome : MdChevronRight} />}
              onClick={goNext}
            >
              {isLastStep ? 'Finish' : 'Next'}
            </Button>
          </Flex>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export function openGuidedTour(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OPEN_GUIDE_EVENT));
}
