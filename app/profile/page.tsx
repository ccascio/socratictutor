'use client';

import {
  Badge, Box, Button, Flex, Icon, Spinner, Text, VStack, useColorModeValue,
} from '@chakra-ui/react';
import {
  MdCheckCircle, MdRefresh, MdWarning, MdInfoOutline, MdPsychology,
} from 'react-icons/md';
import { useCallback, useEffect, useState } from 'react';
import Card from '@/components/card/Card';
import type { ThinkingProfile } from '@/types/learning';

type ApiResponse =
  | { profile: ThinkingProfile }
  | { insufficient: true; reason: string }
  | { error: string };

function SectionHeader({ children }: { children: React.ReactNode }) {
  const color = useColorModeValue('gray.400', 'gray.500');
  return (
    <Text fontSize="10px" fontWeight="700" letterSpacing="0.06em"
      textTransform="uppercase" color={color} mb="12px">
      {children}
    </Text>
  );
}

function TraitRow({
  trait, evidence, variant,
}: {
  trait: string; evidence: string; variant: 'strength' | 'weakness';
}) {
  const textColor = useColorModeValue('navy.700', 'white');
  const subColor = useColorModeValue('gray.500', 'gray.400');
  const isStrength = variant === 'strength';
  return (
    <Flex align="flex-start" gap="10px" py="10px"
      borderBottom="1px solid" borderColor={useColorModeValue('gray.100', 'whiteAlpha.100')}>
      <Icon
        as={isStrength ? MdCheckCircle : MdWarning}
        color={isStrength ? 'green.400' : 'orange.400'}
        w="16px" h="16px" mt="2px" flexShrink={0}
      />
      <Box>
        <Text color={textColor} fontSize="sm" fontWeight="600">{trait}</Text>
        <Text color={subColor} fontSize="xs" mt="2px">{evidence}</Text>
      </Box>
    </Flex>
  );
}

function MistakeRow({ pattern, example }: { pattern: string; example: string }) {
  const textColor = useColorModeValue('navy.700', 'white');
  const subColor = useColorModeValue('gray.500', 'gray.400');
  const bg = useColorModeValue('orange.50', 'whiteAlpha.50');
  return (
    <Box bg={bg} borderRadius="10px" p="12px 14px" borderLeft="3px solid"
      borderColor="orange.300" mb="10px">
      <Text color={textColor} fontSize="sm" fontWeight="600" mb="4px">{pattern}</Text>
      <Text color={subColor} fontSize="xs" fontStyle="italic">Example: {example}</Text>
    </Box>
  );
}

export default function HowYouThinkPage() {
  const textColor = useColorModeValue('navy.700', 'white');
  const subColor = useColorModeValue('gray.500', 'gray.400');
  const noteBg = useColorModeValue('blue.50', 'whiteAlpha.100');
  const noteColor = useColorModeValue('blue.700', 'blue.200');
  const styleBg = useColorModeValue('linear-gradient(135deg, #4A25E1 0%, #7B5AFF 100%)', 'linear-gradient(135deg, #4A25E1 0%, #7B5AFF 100%)');

  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setResponse(null);
    try {
      const res = await fetch('/api/profile/thinking');
      setResponse(await res.json() as ApiResponse);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const profile = response && 'profile' in response ? response.profile : null;
  const insufficient = response && 'insufficient' in response ? response : null;
  const error = response && 'error' in response ? response : null;

  return (
    <Box w="100%" maxW="900px">
      {/* Header */}
      <Flex justify="space-between" align="flex-start" mb="28px" wrap="wrap" gap="12px">
        <Box>
          <Flex align="center" gap="10px" mb="6px">
            <Icon as={MdPsychology} color="brand.500" w="28px" h="28px" />
            <Text color={textColor} fontSize="2xl" fontWeight="700">How You Think</Text>
          </Flex>
          <Text color={subColor} fontSize="sm">
            A cognitive profile derived from your learning history — how you learn, where you excel, and where you get stuck.
          </Text>
        </Box>
        {!loading && profile && (
          <Button
            variant="outline" borderColor="brand.500" color="brand.500"
            borderRadius="12px" size="sm"
            leftIcon={<Icon as={MdRefresh} />}
            onClick={fetchProfile}
          >
            Regenerate
          </Button>
        )}
      </Flex>

      {/* Loading */}
      {loading && (
        <Flex direction="column" align="center" justify="center" minH="40vh" gap="16px">
          <Spinner color="brand.500" size="xl" thickness="3px" />
          <Text color={subColor} fontSize="sm">Analyzing your learning history…</Text>
        </Flex>
      )}

      {/* Insufficient data */}
      {!loading && insufficient && (
        <Card>
          <Flex direction="column" align="center" py="40px" gap="12px">
            <Icon as={MdPsychology} color="brand.300" w="48px" h="48px" />
            <Text color={textColor} fontSize="lg" fontWeight="700">Profile not ready yet</Text>
            <Text color={subColor} fontSize="sm" textAlign="center" maxW="360px">
              {insufficient.reason}
            </Text>
          </Flex>
        </Card>
      )}

      {/* Error */}
      {!loading && error && (
        <Card>
          <Flex direction="column" align="center" py="32px" gap="10px">
            <Icon as={MdWarning} color="red.400" w="32px" h="32px" />
            <Text color={textColor} fontSize="md" fontWeight="700">Generation failed</Text>
            <Text color={subColor} fontSize="xs">{error.error}</Text>
            <Button mt="8px" size="sm" variant="outline" borderColor="brand.500"
              color="brand.500" borderRadius="12px" onClick={fetchProfile}>
              Retry
            </Button>
          </Flex>
        </Card>
      )}

      {/* Profile */}
      {!loading && profile && (
        <>
          {/* Data quality note */}
          <Flex align="flex-start" gap="8px" bg={noteBg} borderRadius="10px"
            p="10px 14px" mb="24px">
            <Icon as={MdInfoOutline} color={noteColor} w="14px" h="14px" mt="2px" flexShrink={0} />
            <Text color={noteColor} fontSize="xs">{profile.dataQualityNote}</Text>
          </Flex>

          {/* Narrative */}
          <Card mb="20px">
            <Text color={subColor} fontSize="10px" fontWeight="700" letterSpacing="0.06em"
              textTransform="uppercase" mb="10px">Overview</Text>
            <Text color={textColor} fontSize="sm" lineHeight="1.8">{profile.narrative}</Text>
          </Card>

          {/* Strengths + Weaknesses grid */}
          <Flex gap="20px" mb="20px" direction={{ base: 'column', md: 'row' }}>
            <Card flex="1">
              <SectionHeader>Strengths</SectionHeader>
              {profile.strengths.length === 0
                ? <Text color={subColor} fontSize="sm">Not enough data yet.</Text>
                : <VStack spacing="0" align="stretch">
                  {profile.strengths.map((s, i) => (
                    <TraitRow key={i} trait={s.trait} evidence={s.evidence} variant="strength" />
                  ))}
                </VStack>}
            </Card>

            <Card flex="1">
              <SectionHeader>Areas to Strengthen</SectionHeader>
              {profile.weaknesses.length === 0
                ? <Text color={subColor} fontSize="sm">No clear weaknesses detected yet.</Text>
                : <VStack spacing="0" align="stretch">
                  {profile.weaknesses.map((w, i) => (
                    <TraitRow key={i} trait={w.trait} evidence={w.evidence} variant="weakness" />
                  ))}
                </VStack>}
            </Card>
          </Flex>

          {/* Common mistakes */}
          <Card mb="20px">
            <Flex align="center" gap="8px" mb={profile.commonMistakes.length > 0 ? '14px' : '0'}>
              <SectionHeader>Common Mistake Patterns</SectionHeader>
              {profile.commonMistakes.length > 0 && (
                <Badge colorScheme="orange" borderRadius="full" mb="12px">{profile.commonMistakes.length}</Badge>
              )}
            </Flex>
            {profile.commonMistakes.length === 0
              ? <Text color={subColor} fontSize="sm">No recurring patterns detected yet.</Text>
              : profile.commonMistakes.map((m, i) => (
                <MistakeRow key={i} pattern={m.pattern} example={m.example} />
              ))}
          </Card>

          {/* Learning style */}
          <Box
            bg={styleBg}
            borderRadius="16px"
            p="20px 24px"
          >
            <Text color="whiteAlpha.700" fontSize="10px" fontWeight="700"
              letterSpacing="0.06em" textTransform="uppercase" mb="10px">
              How You Learn
            </Text>
            <Text color="white" fontSize="sm" lineHeight="1.8">{profile.learningStyleAssessment}</Text>
          </Box>
        </>
      )}
    </Box>
  );
}
