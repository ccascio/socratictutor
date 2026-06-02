'use client';
import ApiKeyManager from '@/components/apiKeyManager/ApiKeyManager';
import Card from '@/components/card/Card';
import {
  Button,
  Icon,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react';
import { MdLock } from 'react-icons/md';

function APIModal(props: { setApiKey: any; sidebar?: boolean }) {
  const { setApiKey, sidebar } = props;
  const { isOpen, onOpen, onClose } = useDisclosure();

  const textColor = useColorModeValue('navy.700', 'white');
  const navbarIcon = useColorModeValue('gray.500', 'white');
  return (
    <>
      {sidebar ? (
        <Button
          onClick={onOpen}
          display="flex"
          variant="api"
          fontSize={'sm'}
          fontWeight="600"
          borderRadius={'45px'}
          mt="8px"
          minH="40px"
        >
          Set API Key
        </Button>
      ) : (
        <Button
          onClick={onOpen}
          minW="max-content !important"
          p="0px"
          me="10px"
          _hover={{ bg: 'none' }}
          _focus={{ bg: 'none' }}
          _selected={{ bg: 'none' }}
          bg="none !important"
        >
          <Icon w="18px" h="18px" as={MdLock} color={navbarIcon} />
        </Button>
      )}

      <Modal blockScrollOnMount={false} isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent bg="none" boxShadow="none">
          <Card textAlign={'center'}>
            <ModalHeader
              fontSize="22px"
              fontWeight={'700'}
              mx="auto"
              textAlign={'center'}
              color={textColor}
            >
              Enter your OpenAI API Key
            </ModalHeader>
            <ModalCloseButton _focus={{ boxShadow: 'none' }} />
            <ModalBody p="0px">
              <ApiKeyManager onSaved={setApiKey} compact />
            </ModalBody>
          </Card>
        </ModalContent>
      </Modal>
    </>
  );
}

export default APIModal;
