'use client';

import {
  Badge, Box, Button, Flex, Icon, Input, Select, Text, VStack, useColorModeValue, useToast,
} from '@chakra-ui/react';
import { MdFileDownload, MdOutlineFlashOn, MdOutlineDescription, MdOutlineTableChart, MdLock, MdPictureAsPdf } from 'react-icons/md';
import { SiObsidian, SiNotion } from 'react-icons/si';
import { useState } from 'react';
import Card from '@/components/card/Card';

const AVAILABLE_FORMATS = [
  { icon: MdOutlineDescription, label: 'Markdown', format: 'markdown', description: 'Session summaries, concepts, and misconceptions as plain Markdown.' },
  { icon: MdOutlineFlashOn, label: 'Anki CSV', format: 'anki', description: 'All flashcards from a session as an Anki-importable CSV.' },
  { icon: MdOutlineTableChart, label: 'JSON', format: 'json', description: 'Full structured export of the session artifact.' },
  { icon: MdPictureAsPdf, label: 'PDF', format: 'pdf', description: 'Formatted PDF of session summary, concepts, misconceptions, and flashcards.' },
];

const FUTURE_FORMATS = [
  { icon: SiObsidian, label: 'Obsidian Vault', description: 'Export concept library as a linked Obsidian vault.', future: true },
  { icon: SiNotion, label: 'Notion', description: 'Push session summaries to a Notion database.', future: true },
];

export default function ExportPage() {
  const textColor = useColorModeValue('navy.700', 'white');
  const subColor = useColorModeValue('gray.500', 'gray.400');
  const iconBg = useColorModeValue('secondaryGray.300', 'whiteAlpha.100');
  const toast = useToast();

  const [sessionId, setSessionId] = useState('session-1');

  const handleExport = (format: string) => {
    if (!sessionId.trim()) {
      toast({ title: 'Enter a session ID first', status: 'warning', position: 'top', isClosable: true });
      return;
    }
    window.open(`/api/export?session=${sessionId}&format=${format}`, '_blank');
  };

  return (
    <Box w="100%" maxW="800px">
      <Box mb="28px">
        <Text fontSize="2xl" fontWeight="700" color={textColor} mb="8px">Export Center</Text>
        <Text color={subColor} fontSize="sm">Download your learning artifacts in the format that fits your workflow.</Text>
      </Box>

      <Card mb="24px">
        <Text color={textColor} fontWeight="700" fontSize="sm" mb="8px">Session ID</Text>
        <Input value={sessionId} onChange={e => setSessionId(e.target.value)} placeholder="e.g. session-1" borderRadius="12px" size="sm" />
        <Text color={subColor} fontSize="xs" mt="6px">Find session IDs in the Dashboard under Recent Sessions.</Text>
      </Card>

      <VStack spacing="14px" align="stretch" mb="24px">
        {AVAILABLE_FORMATS.map(fmt => (
          <Card key={fmt.label}>
            <Flex align="center" gap="16px">
              <Flex borderRadius="12px" justify="center" align="center" bg={iconBg} w="44px" h="44px" flexShrink={0}>
                <Icon as={fmt.icon} color="brand.500" w="20px" h="20px" />
              </Flex>
              <Box flex="1" minW="0">
                <Text color={textColor} fontWeight="700" fontSize="sm" mb="4px">{fmt.label}</Text>
                <Text color={subColor} fontSize="xs">{fmt.description}</Text>
              </Box>
              <Button size="sm" bg="linear-gradient(15.46deg, #4A25E1 26.3%, #7B5AFF 86.4%)" color="white"
                borderRadius="10px" onClick={() => handleExport(fmt.format)} _hover={{ opacity: 0.9 }} flexShrink={0}>
                Download
              </Button>
            </Flex>
          </Card>
        ))}
      </VStack>

      <VStack spacing="14px" align="stretch">
        {FUTURE_FORMATS.map(fmt => (
          <Card key={fmt.label} opacity={0.55} cursor="not-allowed">
            <Flex align="center" gap="16px">
              <Flex borderRadius="12px" justify="center" align="center" bg={iconBg} w="44px" h="44px" flexShrink={0}>
                <Icon as={fmt.icon} color={subColor} w="20px" h="20px" />
              </Flex>
              <Box flex="1" minW="0">
                <Flex align="center" gap="8px" mb="4px">
                  <Text color={textColor} fontWeight="700" fontSize="sm">{fmt.label}</Text>
                  <Badge colorScheme="purple" borderRadius="full" fontSize="xs">future</Badge>
                </Flex>
                <Text color={subColor} fontSize="xs">{fmt.description}</Text>
              </Box>
              <Icon as={MdLock} color={subColor} w="16px" h="16px" flexShrink={0} />
            </Flex>
          </Card>
        ))}
      </VStack>
    </Box>
  );
}
