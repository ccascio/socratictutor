'use client';
import {
  Button,
  Flex,
  Icon,
  Tooltip,
  useColorMode,
  useColorModeValue,
} from '@chakra-ui/react';
import { SearchBar } from '@/components/navbar/searchBar/SearchBar';
import { SidebarResponsive } from '@/components/sidebar/Sidebar';
import { IoMdMoon, IoMdSunny } from 'react-icons/io';
import { MdHelpOutline } from 'react-icons/md';
import routes from '@/routes';
import PreferencesModal from '@/components/preferences/PreferencesModal';
import { openGuidedTour } from '@/components/onboarding/GuidedTour';

export default function HeaderLinks(props: { secondary: boolean; setApiKey?: any }) {
  const { secondary } = props;
  const { colorMode, toggleColorMode } = useColorMode();
  const navbarIcon = useColorModeValue('gray.500', 'white');
  const menuBg = useColorModeValue('white', 'navy.800');
  const shadow = useColorModeValue(
    '14px 17px 40px 4px rgba(112, 144, 176, 0.18)',
    '0px 41px 75px #081132',
  );

  return (
    <Flex
      zIndex="100"
      w={{ sm: '100%', md: 'auto' }}
      alignItems="center"
      flexDirection="row"
      bg={menuBg}
      flexWrap={secondary ? { base: 'wrap', md: 'nowrap' } : 'unset'}
      p="10px"
      borderRadius="30px"
      boxShadow={shadow}
      gap="4px"
    >
      <SearchBar
        mb={() => {
          if (secondary) return { base: '10px', md: 'unset' };
          return 'unset';
        }}
        me="10px"
        borderRadius="30px"
      />
      <SidebarResponsive routes={routes} />
      <Tooltip label="Open guide" hasArrow borderRadius="8px">
        <Button
          variant="no-hover"
          bg="transparent"
          p="0px"
          minW="unset"
          minH="unset"
          h="18px"
          w="max-content"
          onClick={openGuidedTour}
          aria-label="Open guide"
        >
          <Icon me="10px" h="18px" w="18px" color={navbarIcon} as={MdHelpOutline} />
        </Button>
      </Tooltip>
      <PreferencesModal />
      <Button
        variant="no-hover"
        bg="transparent"
        p="0px"
        minW="unset"
        minH="unset"
        h="18px"
        w="max-content"
        onClick={toggleColorMode}
      >
        <Icon
          me="6px"
          h="18px"
          w="18px"
          color={navbarIcon}
          as={colorMode === 'light' ? IoMdMoon : IoMdSunny}
        />
      </Button>
    </Flex>
  );
}
