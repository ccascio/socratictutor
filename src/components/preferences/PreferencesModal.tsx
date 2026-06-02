'use client';

import {
  Button,
  Flex,
  Icon,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react';
import { MdKey, MdMenuBook, MdSettings } from 'react-icons/md';
import ApiKeyManager from '@/components/apiKeyManager/ApiKeyManager';
import LearningPreferences from './LearningPreferences';

export default function PreferencesModal() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const navbarIcon = useColorModeValue('gray.500', 'white');
  const textColor = useColorModeValue('navy.700', 'white');
  const bg = useColorModeValue('white', 'navy.800');

  return (
    <>
      <Button
        variant="no-hover"
        bg="transparent"
        p="0px"
        minW="unset"
        minH="unset"
        h="18px"
        w="max-content"
        onClick={onOpen}
        aria-label="Preferences"
      >
        <Icon me="10px" h="18px" w="18px" color={navbarIcon} as={MdSettings} />
      </Button>

      <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent borderRadius="20px" bg={bg} mx={{ base: '16px', md: 'auto' }}>
          <ModalHeader color={textColor} pb="0">
            Preferences
          </ModalHeader>
          <ModalCloseButton _focus={{ boxShadow: 'none' }} />
          <ModalBody pb="28px" pt="16px">
            <Tabs colorScheme="brand" variant="soft-rounded" isLazy>
              <TabList mb="24px" gap="8px">
                <Tab fontSize="sm" borderRadius="full">
                  <Flex align="center" gap="6px">
                    <Icon as={MdKey} w="14px" h="14px" />
                    API
                  </Flex>
                </Tab>
                <Tab fontSize="sm" borderRadius="full">
                  <Flex align="center" gap="6px">
                    <Icon as={MdMenuBook} w="14px" h="14px" />
                    Learning
                  </Flex>
                </Tab>
              </TabList>
              <TabPanels>
                <TabPanel p="0">
                  <ApiKeyManager />
                </TabPanel>
                <TabPanel p="0">
                  <LearningPreferences />
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
