
import { useState } from 'react';
import PricingSection from '@/components/ui/pricing';
import { AddNumberModal } from './Numbers.jsx';
import { useApp } from '../../AppContext.jsx';

// Wraps the marketing pricing display and gives its plan buttons ("Choose
// Starter/Growth/Scale", "Talk to Sales" falls back to a mailto: link) a
// real action: opening the same plan/number provisioning modal the
// "+ Add plan / number" header button opens, prefilled toward the chosen
// plan's tier. This wrapper is shared by both the admin and customer
// surfaces, so it's the one place that can own this state without
// threading a prop through each surface's generic tab-renderer.
export default function Pricing() {
  const { currentUser } = useApp();
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <PricingSection onSelectPlan={() => setShowModal(true)} />
      {showModal && (
        <AddNumberModal
          currentUser={currentUser}
          onClose={() => setShowModal(false)}
          onAdded={() => setShowModal(false)}
        />
      )}
    </>
  );
}
