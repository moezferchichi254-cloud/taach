import { useTranslation } from 'react-i18next';
import { Stub } from '../../components/Stub';

export default function Screen() {
  const { t } = useTranslation();
  return <Stub id="S14" title={t('tabs.inbox')} />;
}
