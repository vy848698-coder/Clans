/*
 * ClansMachina — main site script.
 *
 * NOTE: This commit (fb91680) only MODIFIED the contact-form submit handler
 * inside an already-existing script.js (the file had ~600 lines before this
 * commit). The original surrounding code was not part of the commit, so only
 * the handler introduced/changed by the commit is reproduced here. Drop your
 * existing script.js in place to restore the full site behaviour.
 */

(function () {
  const contactForm = document.getElementById('contactForm');
  const submitBtn = contactForm ? contactForm.querySelector('button[type="submit"]') : null;
  const formSuccess = document.getElementById('formSuccess');
  const formErrors = document.getElementById('formErrors');
  const contactFields = {
    name:  document.getElementById('cName'),
    phone: document.getElementById('cPhone'),
    email: document.getElementById('cEmail'),
    city:  document.getElementById('cCity'),
    bill:  document.getElementById('cBill'),
  };

  if (!contactForm || !submitBtn) return;

  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    const restoreBtn = () => {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Book Free Consultation';
    };

    const payload = {
      name: contactFields.name.value.trim(),
      phone: contactFields.phone.value.trim(),
      email: contactFields.email.value.trim(),
      city: contactFields.city.value.trim(),
      service: (document.getElementById('cService') || {}).value || '',
      bill: contactFields.bill.value,
      message: (document.getElementById('cMsg') || {}).value || ''
    };

    fetch('submit-contact.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          if (formSuccess) formSuccess.style.display = 'flex';
          contactForm.reset();
        } else if (formErrors) {
          formErrors.innerHTML = '<ul><li>' + (data.message || 'Submission failed.') + '</li></ul>';
          formErrors.style.display = 'block';
        }
      })
      .catch(() => {
        if (formErrors) {
          formErrors.innerHTML = '<ul><li>Network error. Please try again.</li></ul>';
          formErrors.style.display = 'block';
        }
      })
      .finally(restoreBtn);
  });
})();
