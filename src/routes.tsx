import { Icon } from './lib/chakra';
import {
  MdHome,
  MdMenuBook,
  MdFileDownload,
  MdAutoAwesome,
  MdOutlineManageAccounts,
  MdChat,
  MdPsychology,
} from 'react-icons/md';
import { LuHistory } from 'react-icons/lu';
import { RoundedChart } from '@/components/icons/Icons';

import { IRoute } from './types/navigation';

const routes: IRoute[] = [
  {
    name: 'Dashboard',
    path: '/',
    icon: <Icon as={MdHome} width="20px" height="20px" color="inherit" />,
    collapse: false,
  },
  {
    name: 'Concept Library',
    path: '/concepts',
    icon: <Icon as={MdMenuBook} width="20px" height="20px" color="inherit" />,
    collapse: false,
  },
  {
    name: 'Export',
    path: '/export',
    icon: (
      <Icon as={MdFileDownload} width="20px" height="20px" color="inherit" />
    ),
    collapse: false,
  },
  {
    name: 'How You Think',
    path: '/profile',
    icon: <Icon as={MdPsychology} width="20px" height="20px" color="inherit" />,
    collapse: false,
  },
  // invisible routes used only for navbar breadcrumbs
  {
    name: 'Session',
    path: '/session',
    icon: <Icon as={MdChat} width="20px" height="20px" color="inherit" />,
    invisible: true,
    collapse: false,
  },
  {
    name: 'New Goal',
    path: '/goal',
    icon: <Icon as={MdAutoAwesome} width="20px" height="20px" color="inherit" />,
    invisible: true,
    collapse: false,
  },
  // --- Disabled future routes (not yet visible in sidebar) ---
  {
    name: 'Profile Settings',
    disabled: true,
    path: '/settings',
    icon: (
      <Icon
        as={MdOutlineManageAccounts}
        width="20px"
        height="20px"
        color="inherit"
      />
    ),
    invisible: true,
    collapse: false,
  },
  {
    name: 'History',
    disabled: true,
    path: '/history',
    icon: <Icon as={LuHistory} width="20px" height="20px" color="inherit" />,
    invisible: true,
    collapse: false,
  },
  {
    name: 'Usage',
    disabled: true,
    path: '/usage',
    icon: (
      <Icon as={RoundedChart} width="20px" height="20px" color="inherit" />
    ),
    invisible: true,
    collapse: false,
  },
];

export default routes;
