import { useTranslation } from 'react-i18next';
import { Stub } from '../../components/Stub';

export default function Screen() {
  const { t } = useTranslation();
  return <Stub id="S03" title={t('tabs.search')} />;
}
