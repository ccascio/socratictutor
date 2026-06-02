'use client';

import {
  Alert,
  AlertIcon,
  Button,
  Code,
  Flex,
  Input,
  Link,
  Text,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';

export default function ApiKeyManager(props: {
  onSaved?: (apiKey: string) => void;
  compact?: boolean;
}) {
  const { onSaved, compact } = props;
  const [apiKey, setApiKey] = useState('');
  const [configured, setConfigured] = useState(false);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const grayColor = useColorModeValue('gray.500', 'gray.400');
  const inputBorder = useColorModeValue('gray.200', 'whiteAlpha.200');
  const inputColor = useColorModeValue('navy.700', 'white');
  const linkColor = useColorModeValue('brand.500', 'white');

  useEffect(() => {
    let active = true;

    async function loadStatus() {
      try {
        const response = await fetch('/api/settings/openai-key');
        const status = (await response.json()) as { configured?: boolean };
        if (active) setConfigured(Boolean(status.configured));
      } catch {
        if (active) setConfigured(false);
      } finally {
        if (active) setChecking(false);
      }
    }

    void loadStatus();

    return () => {
      active = false;
    };
  }, []);

  async function saveApiKey() {
    const trimmed = apiKey.trim();

    if (!trimmed) {
      toast({
        title: 'Please add your API key.',
        position: 'top',
        status: 'warning',
        isClosable: true,
      });
      return;
    }

    if (!trimmed.startsWith('sk-')) {
      toast({
        title: 'Invalid API key. OpenAI keys should start with sk-.',
        position: 'top',
        status: 'error',
        isClosable: true,
      });
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/settings/openai-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: trimmed }),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error || 'Unable to save the API key.');
      }

      localStorage.setItem('apiKey', trimmed);
      setConfigured(true);
      setApiKey('');
      onSaved?.(trimmed);
      toast({
        title: 'OpenAI API key saved to .env.',
        position: 'top',
        status: 'success',
        isClosable: true,
      });
    } catch (error) {
      toast({
        title:
          error instanceof Error
            ? error.message
            : 'Unable to save the API key.',
        position: 'top',
        status: 'error',
        isClosable: true,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Flex direction="column" gap={compact ? '16px' : '20px'}>
      <Text
        color={grayColor}
        fontWeight="500"
        fontSize="md"
        lineHeight="28px"
      >
        Add your OpenAI API key once and this app will save it in the local
        <Code mx="4px">.env</Code>
        file as
        <Code mx="4px">OPENAI_API_KEY</Code>
        .
      </Text>

      <Alert
        status={checking ? 'info' : configured ? 'success' : 'warning'}
        borderRadius="12px"
      >
        <AlertIcon />
        {checking
          ? 'Checking API key configuration...'
          : configured
          ? 'An OpenAI API key is configured for this project.'
          : 'No saved OpenAI API key was found yet.'}
      </Alert>

      <Flex direction={{ base: 'column', md: 'row' }} gap="10px">
        <Input
          type="password"
          h="54px"
          border="1px solid"
          borderColor={inputBorder}
          borderRadius="45px"
          p="15px 20px"
          fontSize="sm"
          fontWeight="500"
          _focus={{ borderColor: 'brand.500' }}
          _placeholder={{ color: 'gray.500' }}
          color={inputColor}
          autoComplete="off"
          placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          onChange={(event) => setApiKey(event.target.value)}
          value={apiKey}
        />
        <Button
          variant="chakraLinear"
          py="20px"
          px="16px"
          fontSize="sm"
          borderRadius="45px"
          minW={{ base: '100%', md: '180px' }}
          h="54px"
          onClick={saveApiKey}
          isLoading={saving}
        >
          Save API Key
        </Button>
      </Flex>

      <Link
        color={linkColor}
        fontSize="sm"
        href="https://platform.openai.com/api-keys"
        textDecoration="underline !important"
        fontWeight="600"
        isExternal
      >
        Get your API key from the OpenAI Dashboard
      </Link>

      <Text color={grayColor} fontWeight="500" fontSize="sm">
        The key is stored locally on this machine. It is used only by the
        server-side chat API unless you also keep the browser override in
        localStorage.
      </Text>
    </Flex>
  );
}
